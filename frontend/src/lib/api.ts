import { clearSession, getAccessToken } from './auth';

export type Health = {
  status: string;
  qdrant: string;
  lyzr_configured: boolean;
  omi_configured: boolean;
  auth_configured: boolean;
  action_extractor_configured: boolean;
};

export type Memory = {
  id: string;
  session_id: string;
  speaker: string;
  text: string;
  created_at: number;
  source: string;
};

export type Meeting = {
  session_id: string;
  title: string;
  updated_at: number;
  segment_count: number;
  preview: string;
};

export type ActionItem = {
  id: string;
  text: string;
  owner?: string | null;
  due_date?: string | null;
  completed?: boolean;
  created_at: number;
  session_id: string;
  title?: string;
};

export type AskResult = {
  answer: string;
  context: Memory[];
  provider: string;
};

export type IngestResult = { status: string; session_id: string; stored: number };
export type MeetingAnalysis = { summary: string; decisions: string[]; action_items: Array<{ description: string; owner: string | null; due_date: string | null; priority: string | null; quote: string | null }> };

const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    if (response.status === 401) {
      clearSession();
      window.dispatchEvent(new Event('omimind:auth-expired'));
    }
    throw new Error(body?.detail ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  health: () => request<Health>('/health'),
  me: () => request<{ uid: string }>('/api/me'),
  meetings: () => request<Meeting[]>('/api/meetings'),
  memories: () => request<Memory[]>('/api/memories'),
  actions: () => request<ActionItem[]>('/api/actions'),
  ingest: (title: string, transcript: string) =>
    request<IngestResult>('/api/ingest', { method: 'POST', body: JSON.stringify({ title, transcript }) }),
  analyze: (session_id: string) =>
    request<MeetingAnalysis>('/api/analyze', { method: 'POST', body: JSON.stringify({ session_id }) }),
  ask: (question: string) =>
    request<AskResult>('/api/ask', { method: 'POST', body: JSON.stringify({ question }) }),
};

export function shortDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
