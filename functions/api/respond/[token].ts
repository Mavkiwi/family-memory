import type { Env } from '../_shared';
import {
  jsonResponse, errorResponse, validationError, notFoundError,
  handleError, corsPreflightResponse, auditLog, getClientIp,
} from '../_shared';
import { validateAssignmentToken } from '../_token';
import { textResponseSchema } from '../_schemas';

interface AssignmentRow {
  id: number;
  recipient_id: number;
  question_id: number;
  status: string;
  token_expires_at: string;
  recipient_name: string;
  question_text: string;
  question_theme: string;
  question_follow_up: string | null;
}

/**
 * GET /api/respond/:token — Validate token, return question + recipient name
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const token = params.token as string;
    const validation = await validateAssignmentToken(token, env.TOKEN_SECRET);

    if (!validation.valid) {
      const status = validation.error === 'TOKEN_EXPIRED' ? 410 : 400;
      return errorResponse(request, validation.error || 'Invalid token', 'TOKEN_ERROR', status);
    }

    const assignment = await env.DB.prepare(`
      SELECT a.id, a.recipient_id, a.question_id, a.status, a.token_expires_at,
             r.name as recipient_name,
             q.text as question_text, q.theme as question_theme, q.follow_up as question_follow_up
      FROM assignments a
      JOIN recipients r ON r.id = a.recipient_id
      JOIN questions q ON q.id = a.question_id
      WHERE a.id = ? AND a.recipient_id = ?
    `).bind(validation.assignmentId, validation.recipientId).first<AssignmentRow>();

    if (!assignment) {
      return notFoundError(request, 'Assignment not found');
    }

    if (assignment.status === 'completed') {
      return errorResponse(request, 'Already completed', 'ALREADY_COMPLETED', 409);
    }

    if (assignment.status === 'skipped') {
      return errorResponse(request, 'Question was skipped', 'SKIPPED', 410);
    }

    // Mark as opened if still pending/sent
    if (assignment.status === 'pending' || assignment.status === 'sent') {
      await env.DB.prepare(
        "UPDATE assignments SET status = 'opened', opened_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
      ).bind(assignment.id).run();
      await auditLog(env.DB, 'assignment.opened', 'assignment', assignment.id, null, getClientIp(request));
    }

    // Check for existing responses
    const responses = await env.DB.prepare(
      'SELECT id, type, created_at FROM responses WHERE assignment_id = ? ORDER BY created_at'
    ).bind(assignment.id).all();

    return jsonResponse(request, {
      assignment_id: assignment.id,
      recipient_name: assignment.recipient_name,
      question: {
        text: assignment.question_text,
        theme: assignment.question_theme,
        follow_up: assignment.question_follow_up,
      },
      status: assignment.status === 'pending' || assignment.status === 'sent' ? 'opened' : assignment.status,
      responses: responses.results || [],
    }, 200, 'GET, POST, OPTIONS');
  } catch (error) {
    return handleError(request, error, 'GET, POST, OPTIONS');
  }
};

/**
 * POST /api/respond/:token — Submit a text response
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const token = params.token as string;
    const validation = await validateAssignmentToken(token, env.TOKEN_SECRET);

    if (!validation.valid) {
      return errorResponse(request, validation.error || 'Invalid token', 'TOKEN_ERROR', 400, 'GET, POST, OPTIONS');
    }

    const body = await request.json();
    const parsed = textResponseSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(request, parsed.error.issues[0].message, 'GET, POST, OPTIONS');
    }

    // Verify assignment exists and isn't completed
    const assignment = await env.DB.prepare(
      'SELECT id, status FROM assignments WHERE id = ? AND recipient_id = ?'
    ).bind(validation.assignmentId, validation.recipientId).first<{ id: number; status: string }>();

    if (!assignment) {
      return notFoundError(request, 'Assignment not found');
    }

    if (assignment.status === 'completed' || assignment.status === 'skipped') {
      return errorResponse(request, 'Assignment is closed', 'CLOSED', 409, 'GET, POST, OPTIONS');
    }

    // Insert text response
    const result = await env.DB.prepare(`
      INSERT INTO responses (assignment_id, type, text_content, transcription_status)
      VALUES (?, 'text', ?, 'none')
    `).bind(assignment.id, parsed.data.text).run();

    // Mark assignment completed
    await env.DB.prepare(
      "UPDATE assignments SET status = 'completed', completed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
    ).bind(assignment.id).run();

    await auditLog(env.DB, 'response.text', 'response', result.meta.last_row_id as number, null, getClientIp(request));

    return jsonResponse(request, { response_id: result.meta.last_row_id }, 201, 'GET, POST, OPTIONS');
  } catch (error) {
    return handleError(request, error, 'GET, POST, OPTIONS');
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return corsPreflightResponse(request, 'GET, POST, OPTIONS');
};
