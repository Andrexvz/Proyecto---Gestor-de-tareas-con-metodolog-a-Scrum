import { apiFetch, getStoredToken } from './api';
import type {
  AiConversation,
  AiMemoryPreferences,
  AiMode,
  AiStatus,
  ParsedAiDocument,
  ProactiveAlert,
} from '../types/ai';

export function getAiStatus(): Promise<AiStatus> {
  return apiFetch<AiStatus>('/api/v1/ai/status');
}

export function listAiConversations(projectId?: number | null, q?: string): Promise<{ conversations: AiConversation[] }> {
  const params = new URLSearchParams();
  if (projectId) params.set('projectId', String(projectId));
  if (q && q.trim()) params.set('q', q.trim());
  const qs = params.toString();
  return apiFetch(`/api/v1/ai/conversations${qs ? `?${qs}` : ''}`);
}

export function createAiConversation(projectId?: number | null, title?: string, temporary = false): Promise<{ conversation: AiConversation }> {
  return apiFetch('/api/v1/ai/conversations', {
    method: 'POST',
    body: JSON.stringify({ projectId: projectId ?? null, title, temporary }),
  });
}

export function renameAiConversation(id: string, title: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/v1/ai/conversations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
}

export function deleteAiConversation(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/v1/ai/conversations/${id}`, {
    method: 'DELETE',
  });
}

export function sendAiFeedback(conversationId: string, messageId: string, feedback: 'up' | 'down'): Promise<{ ok: boolean }> {
  return apiFetch(`/api/v1/ai/conversations/${conversationId}/feedback`, {
    method: 'POST',
    body: JSON.stringify({ messageId, feedback }),
  });
}

export function updateAiMemory(prefs: AiMemoryPreferences): Promise<{ memory: AiMemoryPreferences }> {
  return apiFetch('/api/v1/ai/memory', {
    method: 'PUT',
    body: JSON.stringify(prefs),
  });
}

export function clearAiMemory(): Promise<{ ok: boolean }> {
  return apiFetch('/api/v1/ai/memory', { method: 'DELETE' });
}

export function fetchProactiveAlerts(projectId?: number | null): Promise<{ enabled: boolean; alerts: ProactiveAlert[] }> {
  const qs = projectId ? `?projectId=${projectId}` : '';
  return apiFetch(`/api/v1/ai/proactive${qs}`);
}

export function confirmAiAction(confirmationId: string): Promise<{ ok: boolean; toolName: string; result: any }> {
  return apiFetch('/api/v1/ai/actions/confirm', {
    method: 'POST',
    body: JSON.stringify({ confirmationId }),
  });
}

export function cancelAiAction(confirmationId: string): Promise<{ ok: boolean }> {
  return apiFetch('/api/v1/ai/actions/cancel', {
    method: 'POST',
    body: JSON.stringify({ confirmationId }),
  });
}

export function assistAiModule(
  moduleType: 'backlog' | 'sprint' | 'kanban' | 'report',
  projectId: number,
  goal = ''
): Promise<{ analysis: string; deterministicMetrics: string; provider: string; model: string }> {
  return apiFetch(`/api/v1/ai/assist/${moduleType}`, {
    method: 'POST',
    body: JSON.stringify({ projectId, goal }),
  });
}

export function assistAiTasks(
  projectId: number,
  storyId: number | null,
  contextText: string
): Promise<{ result: any; provider: string; model: string }> {
  return apiFetch('/api/v1/ai/assist/tasks', {
    method: 'POST',
    body: JSON.stringify({ projectId, storyId, contextText }),
  });
}

export async function uploadAiDocument(file: File): Promise<{ document: ParsedAiDocument }> {
  const token = getStoredToken();
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/v1/ai/documents/parse', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'No se pudo procesar el documento.');
  }
  return data;
}

export async function streamAiChat(
  params: {
    conversationId?: string | null;
    projectId?: number | null;
    currentScreen?: string;
    mode: AiMode;
    prompt: string;
    attachmentContext?: string;
    temporary?: boolean;
  },
  callbacks: {
    onStatus?: (status: { phase: 'context' | 'generating' | 'completed'; message?: string; model?: string }) => void;
    onMeta?: (meta: { conversationId: string; mode: string; provider: string; model: string }) => void;
    onDelta: (delta: string) => void;
    onDone: (payload: { conversationId: string; message: any; metrics?: { ttftMs?: number; totalMs?: number } }) => void;
    onError: (err: { message: string; code?: string }) => void;
  },
  signal?: AbortSignal,
  timeoutMs = 160_000
): Promise<void> {
  const token = getStoredToken();
  const internalController = new AbortController();
  let timedOut = false;

  const onExternalAbort = () => internalController.abort();
  if (signal) {
    if (signal.aborted) {
      internalController.abort();
    } else {
      signal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  const timer = setTimeout(() => {
    timedOut = true;
    internalController.abort();
  }, timeoutMs);

  let terminalEventSent = false;
  const processLine = (rawLine: string): boolean => {
    const line = rawLine.trim();
    if (!line.startsWith('data:')) return false;
    const jsonStr = line.slice(5).trim();
    if (!jsonStr || jsonStr === '[DONE]') return false;
    try {
      const evt = JSON.parse(jsonStr);
      if (evt.type === 'status') callbacks.onStatus?.(evt);
      else if (evt.type === 'meta') callbacks.onMeta?.(evt);
      else if (evt.type === 'delta' && evt.delta) callbacks.onDelta(evt.delta);
      else if (evt.type === 'done') {
        terminalEventSent = true;
        callbacks.onDone(evt);
        return true;
      } else if (evt.type === 'error') {
        terminalEventSent = true;
        callbacks.onError(evt);
        return true;
      }
    } catch {
      // Ignore partial SSE JSON frames
    }
    return false;
  };

  try {
    const res = await fetch('/api/v1/ai/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(params),
      signal: internalController.signal,
    });

    if (!res.ok || !res.body) {
      const errData = await res.json().catch(() => ({}));
      terminalEventSent = true;
      callbacks.onError({
        message: errData?.error || `Error HTTP ${res.status} al conectar con Agile Velocity AI.`,
        code: errData?.code,
      });
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const rawLine of lines) {
          if (processLine(rawLine)) {
            reader.cancel().catch(() => {});
            return;
          }
        }
      }
      if (buffer.trim()) {
        processLine(buffer);
      }
      if (!terminalEventSent) {
        callbacks.onError({
          message: 'La conexión de streaming finalizó antes de completar la respuesta.',
          code: 'AI_STREAM_INCOMPLETE',
        });
      }
    } finally {
      reader.cancel().catch(() => {});
    }
  } catch (err: any) {
    if (timedOut) {
      callbacks.onError({
        message: 'La solicitud excedió el tiempo máximo de espera.',
        code: 'AI_CLIENT_TIMEOUT',
      });
      return;
    }
    throw err;
  } finally {
    clearTimeout(timer);
    if (signal) {
      signal.removeEventListener('abort', onExternalAbort);
    }
  }
}
