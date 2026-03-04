import type { Env } from './_shared';
import { jsonResponse, handleError, corsPreflightResponse } from './_shared';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const result = await env.DB.prepare('SELECT COUNT(*) as count FROM questions').first<{ count: number }>();
    return jsonResponse(request, {
      status: 'ok',
      timestamp: new Date().toISOString(),
      questions: result?.count ?? 0,
    });
  } catch (error) {
    return handleError(request, error);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return corsPreflightResponse(request);
};
