import type { Env } from '../_shared';
import { jsonResponse, handleError, corsPreflightResponse } from '../_shared';

/**
 * GET /api/admin/dashboard — Stats overview
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const [recipients, questions, assignments, responses, recent] = await Promise.all([
      env.DB.prepare('SELECT COUNT(*) as count FROM recipients WHERE active = 1').first<{ count: number }>(),
      env.DB.prepare('SELECT COUNT(*) as count FROM questions WHERE active = 1').first<{ count: number }>(),
      env.DB.prepare(`
        SELECT status, COUNT(*) as count FROM assignments GROUP BY status
      `).all<{ status: string; count: number }>(),
      env.DB.prepare('SELECT COUNT(*) as count FROM responses').first<{ count: number }>(),
      env.DB.prepare(`
        SELECT r.id, r.type, r.created_at, a.id as assignment_id,
               rec.name as recipient_name, q.text as question_text, q.theme
        FROM responses r
        JOIN assignments a ON a.id = r.assignment_id
        JOIN recipients rec ON rec.id = a.recipient_id
        JOIN questions q ON q.id = a.question_id
        ORDER BY r.created_at DESC LIMIT 10
      `).all(),
    ]);

    const assignmentsByStatus: Record<string, number> = {};
    for (const row of (assignments.results || [])) {
      assignmentsByStatus[row.status] = row.count;
    }

    return jsonResponse(request, {
      recipients: recipients?.count ?? 0,
      questions: questions?.count ?? 0,
      assignments: assignmentsByStatus,
      responses: responses?.count ?? 0,
      recent_responses: recent.results || [],
    });
  } catch (error) {
    return handleError(request, error);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return corsPreflightResponse(request);
};
