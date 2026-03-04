import type { Env } from '../../_shared';
import { jsonResponse, notFoundError, validationError, handleError, corsPreflightResponse } from '../../_shared';
import { updateRecipientSchema } from '../../_schemas';

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const id = Number(params.id);
    const row = await env.DB.prepare('SELECT * FROM recipients WHERE id = ?').bind(id).first();
    if (!row) return notFoundError(request, 'Recipient not found');
    return jsonResponse(request, row, 200, 'GET, PUT, DELETE, OPTIONS');
  } catch (error) {
    return handleError(request, error, 'GET, PUT, DELETE, OPTIONS');
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const id = Number(params.id);
    const body = await request.json();
    const parsed = updateRecipientSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(request, parsed.error.issues[0].message, 'GET, PUT, DELETE, OPTIONS');
    }

    const fields = parsed.data;
    const sets: string[] = [];
    const values: unknown[] = [];

    if (fields.name !== undefined) { sets.push('name = ?'); values.push(fields.name); }
    if (fields.email !== undefined) { sets.push('email = ?'); values.push(fields.email); }
    if (fields.phone !== undefined) { sets.push('phone = ?'); values.push(fields.phone); }
    if (fields.relationship !== undefined) { sets.push('relationship = ?'); values.push(fields.relationship); }
    if (fields.generation !== undefined) { sets.push('generation = ?'); values.push(fields.generation); }
    if (fields.notes !== undefined) { sets.push('notes = ?'); values.push(fields.notes); }
    if (fields.active !== undefined) { sets.push('active = ?'); values.push(fields.active); }

    if (sets.length === 0) {
      return validationError(request, 'No fields to update', 'GET, PUT, DELETE, OPTIONS');
    }

    sets.push("updated_at = datetime('now')");
    values.push(id);

    await env.DB.prepare(`UPDATE recipients SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();

    const updated = await env.DB.prepare('SELECT * FROM recipients WHERE id = ?').bind(id).first();
    return jsonResponse(request, updated, 200, 'GET, PUT, DELETE, OPTIONS');
  } catch (error) {
    return handleError(request, error, 'GET, PUT, DELETE, OPTIONS');
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const id = Number(params.id);
    await env.DB.prepare('DELETE FROM recipients WHERE id = ?').bind(id).run();
    return jsonResponse(request, { deleted: true }, 200, 'GET, PUT, DELETE, OPTIONS');
  } catch (error) {
    return handleError(request, error, 'GET, PUT, DELETE, OPTIONS');
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return corsPreflightResponse(request, 'GET, PUT, DELETE, OPTIONS');
};
