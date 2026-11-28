export type AiMode = 'AUTO' | 'FAST' | 'DEEP' | 'AGENT' | 'TUTOR' | 'DOCUMENTS';

export interface AiProposedAction {
  confirmationId: string;
  toolName: string;
  summary: string;
  payload: Record<string, any>;
  status: 'PENDING' | 'EXECUTED' | 'CANCELLED';
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  modeUsed?: string;
  provider?: string;
  model?: string;
  feedback?: 'up' | 'down' | null;
  proposedActions?: AiProposedAction[] | null;
  createdAt?: string;
}

export interface AiConversation {
  id: string;
  userId: number;
  projectId: number | null;
  title: string;
  mode: AiMode;
  summary?: string | null;
  temporary: boolean;
  messages: AiChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AiMemoryPreferences {
  memoryEnabled: boolean;
  proactiveEnabled: boolean;
  preferredLanguage: string;
  responseStyle: string;
  customNotes: string;
}

export interface AiStatus {
  configured: boolean;
  provider: string;
  fastModel: string;
  deepModel: string;
  setupHint: string;
  usage: {
    usedTokensToday: number;
    dailyTokenBudget: number;
    remainingTokensToday: number;
    rpmLimit: number;
    requestsToday: number;
  };
  memory: AiMemoryPreferences;
}

export interface ProactiveAlert {
  id: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  projectId: number;
  projectCode: string;
  title: string;
  description: string;
  suggestedPrompt: string;
  route: string;
}

export interface ParsedAiDocument {
  fileName: string;
  extension: string;
  sizeBytes: number;
  charCount: number;
  truncated: boolean;
  extractedText: string;
}
