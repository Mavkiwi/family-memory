import type { Env } from '../_shared';
import { jsonResponse, validationError, handleError, corsPreflightResponse } from '../_shared';
import { createQuestionSchema } from '../_schemas';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const result = await env.DB.prepare(
      'SELECT * FROM questions ORDER BY theme, sort_order'
    ).all();
    return jsonResponse(request, result.results || [], 200, 'GET, POST, OPTIONS');
  } catch (error) {
    return handleError(request, error, 'GET, POST, OPTIONS');
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await request.json();
    const parsed = createQuestionSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(request, parsed.error.issues[0].message, 'GET, POST, OPTIONS');
    }

    const d = parsed.data;
    const result = await env.DB.prepare(`
      INSERT INTO questions (text, theme, follow_up, sort_order) VALUES (?, ?, ?, ?)
    `).bind(d.text, d.theme, d.follow_up ?? null, d.sort_order).run();

    return jsonResponse(request, { id: result.meta.last_row_id }, 201, 'GET, POST, OPTIONS');
  } catch (error) {
    return handleError(request, error, 'GET, POST, OPTIONS');
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return corsPreflightResponse(request, 'GET, POST, OPTIONS');
};
