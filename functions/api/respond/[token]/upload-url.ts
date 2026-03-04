import type { Env } from '../../_shared';
import {
  jsonResponse, errorResponse, validationError, notFoundError,
  handleError, corsPreflightResponse,
} from '../../_shared';
import { validateAssignmentToken } from '../../_token';
import { uploadUrlSchema } from '../../_schemas';

/**
 * POST /api/respond/:token/upload-url — Get a presigned-style upload path
 * Since Cloudflare R2 doesn't support presigned URLs in Workers directly,
 * we return an upload endpoint that the client POSTs the file to.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const token = params.token as string;
    const validation = await validateAssignmentToken(token, env.TOKEN_SECRET);

    if (!validation.valid) {
      return errorResponse(request, validation.error || 'Invalid token', 'TOKEN_ERROR', 400, 'POST, OPTIONS');
    }

    const body = await request.json();
    const parsed = uploadUrlSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(request, parsed.error.issues[0].message, 'POST, OPTIONS');
    }

    // Verify assignment
    const assignment = await env.DB.prepare(
      'SELECT id, status FROM assignments WHERE id = ? AND recipient_id = ?'
    ).bind(validation.assignmentId, validation.recipientId).first<{ id: number; status: string }>();

    if (!assignment) {
      return notFoundError(request, 'Assignment not found');
    }

    if (assignment.status === 'completed' || assignment.status === 'skipped') {
      return errorResponse(request, 'Assignment is closed', 'CLOSED', 409, 'POST, OPTIONS');
    }

    // Determine R2 key based on content type
    const ext = parsed.data.filename.split('.').pop() || 'bin';
    const uuid = crypto.randomUUID();
    const isAudio = parsed.data.content_type.startsWith('audio/');
    const folder = isAudio ? 'audio' : 'photos';
    const r2Key = `family-memory/${folder}/${validation.recipientId}/${validation.assignmentId}/${uuid}.${ext}`;

    // Put directly to R2 (client will use the complete endpoint after uploading via this function)
    // For now, return the key — actual upload goes through complete endpoint with body
    return jsonResponse(request, {
      r2_key: r2Key,
      upload_url: `/api/respond/${token}/upload`,
      content_type: parsed.data.content_type,
      max_size: 100 * 1024 * 1024,
    }, 200, 'POST, OPTIONS');
  } catch (error) {
    return handleError(request, error, 'POST, OPTIONS');
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return corsPreflightResponse(request, 'POST, OPTIONS');
};
