import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Check,
  Copy,
  Download,
  FileText,
  History,
  Loader2,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings2,
  Sparkles,
  Square,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Volume2,
  VolumeX,
  AlertTriangle,
  X,
  Zap,
  Brain,
  Wrench,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  cancelAiAction,
  clearAiMemory,
  confirmAiAction,
  deleteAiConversation,
  fetchProactiveAlerts,
  getAiStatus,
  listAiConversations,
  renameAiConversation,
  sendAiFeedback,
  streamAiChat,
  updateAiMemory,
  uploadAiDocument,
} from '../../lib/aiApi';
import type {
  AiChatMessage,
  AiConversation,
  AiMemoryPreferences,
  AiMode,
  AiStatus,
  ParsedAiDocument,
  ProactiveAlert,
} from '../../types/ai';
import { SafeMarkdown } from './SafeMarkdown';

interface AiCopilotDrawerProps {
  open: boolean;
  onClose: () => void;
  activeProjectId: number | null;
  activeProjectCode?: string | null;
  currentScreen: string;
  initialPrompt?: string | null;
  onActionExecuted?: () => Promise<void> | void;
}

const MODE_OPTIONS: Array<{ id: AiMode; label: string; desc: string; icon: React.ReactNode }> = [
  { id: 'AUTO', label: 'Auto', desc: 'Selección inteligente según tu solicitud', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'FAST', label: 'Rápido', desc: 'Respuestas directas y de bajo consumo', icon: <Zap className="w-3.5 h-3.5" /> },
  { id: 'DEEP', label: 'Profundo', desc: 'Análisis de métricas, riesgos y planificación', icon: <Brain className="w-3.5 h-3.5" /> },
  { id: 'AGENT', label: 'Agente', desc: 'Prepara acciones reales con confirmación previa', icon: <Wrench className="w-3.5 h-3.5" /> },
  { id: 'TUTOR', label: 'Tutor', desc: 'Guía paso a paso de Scrum y la plataforma', icon: <GraduationCap className="w-3.5 h-3.5" /> },
  { id: 'DOCUMENTS', label: 'Documentos', desc: 'Analiza archivos y extrae requisitos', icon: <FileText className="w-3.5 h-3.5" /> },
];

export default function AiCopilotDrawer({
  open,
  onClose,
  activeProjectId,
  activeProjectCode,
  currentScreen,
  initialPrompt,
  onActionExecuted,
}: AiCopilotDrawerProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [fullscreen, setFullscreen] = useState(false);
  const [tab, setTab] = useState<'chat' | 'history' | 'alerts' | 'settings'>('chat');
  const [mode, setMode] = useState<AiMode>('AUTO');
  const [temporaryChat, setTemporaryChat] = useState(false);

  const [status, setStatus] = useState<AiStatus | null>(null);
  const [alerts, setAlerts] = useState<ProactiveAlert[]>([]);
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);

  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamPhase, setStreamPhase] = useState<'idle' | 'context' | 'generating' | 'completed' | 'error' | 'cancelled'>('idle');
  const [lastMetrics, setLastMetrics] = useState<{ model?: string; ttftMs?: number; totalMs?: number } | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [attachment, setAttachment] = useState<ParsedAiDocument | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [listening, setListening] = useState(false);

  const [memoryDraft, setMemoryDraft] = useState<AiMemoryPreferences>({
    memoryEnabled: true,
    proactiveEnabled: true,
    preferredLanguage: 'es-CO',
    responseStyle: 'equilibrado',
    customNotes: '',
  });

  const abortRef = useRef<AbortController | null>(null);
  const sendingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  const roleSuggestions = useMemo(() => {
    const gRole = user?.globalRole || '';
    const title = (user?.title || '').toLowerCase();
    const email = (user?.email || '').toLowerCase();
    if (gRole === 'ADMIN') {
      return [
        'Analiza el estado general de mis proyectos y detecta cuáles requieren atención',
        'Explica los permisos RBAC de cada rol en Agile Velocity',
        '¿Qué tareas e impedimentos críticos existen actualmente?',
      ];
    }
    if (title.includes('product') || email.includes('po@')) {
      return [
        'Analiza el Product Backlog y recomienda prioridades e historias a refinar',
        'Genera una historia de usuario para recuperación de contraseña con criterios INVEST',
        'Sugiere cómo agrupar las historias del proyecto en Épicas',
      ];
    }
    if (title.includes('scrum') || email.includes('sm@')) {
      return [
        'Identifica tareas bloqueadas, impedimentos y cuellos de botella en el Kanban',
        'Analiza la velocidad histórica y propón la planificación del próximo Sprint',
        'Prepara la guía de Retrospectiva y el informe de Sprint Review',
      ];
    }
    return [
      '¿Qué tareas debería priorizar hoy según mi trabajo asignado?',
      'Ayúdame a descomponer una historia compleja en tareas técnicas y checklist',
      'Explícame cómo mover tareas en Kanban sin violar la regla de impedimentos',
    ];
  }, [user?.globalRole, user?.title, user?.email]);

  useEffect(() => {
    if (!open) return;
    getAiStatus()
      .then((s) => {
        setStatus(s);
        setMemoryDraft(s.memory);
      })
      .catch(() => {});
    fetchProactiveAlerts(activeProjectId)
      .then((res) => setAlerts(res.alerts || []))
      .catch(() => {});
    listAiConversations(activeProjectId)
      .then((res) => setConversations(res.conversations || []))
      .catch(() => {});
  }, [open, activeProjectId]);

  useEffect(() => {
    if (open && initialPrompt) {
      setTab('chat');
      setInput(initialPrompt);
    }
  }, [open, initialPrompt]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleNewChat = () => {
    if (streaming) {
      abortRef.current?.abort();
    }
    setActiveConvId(null);
    setMessages([]);
    setStreamingText('');
    setStreamPhase('idle');
    setLastMetrics(null);
    setAttachment(null);
    setTab('chat');
  };

  const handleSelectConversation = (conv: AiConversation) => {
    setActiveConvId(conv.id);
    setMessages(conv.messages || []);
    setMode(conv.mode || 'AUTO');
    setTemporaryChat(conv.temporary);
    setTab('chat');
  };

  const handleSend = async (customPrompt?: string) => {
    const text = (customPrompt ?? input).trim();
    if (!text || streaming || sendingRef.current) return;
    sendingRef.current = true;

    const userMsg: AiChatMessage = {
      id: `local_u_${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInput('');
    setStreaming(true);
    setStreamPhase('context');
    setLastMetrics(null);
    setStreamingText('');
    setTab('chat');

    const controller = new AbortController();
    abortRef.current = controller;

    let acc = '';
    let activeModel: string | undefined;
    try {
      await streamAiChat(
        {
          conversationId: activeConvId,
          projectId: activeProjectId,
          currentScreen,
          mode,
          prompt: text,
          attachmentContext: attachment
            ? `Archivo: ${attachment.fileName}\n${attachment.extractedText}`
            : undefined,
          temporary: temporaryChat,
        },
        {
          onStatus: (st) => {
            if (st.model) activeModel = st.model;
            if (st.phase === 'context') setStreamPhase('context');
            else if (st.phase === 'generating') setStreamPhase('generating');
          },
          onMeta: (meta) => {
            if (meta.model) activeModel = meta.model;
            if (meta.conversationId && !temporaryChat) {
              setActiveConvId(meta.conversationId);
            }
          },
          onDelta: (delta) => {
            setStreamPhase('generating');
            acc += delta;
            setStreamingText(acc);
          },
          onDone: (payload) => {
            setStreaming(false);
            setStreamPhase('completed');
            setStreamingText('');
            sendingRef.current = false;
            setLastMetrics({
              model: payload.message?.model || activeModel,
              ttftMs: payload.metrics?.ttftMs,
              totalMs: payload.metrics?.totalMs,
            });
            setMessages((prev) => [...prev, payload.message]);
            if (!temporaryChat) {
              listAiConversations(activeProjectId, historySearch)
                .then((res) => setConversations(res.conversations || []))
                .catch(() => {});
            }
            getAiStatus().then(setStatus).catch(() => {});
          },
          onError: (err) => {
            setStreaming(false);
            setStreamPhase('error');
            setStreamingText('');
            sendingRef.current = false;
            setMessages((prev) => [
              ...prev,
              {
                id: `err_${Date.now()}`,
                role: 'assistant',
                content: `⚠️ **No se pudo completar la solicitud:** ${err.message}`,
              },
            ]);
          },
        },
        controller.signal
      );
    } catch (err: any) {
      setStreaming(false);
      setStreamingText('');
      sendingRef.current = false;
      if (err?.name === 'AbortError') {
        setStreamPhase('cancelled');
        setMessages((prev) => [
          ...prev,
          {
            id: `cancel_${Date.now()}`,
            role: 'assistant',
            content: acc ? `${acc}\n\n*(Respuesta cancelada por el usuario)*` : '*(Solicitud cancelada)*',
          },
        ]);
      } else {
        setStreamPhase('error');
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            role: 'assistant',
            content: `⚠️ **No se pudo completar la solicitud:** ${err?.message || 'Error de conexión.'}`,
          },
        ]);
      }
    } finally {
      setStreaming(false);
      setStreamingText('');
      abortRef.current = null;
      sendingRef.current = false;
    }
  };

  const handleCancelStream = () => {
    abortRef.current?.abort();
  };

  const handleRegenerate = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUser) {
      handleSend(lastUser.content);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    try {
      const res = await uploadAiDocument(file);
      setAttachment(res.document);
      setMode('DOCUMENTS');
      showToast(`Documento "${res.document.fileName}" cargado de forma segura.`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Error al procesar el archivo.', 'error');
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmAction = async (msgId: string, confirmationId: string) => {
    try {
      const res = await confirmAiAction(confirmationId);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.proposedActions
            ? {
                ...m,
                proposedActions: m.proposedActions.map((a) =>
                  a.confirmationId === confirmationId ? { ...a, status: 'EXECUTED' } : a
                ),
              }
            : m
        )
      );
      showToast(`Acción "${res.toolName}" ejecutada y auditada correctamente.`, 'success');
      await onActionExecuted?.();
    } catch (err: any) {
      showToast(err?.message || 'No se pudo ejecutar la acción.', 'error');
    }
  };

  const handleCancelAction = async (msgId: string, confirmationId: string) => {
    await cancelAiAction(confirmationId).catch(() => {});
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.proposedActions
          ? {
              ...m,
              proposedActions: m.proposedActions.map((a) =>
                a.confirmationId === confirmationId ? { ...a, status: 'CANCELLED' } : a
              ),
            }
          : m
      )
    );
  };

  const handleToggleVoiceInput = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      showToast('El dictado por voz no está disponible en este navegador. Puedes escribir normalmente.', 'warning');
      return;
    }
    const rec = new SpeechRec();
    rec.lang = memoryDraft.preferredLanguage || 'es-CO';
    rec.interimResults = false;
    rec.onresult = (evt: any) => {
      const transcript = evt.results?.[0]?.[0]?.transcript || '';
      if (transcript) setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setListening(false);
    };
    rec.onerror = () => {
      setListening(false);
      showToast('No se pudo acceder al micrófono o fue bloqueado por el navegador.', 'warning');
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  const handleSpeak = (msg: AiChatMessage) => {
    if (!('speechSynthesis' in window)) {
      showToast('La síntesis de voz no es compatible en este navegador.', 'warning');
      return;
    }
    if (speakingId === msg.id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(msg.content.replace(/[#*`]/g, ''));
    utter.lang = memoryDraft.preferredLanguage || 'es-CO';
    utter.onend = () => setSpeakingId(null);
    setSpeakingId(msg.id);
    window.speechSynthesis.speak(utter);
  };

  const handleExportMarkdown = () => {
    if (messages.length === 0) return;
    const md = messages
      .map((m) => `### ${m.role === 'user' ? 'Usuario' : 'Agile Velocity AI'}\n\n${m.content}\n`)
      .join('\n---\n\n');
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agile-velocity-ai-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-[2px]"
      role="dialog"
      aria-label="Agile Velocity AI Copiloto"
    >
      <div
        className={`flex flex-col bg-carbon border-l border-graphite shadow-2xl transition-all duration-200 ${
          fullscreen ? 'w-full' : 'w-full sm:w-[500px] lg:w-[560px]'
        } h-full`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 bg-void border-b border-graphite shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-iris-violet to-signal-teal flex items-center justify-center shadow-lg">
              <Bot className="w-4 h-4 text-paper" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-[14px] font-semibold text-paper truncate">Agile Velocity AI</h2>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    status?.configured
                      ? 'bg-pulse-green/15 text-pulse-green border border-pulse-green/30'
                      : 'bg-acid-lime/15 text-acid-lime border border-acid-lime/30'
                  }`}
                >
                  {status?.configured ? status.provider.toUpperCase() : 'SIN API KEY'}
                </span>
              </div>
              <p className="text-[11px] text-fog truncate">
                {activeProjectCode ? `Contexto: ${activeProjectCode}` : 'Contexto global autorizado'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleNewChat}
              title="Nueva conversación"
              aria-label="Nueva conversación"
              className="p-1.5 rounded-lg text-fog hover:text-paper hover:bg-graphite transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleExportMarkdown}
              title="Exportar conversación Markdown"
              aria-label="Exportar conversación"
              className="p-1.5 rounded-lg text-fog hover:text-paper hover:bg-graphite transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setFullscreen((v) => !v)}
              title={fullscreen ? 'Vista lateral' : 'Pantalla completa'}
              aria-label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              className="p-1.5 rounded-lg text-fog hover:text-paper hover:bg-graphite transition-colors"
            >
              {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Cerrar asistente"
              aria-label="Cerrar asistente"
              className="p-1.5 rounded-lg text-fog hover:text-coral-red hover:bg-graphite transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-3 py-2 bg-obsidian border-b border-graphite text-[12px] shrink-0">
          {[
            { id: 'chat', label: 'Copiloto', icon: <Sparkles className="w-3.5 h-3.5" /> },
            { id: 'history', label: `Historial (${conversations.length})`, icon: <History className="w-3.5 h-3.5" /> },
            { id: 'alerts', label: `Alertas (${alerts.length})`, icon: <AlertTriangle className="w-3.5 h-3.5" /> },
            { id: 'settings', label: 'Memoria y Cuota', icon: <Settings2 className="w-3.5 h-3.5" /> },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as any)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                tab === t.id
                  ? 'bg-iris-violet/20 text-paper border border-iris-violet/40'
                  : 'text-fog hover:text-mist hover:bg-graphite/50'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Unconfigured API Key Honest Notice */}
        {status && !status.configured && (
          <div className="mx-3 mt-3 p-3 rounded-lg bg-acid-lime/10 border border-acid-lime/30 text-[12px] text-mist shrink-0">
            <p className="font-semibold text-acid-lime mb-1">Proveedor de IA pendiente de configuración</p>
            <p className="text-[11px] leading-relaxed">
              {status.setupHint} Las alertas proactivas deterministas y la auditoría de métricas siguen funcionando sin costo.
            </p>
          </div>
        )}

        {/* TAB 1: CHAT */}
        {tab === 'chat' && (
          <>
            {/* Mode Selector */}
            <div className="px-3 py-2 border-b border-graphite/70 bg-void/40 flex items-center gap-1.5 overflow-x-auto shrink-0">
              {MODE_OPTIONS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  title={m.desc}
                  onClick={() => setMode(m.id)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
                    mode === m.id
                      ? 'bg-signal-teal/20 text-signal-teal border border-signal-teal/40'
                      : 'bg-obsidian text-fog border border-graphite hover:text-mist'
                  }`}
                >
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setTemporaryChat((v) => !v)}
                className={`ml-auto px-2 py-1 rounded-full text-[10px] font-mono whitespace-nowrap border ${
                  temporaryChat
                    ? 'bg-iris-violet/20 text-lavender border-iris-violet/40'
                    : 'bg-obsidian text-fog border-graphite'
                }`}
              >
                {temporaryChat ? 'Chat Temporal ON' : 'Guardado'}
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && !streamingText && (
                <div className="space-y-4 py-4">
                  <div className="p-4 rounded-xl bg-obsidian/80 border border-graphite">
                    <p className="text-[13px] font-semibold text-paper mb-1">
                      Hola{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}. Soy Agile Velocity AI.
                    </p>
                    <p className="text-[12px] text-fog leading-relaxed">
                      Tengo acceso autorizado a tu rol y proyectos actuales. Puedo analizar riesgos, priorizar tu Backlog,
                      dividir historias en tareas, revisar documentos o preparar acciones reales con tu confirmación.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-fog uppercase tracking-wider">Sugerencias para tu rol</p>
                    <div className="grid gap-2">
                      {roleSuggestions.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSend(s)}
                          className="text-left p-2.5 rounded-lg bg-obsidian border border-graphite hover:border-signal-teal/40 text-[12px] text-mist hover:text-paper transition-all"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[92%] rounded-xl px-3.5 py-2.5 ${
                      msg.role === 'user'
                        ? 'bg-iris-violet/20 border border-iris-violet/40 text-paper text-[13px]'
                        : 'bg-obsidian border border-graphite text-mist w-full'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <SafeMarkdown content={msg.content} />
                    )}

                    {/* Agent Proposed Actions Preview */}
                    {msg.proposedActions && msg.proposedActions.length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-graphite pt-2.5">
                        {msg.proposedActions.map((act) => (
                          <div key={act.confirmationId} className="p-2.5 rounded-lg bg-void border border-signal-teal/30 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-mono text-signal-teal uppercase">{act.toolName}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-graphite text-mist">{act.status}</span>
                            </div>
                            <p className="text-[12px] text-paper">{act.summary}</p>
                            {act.status === 'PENDING' && (
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleConfirmAction(msg.id, act.confirmationId)}
                                  className="px-2.5 py-1 rounded bg-pulse-green/20 border border-pulse-green/40 text-pulse-green text-[11px] font-medium hover:bg-pulse-green/30"
                                >
                                  Confirmar y ejecutar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCancelAction(msg.id, act.confirmationId)}
                                  className="px-2.5 py-1 rounded bg-graphite text-mist text-[11px] hover:text-paper"
                                >
                                  Cancelar
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Assistant message controls */}
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 mt-1 px-1 text-[11px] text-fog">
                      {msg.modeUsed && <span className="font-mono text-[10px]">{msg.modeUsed}</span>}
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(msg.content);
                          setCopiedId(msg.id);
                          setTimeout(() => setCopiedId(null), 1500);
                        }}
                        className="hover:text-paper inline-flex items-center gap-1"
                        title="Copiar respuesta"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-pulse-green" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSpeak(msg)}
                        className="hover:text-paper"
                        title="Leer respuesta en voz alta"
                      >
                        {speakingId === msg.id ? <VolumeX className="w-3 h-3 text-signal-teal" /> : <Volume2 className="w-3 h-3" />}
                      </button>
                      <button
                        type="button"
                        onClick={handleRegenerate}
                        disabled={streaming}
                        className="hover:text-paper disabled:opacity-40"
                        title="Regenerar respuesta"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                      {activeConvId && !temporaryChat && (
                        <>
                          <button
                            type="button"
                            onClick={() => sendAiFeedback(activeConvId, msg.id, 'up')}
                            className={`hover:text-pulse-green ${msg.feedback === 'up' ? 'text-pulse-green' : ''}`}
                            title="Útil"
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => sendAiFeedback(activeConvId, msg.id, 'down')}
                            className={`hover:text-coral-red ${msg.feedback === 'down' ? 'text-coral-red' : ''}`}
                            title="Mejorar"
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {streaming && (
                <div className="p-3.5 rounded-xl bg-obsidian border border-signal-teal/30 text-mist space-y-2">
                  <div className="flex items-center gap-2 text-[11px] text-signal-teal font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span>
                      {streamPhase === 'context'
                        ? 'Consultando contexto autorizado...'
                        : 'Generando respuesta...'}
                    </span>
                  </div>
                  {streamingText && <SafeMarkdown content={streamingText} />}
                </div>
              )}

              {!streaming && streamPhase === 'completed' && messages.length > 0 && (
                <div className="flex items-center gap-1.5 text-[11px] text-pulse-green px-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Respuesta completada</span>
                  {lastMetrics?.model && (
                    <span className="text-fog font-mono text-[10px]">
                      · {lastMetrics.model}
                      {typeof lastMetrics.totalMs === 'number'
                        ? ` · ${(lastMetrics.totalMs / 1000).toFixed(1)}s`
                        : ''}
                    </span>
                  )}
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Attachment preview */}
            {attachment && (
              <div className="mx-3 mb-2 px-3 py-1.5 rounded-lg bg-obsidian border border-signal-teal/40 flex items-center justify-between text-[11px]">
                <span className="truncate text-signal-teal font-mono">
                  📎 {attachment.fileName} ({attachment.charCount} chars)
                </span>
                <button type="button" onClick={() => setAttachment(null)} className="text-fog hover:text-coral-red ml-2">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Composer */}
            <div className="p-3 border-t border-graphite bg-void shrink-0">
              <div className="flex items-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt,.md,.csv,.xlsx"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingDoc || streaming}
                  title="Adjuntar documento (PDF, DOCX, TXT, MD, CSV, XLSX)"
                  aria-label="Adjuntar documento"
                  className="p-2 rounded-lg bg-obsidian border border-graphite text-fog hover:text-paper transition-colors shrink-0"
                >
                  {uploadingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleToggleVoiceInput}
                  disabled={streaming}
                  title="Dictado por voz"
                  aria-label="Dictado por voz"
                  className={`p-2 rounded-lg border transition-colors shrink-0 ${
                    listening
                      ? 'bg-coral-red/20 border-coral-red text-coral-red'
                      : 'bg-obsidian border-graphite text-fog hover:text-paper'
                  }`}
                >
                  {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <textarea
                  rows={2}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Pregunta sobre tus proyectos, historias, Kanban, métricas o adjunta un archivo..."
                  className="flex-1 resize-none rounded-lg bg-obsidian border border-graphite px-3 py-2 text-[13px] text-paper placeholder:text-fog focus:outline-none focus:border-signal-teal"
                />
                {streaming ? (
                  <button
                    type="button"
                    onClick={handleCancelStream}
                    aria-label="Cancelar respuesta"
                    className="p-2.5 rounded-lg bg-coral-red/20 border border-coral-red text-coral-red hover:bg-coral-red/30 shrink-0"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={!input.trim()}
                    aria-label="Enviar mensaje"
                    className="p-2.5 rounded-lg bg-iris-violet text-paper hover:bg-iris-violet/90 disabled:opacity-40 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* TAB 2: HISTORY */}
        {tab === 'history' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-fog absolute left-3 top-2.5" />
              <input
                value={historySearch}
                onChange={(e) => {
                  setHistorySearch(e.target.value);
                  listAiConversations(activeProjectId, e.target.value)
                    .then((r) => setConversations(r.conversations || []))
                    .catch(() => {});
                }}
                placeholder="Buscar en conversaciones..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-obsidian border border-graphite text-[12px] text-paper placeholder:text-fog"
              />
            </div>

            {conversations.length === 0 ? (
              <p className="text-[12px] text-fog text-center py-8">No hay conversaciones guardadas.</p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className="p-3 rounded-lg bg-obsidian border border-graphite hover:border-signal-teal/40 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    {renamingId === conv.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          value={renameText}
                          onChange={(e) => setRenameText(e.target.value)}
                          className="flex-1 px-2 py-1 rounded bg-void border border-signal-teal text-[12px] text-paper"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            if (renameText.trim()) {
                              await renameAiConversation(conv.id, renameText.trim());
                              setConversations((prev) =>
                                prev.map((c) => (c.id === conv.id ? { ...c, title: renameText.trim() } : c))
                              );
                            }
                            setRenamingId(null);
                          }}
                          className="text-pulse-green p-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSelectConversation(conv)}
                        className="text-left w-full"
                      >
                        <p className="text-[13px] font-medium text-paper truncate">{conv.title}</p>
                        <p className="text-[11px] text-fog">
                          {conv.messages?.length || 0} mensajes · {conv.mode}
                        </p>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingId(conv.id);
                        setRenameText(conv.title);
                      }}
                      className="p-1 text-fog hover:text-paper"
                      title="Renombrar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteAiConversation(conv.id);
                        setConversations((prev) => prev.filter((c) => c.id !== conv.id));
                        if (activeConvId === conv.id) handleNewChat();
                      }}
                      className="p-1 text-fog hover:text-coral-red"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: PROACTIVE ALERTS */}
        {tab === 'alerts' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <p className="text-[12px] text-fog">
              Recomendaciones generadas por reglas deterministas sobre tus datos reales (sin consumo de tokens).
            </p>
            {alerts.length === 0 ? (
              <p className="text-[12px] text-pulse-green py-6 text-center">No se detectaron riesgos ni bloqueos pendientes.</p>
            ) : (
              alerts.map((a) => (
                <div key={a.id} className="p-3 rounded-lg bg-obsidian border border-graphite space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-signal-teal">{a.projectCode}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        a.severity === 'HIGH'
                          ? 'bg-coral-red/20 text-coral-red'
                          : a.severity === 'MEDIUM'
                          ? 'bg-acid-lime/20 text-acid-lime'
                          : 'bg-graphite text-mist'
                      }`}
                    >
                      {a.severity}
                    </span>
                  </div>
                  <p className="text-[13px] font-medium text-paper">{a.title}</p>
                  <p className="text-[12px] text-fog">{a.description}</p>
                  <button
                    type="button"
                    disabled={streaming}
                    onClick={() => handleSend(a.suggestedPrompt)}
                    className="text-[11px] font-medium text-iris-violet hover:underline disabled:opacity-40"
                  >
                    Analizar solución con Agile Velocity AI →
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: MEMORY & QUOTA SETTINGS */}
        {tab === 'settings' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-[12px]">
            {status && (
              <div className="p-3 rounded-lg bg-obsidian border border-graphite space-y-1.5">
                <p className="font-semibold text-paper">Consumo y Límites del Día</p>
                <p className="text-fog">
                  Tokens usados hoy: <strong className="text-paper">{status.usage.usedTokensToday}</strong> / {status.usage.dailyTokenBudget}
                </p>
                <p className="text-fog">
                  Solicitudes hoy: <strong className="text-paper">{status.usage.requestsToday}</strong> (Máx. {status.usage.rpmLimit}/min)
                </p>
              </div>
            )}

            <div className="p-3 rounded-lg bg-obsidian border border-graphite space-y-3">
              <p className="font-semibold text-paper">Control de Memoria y Preferencias</p>
              <label className="flex items-center gap-2 text-mist cursor-pointer">
                <input
                  type="checkbox"
                  checked={memoryDraft.memoryEnabled}
                  onChange={(e) => setMemoryDraft((p) => ({ ...p, memoryEnabled: e.target.checked }))}
                />
                <span>Recordar mis preferencias de respuesta</span>
              </label>
              <label className="flex items-center gap-2 text-mist cursor-pointer">
                <input
                  type="checkbox"
                  checked={memoryDraft.proactiveEnabled}
                  onChange={(e) => setMemoryDraft((p) => ({ ...p, proactiveEnabled: e.target.checked }))}
                />
                <span>Mostrar recomendaciones proactivas</span>
              </label>
              <div>
                <label className="block text-fog mb-1">Notas de preferencia (sin credenciales ni secretos)</label>
                <textarea
                  rows={3}
                  value={memoryDraft.customNotes}
                  onChange={(e) => setMemoryDraft((p) => ({ ...p, customNotes: e.target.value }))}
                  placeholder="Ej. Prefiero criterios de aceptación en formato Gherkin conciso..."
                  className="w-full rounded-lg bg-void border border-graphite p-2 text-paper"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const res = await updateAiMemory(memoryDraft);
                    setMemoryDraft(res.memory);
                    showToast('Preferencias de memoria actualizadas.', 'success');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-iris-violet text-paper font-medium"
                >
                  Guardar preferencias
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await clearAiMemory();
                    setMemoryDraft({
                      memoryEnabled: true,
                      proactiveEnabled: true,
                      preferredLanguage: 'es-CO',
                      responseStyle: 'equilibrado',
                      customNotes: '',
                    });
                    showToast('Memoria limpiada.', 'info');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-graphite text-mist hover:text-paper"
                >
                  Borrar memoria
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
