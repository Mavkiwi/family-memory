import type { Env } from '../_shared';
import { jsonResponse, validationError, handleError, corsPreflightResponse } from '../_shared';
import { createRecipientSchema } from '../_schemas';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const result = await env.DB.prepare(
      'SELECT * FROM recipients ORDER BY name'
    ).all();
    return jsonResponse(request, result.results || [], 200, 'GET, POST, OPTIONS');
  } catch (error) {
    return handleError(request, error, 'GET, POST, OPTIONS');
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await request.json();
    const parsed = createRecipientSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(request, parsed.error.issues[0].message, 'GET, POST, OPTIONS');
    }

    const d = parsed.data;
    const result = await env.DB.prepare(`
      INSERT INTO recipients (name, email, phone, relationship, generation, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(d.name, d.email ?? null, d.phone ?? null, d.relationship, d.generation, d.notes ?? null).run();

    return jsonResponse(request, { id: result.meta.last_row_id }, 201, 'GET, POST, OPTIONS');
  } catch (error) {
    return handleError(request, error, 'GET, POST, OPTIONS');
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return corsPreflightResponse(request, 'GET, POST, OPTIONS');
};
