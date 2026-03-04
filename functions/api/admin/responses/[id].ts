import type { Env } from '../../_shared';
import { jsonResponse, notFoundError, validationError, handleError, corsPreflightResponse } from '../../_shared';
import { annotateResponseSchema } from '../../_schemas';

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const id = Number(params.id);
    const row = await env.DB.prepare(`
      SELECT r.*, a.id as assignment_id,
             rec.name as recipient_name,
             q.text as question_text, q.theme
      FROM responses r
      JOIN assignments a ON a.id = r.assignment_id
      JOIN recipients rec ON rec.id = a.recipient_id
      JOIN questions q ON q.id = a.question_id
      WHERE r.id = ?
    `).bind(id).first();

    if (!row) return notFoundError(request, 'Response not found');
    return jsonResponse(request, row, 200, 'GET, PUT, OPTIONS');
  } catch (error) {
    return handleError(request, error, 'GET, PUT, OPTIONS');
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const id = Number(params.id);
    const body = await request.json();
    const parsed = annotateResponseSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(request, parsed.error.issues[0].message, 'GET, PUT, OPTIONS');
    }

    const sets: string[] = [];
    const values: unknown[] = [];

    if (parsed.data.admin_notes !== undefined) { sets.push('admin_notes = ?'); values.push(parsed.data.admin_notes); }
    if (parsed.data.flagged !== undefined) { sets.push('flagged = ?'); values.push(parsed.data.flagged); }

    if (sets.length === 0) {
      return validationError(request, 'No fields to update', 'GET, PUT, OPTIONS');
    }

    sets.push("updated_at = datetime('now')");
    values.push(id);

    await env.DB.prepare(`UPDATE responses SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();

    const updated = await env.DB.prepare('SELECT * FROM responses WHERE id = ?').bind(id).first();
    if (!updated) return notFoundError(request, 'Response not found');
    return jsonResponse(request, updated, 200, 'GET, PUT, OPTIONS');
  } catch (error) {
    return handleError(request, error, 'GET, PUT, OPTIONS');
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return corsPreflightResponse(request, 'GET, PUT, OPTIONS');
};
