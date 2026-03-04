const API_BASE = '/api';

interface ApiResponse<T> {
  data: T | null;
  meta?: { page?: number; limit?: number; total?: number };
  error?: string;
  code?: string;
}

class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('admin_token');
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!headers['Content-Type'] && !(options?.body instanceof ArrayBuffer)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json: ApiResponse<T> = await res.json();

  if (!res.ok || json.error) {
    throw new ApiError(json.error || 'Unknown error', json.code || 'UNKNOWN', res.status);
  }

  return json.data as T;
}

// --------------- Public (token-based) ---------------
export const respondApi = {
  getQuestion: (token: string) =>
    request<{
      assignment_id: number;
      recipient_name: string;
      question: { text: string; theme: string; follow_up: string | null };
      status: string;
      responses: { id: number; type: string; created_at: string }[];
    }>(`/respond/${token}`),

  submitText: (token: string, text: string) =>
    request<{ response_id: number }>(`/respond/${token}`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  getUploadUrl: (token: string, filename: string, content_type: string, size: number) =>
    request<{ r2_key: string; upload_url: string }>(`/respond/${token}/upload-url`, {
      method: 'POST',
      body: JSON.stringify({ filename, content_type, size }),
    }),

  uploadFile: (token: string, r2Key: string, file: Blob, contentType: string) =>
    fetch(`${API_BASE}/respond/${token}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'X-R2-Key': r2Key,
      },
      body: file,
    }).then(async (res) => {
      const json = await res.json();
      if (!res.ok) throw new ApiError(json.error || 'Upload failed', json.code || 'UPLOAD_ERROR', res.status);
      return json.data as { r2_key: string; size: number };
    }),

  completeUpload: (token: string, data: {
    r2_key: string;
    type: 'audio' | 'photo';
    file_size?: number;
    duration_seconds?: number;
    mime_type?: string;
  }) =>
    request<{ response_id: number; transcription_status: string }>(`/respond/${token}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  skip: (token: string) =>
    request<{ status: string }>(`/respond/${token}/skip`, { method: 'POST' }),
};

// --------------- Admin ---------------
export const adminApi = {
  verifyPin: (pin: string) =>
    request<{ token: string; admin: { id: number; name: string } }>('/auth/verify-pin', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    }),

  getDashboard: () => request<{
    recipients: number;
    questions: number;
    assignments: Record<string, number>;
    responses: number;
    recent_responses: unknown[];
  }>('/admin/dashboard'),

  getRecipients: () => request<unknown[]>('/admin/recipients'),
  createRecipient: (data: { name: string; email?: string; phone?: string; relationship?: string; generation?: string }) =>
    request<{ id: number }>('/admin/recipients', { method: 'POST', body: JSON.stringify(data) }),
  updateRecipient: (id: number, data: Record<string, unknown>) =>
    request<unknown>(`/admin/recipients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRecipient: (id: number) =>
    request<{ deleted: boolean }>(`/admin/recipients/${id}`, { method: 'DELETE' }),

  getQuestions: () => request<unknown[]>('/admin/questions'),
  createQuestion: (data: { text: string; theme: string; follow_up?: string; sort_order?: number }) =>
    request<{ id: number }>('/admin/questions', { method: 'POST', body: JSON.stringify(data) }),
  updateQuestion: (id: number, data: Record<string, unknown>) =>
    request<unknown>(`/admin/questions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteQuestion: (id: number) =>
    request<{ deleted: boolean }>(`/admin/questions/${id}`, { method: 'DELETE' }),

  getAssignments: () => request<unknown[]>('/admin/assignments'),
  createAssignment: (data: { recipient_id: number; question_id: number; expiry_days?: number }) =>
    request<{ id: number; token: string; expires_at: string; respond_url: string }>('/admin/assignments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteAssignment: (id: number) =>
    request<{ deleted: boolean }>(`/admin/assignments/${id}`, { method: 'DELETE' }),

  getResponses: () => request<unknown[]>('/admin/responses'),
  getResponse: (id: number) => request<unknown>(`/admin/responses/${id}`),
  annotateResponse: (id: number, data: { admin_notes?: string; flagged?: number }) =>
    request<unknown>(`/admin/responses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

export { ApiError };
