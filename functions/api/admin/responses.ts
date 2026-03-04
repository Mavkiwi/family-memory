import type { Env } from '../_shared';
import { jsonResponse, handleError, corsPreflightResponse } from '../_shared';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const result = await env.DB.prepare(`
      SELECT r.*, a.id as assignment_id,
             rec.name as recipient_name,
             q.text as question_text, q.theme
      FROM responses r
      JOIN assignments a ON a.id = r.assignment_id
      JOIN recipients rec ON rec.id = a.recipient_id
      JOIN questions q ON q.id = a.question_id
      ORDER BY r.created_at DESC
    `).all();
    return jsonResponse(request, result.results || []);
  } catch (error) {
    return handleError(request, error);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return corsPreflightResponse(request);
};
