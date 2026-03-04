import type { Env } from '../_shared';
import { jsonResponse, validationError, notFoundError, handleError, corsPreflightResponse, auditLog } from '../_shared';
import { createAssignmentSchema } from '../_schemas';
import { generateAssignmentToken } from '../_token';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const result = await env.DB.prepare(`
      SELECT a.*, r.name as recipient_name, q.text as question_text, q.theme
      FROM assignments a
      JOIN recipients r ON r.id = a.recipient_id
      JOIN questions q ON q.id = a.question_id
      ORDER BY a.created_at DESC
    `).all();
    return jsonResponse(request, result.results || [], 200, 'GET, POST, OPTIONS');
  } catch (error) {
    return handleError(request, error, 'GET, POST, OPTIONS');
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await request.json();
    const parsed = createAssignmentSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(request, parsed.error.issues[0].message, 'GET, POST, OPTIONS');
    }

    // Verify recipient and question exist
    const [recipient, question] = await Promise.all([
      env.DB.prepare('SELECT id FROM recipients WHERE id = ? AND active = 1').bind(parsed.data.recipient_id).first(),
      env.DB.prepare('SELECT id FROM questions WHERE id = ? AND active = 1').bind(parsed.data.question_id).first(),
    ]);

    if (!recipient) return notFoundError(request, 'Recipient not found');
    if (!question) return notFoundError(request, 'Question not found');

    // Generate token
    const tokenData = await generateAssignmentToken(
      parsed.data.recipient_id,
      0, // placeholder — we'll update after insert
      env.TOKEN_SECRET,
      parsed.data.expiry_days,
    );

    // Insert assignment
    const result = await env.DB.prepare(`
      INSERT INTO assignments (recipient_id, question_id, token, token_expires_at)
      VALUES (?, ?, ?, ?)
    `).bind(
      parsed.data.recipient_id,
      parsed.data.question_id,
      'temp',
      tokenData.expiresAt,
    ).run();

    const assignmentId = result.meta.last_row_id as number;

    // Re-generate token with actual assignment ID
    const finalToken = await generateAssignmentToken(
      parsed.data.recipient_id,
      assignmentId,
      env.TOKEN_SECRET,
      parsed.data.expiry_days,
    );

    // Update with real token
    await env.DB.prepare(
      "UPDATE assignments SET token = ?, token_expires_at = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(finalToken.token, finalToken.expiresAt, assignmentId).run();

    await auditLog(env.DB, 'assignment.created', 'assignment', assignmentId);

    return jsonResponse(request, {
      id: assignmentId,
      token: finalToken.token,
      expires_at: finalToken.expiresAt,
      respond_url: `/respond/${finalToken.token}`,
    }, 201, 'GET, POST, OPTIONS');
  } catch (error) {
    return handleError(request, error, 'GET, POST, OPTIONS');
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return corsPreflightResponse(request, 'GET, POST, OPTIONS');
};
