import type { Env } from '../../_shared';
import { jsonResponse, notFoundError, handleError, corsPreflightResponse } from '../../_shared';

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const id = Number(params.id);
    const row = await env.DB.prepare(`
      SELECT a.*, r.name as recipient_name, q.text as question_text, q.theme
      FROM assignments a
      JOIN recipients r ON r.id = a.recipient_id
      JOIN questions q ON q.id = a.question_id
      WHERE a.id = ?
    `).bind(id).first();

    if (!row) return notFoundError(request, 'Assignment not found');

    const responses = await env.DB.prepare(
      'SELECT * FROM responses WHERE assignment_id = ? ORDER BY created_at'
    ).bind(id).all();

    return jsonResponse(request, { ...row, responses: responses.results || [] }, 200, 'GET, DELETE, OPTIONS');
  } catch (error) {
    return handleError(request, error, 'GET, DELETE, OPTIONS');
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const id = Number(params.id);
    await env.DB.prepare('DELETE FROM assignments WHERE id = ?').bind(id).run();
    return jsonResponse(request, { deleted: true }, 200, 'GET, DELETE, OPTIONS');
  } catch (error) {
    return handleError(request, error, 'GET, DELETE, OPTIONS');
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return corsPreflightResponse(request, 'GET, DELETE, OPTIONS');
};
