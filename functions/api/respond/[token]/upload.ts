import type { Env } from '../../_shared';
import {
  jsonResponse, errorResponse, notFoundError,
  handleError, corsPreflightResponse, auditLog, getClientIp,
} from '../../_shared';
import { validateAssignmentToken } from '../../_token';

/**
 * POST /api/respond/:token/upload — Direct file upload to R2
 * Client sends multipart/form-data or raw binary with headers:
 *   X-R2-Key: the key from upload-url
 *   Content-Type: audio/webm, image/jpeg, etc.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const token = params.token as string;
    const validation = await validateAssignmentToken(token, env.TOKEN_SECRET);

    if (!validation.valid) {
      return errorResponse(request, validation.error || 'Invalid token', 'TOKEN_ERROR', 400, 'POST, OPTIONS');
    }

    const r2Key = request.headers.get('X-R2-Key');
    if (!r2Key) {
      return errorResponse(request, 'Missing X-R2-Key header', 'VALIDATION_ERROR', 400, 'POST, OPTIONS');
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

    // Upload to R2
    const contentType = request.headers.get('Content-Type') || 'application/octet-stream';
    const body = await request.arrayBuffer();

    await env.R2.put(r2Key, body, {
      httpMetadata: { contentType },
      customMetadata: {
        assignmentId: String(validation.assignmentId),
        recipientId: String(validation.recipientId),
      },
    });

    await auditLog(env.DB, 'file.uploaded', 'assignment', assignment.id, r2Key, getClientIp(request));

    return jsonResponse(request, {
      r2_key: r2Key,
      size: body.byteLength,
    }, 201, 'POST, OPTIONS');
  } catch (error) {
    return handleError(request, error, 'POST, OPTIONS');
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return corsPreflightResponse(request, 'POST, OPTIONS');
};
