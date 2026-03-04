import type { Env } from '../../_shared';
import {
  jsonResponse, errorResponse, notFoundError,
  handleError, corsPreflightResponse, auditLog, getClientIp,
} from '../../_shared';
import { validateAssignmentToken } from '../../_token';

/**
 * POST /api/respond/:token/skip — Skip this question
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const token = params.token as string;
    const validation = await validateAssignmentToken(token, env.TOKEN_SECRET);

    if (!validation.valid) {
      return errorResponse(request, validation.error || 'Invalid token', 'TOKEN_ERROR', 400, 'POST, OPTIONS');
    }

    const assignment = await env.DB.prepare(
      'SELECT id, status FROM assignments WHERE id = ? AND recipient_id = ?'
    ).bind(validation.assignmentId, validation.recipientId).first<{ id: number; status: string }>();

    if (!assignment) {
      return notFoundError(request, 'Assignment not found');
    }

    if (assignment.status === 'completed') {
      return errorResponse(request, 'Already completed', 'ALREADY_COMPLETED', 409, 'POST, OPTIONS');
    }

    await env.DB.prepare(
      "UPDATE assignments SET status = 'skipped', updated_at = datetime('now') WHERE id = ?"
    ).bind(assignment.id).run();

    await auditLog(env.DB, 'assignment.skipped', 'assignment', assignment.id, null, getClientIp(request));

    return jsonResponse(request, { status: 'skipped' }, 200, 'POST, OPTIONS');
  } catch (error) {
    return handleError(request, error, 'POST, OPTIONS');
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return corsPreflightResponse(request, 'POST, OPTIONS');
};
