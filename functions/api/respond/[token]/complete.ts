import type { Env } from '../../_shared';
import {
  jsonResponse, errorResponse, validationError, notFoundError,
  handleError, corsPreflightResponse, auditLog, getClientIp,
} from '../../_shared';
import { validateAssignmentToken } from '../../_token';
import { completeUploadSchema } from '../../_schemas';

/**
 * POST /api/respond/:token/complete — Mark an upload as done, create response record
 * Triggers transcription for audio via ctx.waitUntil (Phase 3).
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env, params, waitUntil }) => {
  try {
    const token = params.token as string;
    const validation = await validateAssignmentToken(token, env.TOKEN_SECRET);

    if (!validation.valid) {
      return errorResponse(request, validation.error || 'Invalid token', 'TOKEN_ERROR', 400, 'POST, OPTIONS');
    }

    const body = await request.json();
    const parsed = completeUploadSchema.safeParse(body);
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

    // Verify file exists in R2
    const r2Object = await env.R2.head(parsed.data.r2_key);
    if (!r2Object) {
      return errorResponse(request, 'File not found in storage', 'FILE_NOT_FOUND', 404, 'POST, OPTIONS');
    }

    // Create response record
    const transcriptionStatus = parsed.data.type === 'audio' ? 'pending' : 'none';
    const result = await env.DB.prepare(`
      INSERT INTO responses (assignment_id, type, r2_key, file_size, duration_seconds, mime_type, transcription_status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      assignment.id,
      parsed.data.type,
      parsed.data.r2_key,
      parsed.data.file_size ?? r2Object.size,
      parsed.data.duration_seconds ?? null,
      parsed.data.mime_type ?? r2Object.httpMetadata?.contentType ?? null,
      transcriptionStatus,
    ).run();

    // Mark assignment completed
    await env.DB.prepare(
      "UPDATE assignments SET status = 'completed', completed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
    ).bind(assignment.id).run();

    await auditLog(env.DB, `response.${parsed.data.type}`, 'response', result.meta.last_row_id as number, parsed.data.r2_key, getClientIp(request));

    // Phase 3: Trigger transcription for audio responses
    // if (parsed.data.type === 'audio') {
    //   waitUntil(triggerTranscription(env, result.meta.last_row_id as number, parsed.data.r2_key));
    // }

    return jsonResponse(request, {
      response_id: result.meta.last_row_id,
      transcription_status: transcriptionStatus,
    }, 201, 'POST, OPTIONS');
  } catch (error) {
    return handleError(request, error, 'POST, OPTIONS');
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return corsPreflightResponse(request, 'POST, OPTIONS');
};
