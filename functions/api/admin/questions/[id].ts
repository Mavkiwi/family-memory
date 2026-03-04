import type { Env } from '../../_shared';
import { jsonResponse, notFoundError, validationError, handleError, corsPreflightResponse } from '../../_shared';
import { updateQuestionSchema } from '../../_schemas';

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const id = Number(params.id);
    const body = await request.json();
    const parsed = updateQuestionSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(request, parsed.error.issues[0].message, 'PUT, DELETE, OPTIONS');
    }

    const fields = parsed.data;
    const sets: string[] = [];
    const values: unknown[] = [];

    if (fields.text !== undefined) { sets.push('text = ?'); values.push(fields.text); }
    if (fields.theme !== undefined) { sets.push('theme = ?'); values.push(fields.theme); }
    if (fields.follow_up !== undefined) { sets.push('follow_up = ?'); values.push(fields.follow_up); }
    if (fields.sort_order !== undefined) { sets.push('sort_order = ?'); values.push(fields.sort_order); }
    if (fields.active !== undefined) { sets.push('active = ?'); values.push(fields.active); }

    if (sets.length === 0) {
      return validationError(request, 'No fields to update', 'PUT, DELETE, OPTIONS');
    }

    sets.push("updated_at = datetime('now')");
    values.push(id);

    await env.DB.prepare(`UPDATE questions SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();

    const updated = await env.DB.prepare('SELECT * FROM questions WHERE id = ?').bind(id).first();
    if (!updated) return notFoundError(request, 'Question not found');
    return jsonResponse(request, updated, 200, 'PUT, DELETE, OPTIONS');
  } catch (error) {
    return handleError(request, error, 'PUT, DELETE, OPTIONS');
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const id = Number(params.id);
    await env.DB.prepare('DELETE FROM questions WHERE id = ?').bind(id).run();
    return jsonResponse(request, { deleted: true }, 200, 'PUT, DELETE, OPTIONS');
  } catch (error) {
    return handleError(request, error, 'PUT, DELETE, OPTIONS');
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return corsPreflightResponse(request, 'PUT, DELETE, OPTIONS');
};
