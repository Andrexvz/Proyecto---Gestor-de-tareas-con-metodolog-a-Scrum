import React, { useState } from 'react';
import { Loader2, Lock, Mail, KeyRound, ArrowRight, CheckCircle2, Sparkles, Kanban, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../lib/api';

const DEMO_ACCOUNTS = [
  { label: 'Administrador', email: 'admin@velocity.dev', name: 'Elena Vance', scope: 'Control total · Proyectos y equipo' },
  { label: 'Product Owner', email: 'po@velocity.dev', name: 'Mateo Ríos', scope: 'Backlog · Asistente IA' },
  { label: 'Scrum Master', email: 'sm@velocity.dev', name: 'Sofía Mendoza', scope: 'Sprints · Cierre transaccional' },
  { label: 'Developer', email: 'dev1@velocity.dev', name: 'Lucas Herrera', scope: 'Tablero Kanban · Tareas' },
];

export function LoginView() {
  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('po@velocity.dev');
  const [password, setPassword] = useState('Password123!');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Forgot password modal state (RF-16)
  const [resetMode, setResetMode] = useState<'none' | 'request' | 'confirm'>('none');
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetFeedback, setResetFeedback] = useState('');
  const [demoResetToken, setDemoResetToken] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email.trim() || !password) {
      setErrorMsg('Ingresa tu correo electrónico y contraseña.');
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Credenciales inválidas');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
    setErrorMsg('');
    setSubmitting(true);
    try {
      await login(demoEmail, 'Password123!');
    } catch (err: any) {
      setErrorMsg(err?.message || 'No se pudo iniciar sesión');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetFeedback('');
    try {
      const res = await apiFetch<{ message: string; demoToken?: string }>(
        '/api/v1/auth/forgot-password',
        {
          method: 'POST',
          body: JSON.stringify({ email: resetEmail }),
          skipAuthRedirect: true,
        }
      );
      setResetFeedback(res.message);
      if (res.demoToken) {
        setDemoResetToken(res.demoToken);
        setResetToken(res.demoToken);
      }
      setResetMode('confirm');
    } catch (err: any) {
      showToast(err?.message || 'Error al solicitar recuperación', 'error');
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      await apiFetch('/api/v1/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: resetToken, newPassword }),
        skipAuthRedirect: true,
      });
      showToast('Contraseña actualizada correctamente. Ya puedes iniciar sesión.', 'success');
      setResetMode('none');
      setResetEmail('');
      setResetToken('');
      setNewPassword('');
      setDemoResetToken('');
    } catch (err: any) {
      showToast(err?.message || 'No se pudo restablecer la contraseña', 'error');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-void text-mist grid lg:grid-cols-12">
      {/* Left Architectural Context Panel */}
      <div className="hidden lg:flex lg:col-span-7 flex-col justify-between p-12 bg-carbon border-r border-graphite">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-inputs bg-iris-violet flex items-center justify-center text-paper font-display font-bold text-base shadow-sm">
            AV
          </div>
          <span className="font-display text-lg font-semibold tracking-tight text-bone">
            Agile Velocity
          </span>
        </div>

        <div className="max-w-xl space-y-8">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-bone leading-[1.15] [text-wrap:balance]">
            Ejecución Scrum de alta velocidad con asistencia IA integrada.
          </h1>
          <p className="text-[15px] text-mist leading-relaxed">
            Centraliza tu Product Backlog, planifica Sprints sin fricción, opera tu tablero Kanban en tiempo real y redacta historias de usuario estructuradas manteniendo el control editorial en manos de tu equipo.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-4 border-t border-graphite">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-inputs bg-obsidian border border-graphite flex items-center justify-center text-signal-teal shadow-subtle">
                <Layers className="w-4 h-4" />
              </div>
              <h2 className="text-[14px] font-semibold text-bone">Backlog & Sprints</h2>
              <p className="text-[12px] text-fog leading-5">
                Priorización, estimación en Story Points y regla estricta de un único Sprint activo.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-8 h-8 rounded-inputs bg-obsidian border border-graphite flex items-center justify-center text-lavender shadow-subtle">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-[14px] font-semibold text-bone">Asistencia IA</h2>
              <p className="text-[12px] text-fog leading-5">
                Genera borradores en formato Como / Quiero / Para y criterios de aceptación editables.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-8 h-8 rounded-inputs bg-obsidian border border-graphite flex items-center justify-center text-pulse-green shadow-subtle">
                <Kanban className="w-4 h-4" />
              </div>
              <h2 className="text-[14px] font-semibold text-bone">Kanban Reactivo</h2>
              <p className="text-[12px] text-fog leading-5">
                Flujo Drag & Drop en 4 etapas canónicas con cierre automático de historias completadas.
              </p>
            </div>
          </div>
        </div>

        <p className="text-[12px] text-fog">
          Acceso protegido mediante JWT · Control de roles RBAC por proyecto
        </p>
      </div>

      {/* Right Authentication Panel */}
      <div className="lg:col-span-5 flex flex-col justify-center px-6 py-10 sm:px-12 bg-void">
        <div className="w-full max-w-md mx-auto space-y-8">
          <div className="lg:hidden flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-inputs bg-iris-violet flex items-center justify-center text-paper font-display font-bold text-sm shadow-sm">
              AV
            </div>
            <span className="font-display text-lg font-semibold text-bone">Agile Velocity</span>
          </div>

          {resetMode === 'none' ? (
            <>
              <div>
                <h2 className="font-display text-2xl font-semibold text-bone tracking-tight">
                  Iniciar sesión
                </h2>
                <p className="mt-1.5 text-[13px] text-fog">
                  Ingresa con tus credenciales o selecciona un perfil de evaluación.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-mist mb-1.5">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-fog absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nombre@empresa.com"
                      autoComplete="email"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-carbon border border-graphite rounded-inputs text-[13px] text-bone placeholder:text-ash focus:outline-none focus:border-iris-violet focus:ring-1 focus:ring-iris-violet shadow-subtle"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[12px] font-medium text-mist">Contraseña</label>
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(email);
                        setResetMode('request');
                      }}
                      className="text-[12px] text-signal-teal hover:text-paper transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-fog absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-carbon border border-graphite rounded-inputs text-[13px] text-bone placeholder:text-ash focus:outline-none focus:border-iris-violet focus:ring-1 focus:ring-iris-violet shadow-subtle"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="px-3.5 py-2.5 rounded-inputs bg-coral-red/15 border border-coral-red/30 text-[12px] text-coral-red">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 bg-iris-violet hover:bg-iris-violet/90 text-paper text-[13px] font-medium rounded-buttons transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Validando...
                    </>
                  ) : (
                    <>
                      Iniciar Sesión
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="pt-5 border-t border-graphite space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-mist">
                    Acceso rápido por rol Scrum
                  </span>
                  <span className="font-mono text-[11px] text-fog">Password123!</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      disabled={submitting}
                      onClick={() => handleQuickLogin(acc.email)}
                      className="text-left p-3 rounded-cards bg-obsidian hover:bg-graphite/40 border border-graphite hover:border-smoke transition-colors disabled:opacity-60 shadow-subtle"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-bone">{acc.label}</span>
                        <span className="text-[11px] text-signal-teal">{acc.name}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-fog truncate">{acc.scope}</p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : resetMode === 'request' ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <h2 className="font-display text-xl font-semibold text-bone">
                  Recuperar contraseña
                </h2>
                <p className="mt-1.5 text-[13px] text-fog">
                  Generaremos un token temporal de un solo uso válido por 15 minutos.
                </p>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-mist mb-1.5">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="usuario@velocity.dev"
                  className="w-full px-3.5 py-2.5 bg-carbon border border-graphite rounded-inputs text-[13px] text-bone placeholder:text-ash focus:outline-none focus:border-iris-violet shadow-subtle"
                />
              </div>
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setResetMode('none')}
                  className="px-4 py-2 text-[13px] text-mist hover:text-paper rounded-buttons hover:bg-graphite transition-colors"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 py-2 px-4 bg-iris-violet hover:bg-iris-violet/90 text-paper text-[13px] font-medium rounded-buttons transition-colors disabled:opacity-60 shadow-sm"
                >
                  {resetLoading ? 'Enviando...' : 'Solicitar recuperación'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleConfirmReset} className="space-y-4">
              <div>
                <h2 className="font-display text-xl font-semibold text-bone">
                  Establecer nueva contraseña
                </h2>
                <p className="mt-1.5 text-[12px] text-mist leading-5">{resetFeedback}</p>
              </div>

              {demoResetToken && (
                <div className="p-3 rounded-cards bg-obsidian border border-iris-violet/30 text-[12px] text-signal-teal flex items-start gap-2 shadow-subtle">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-pulse-green" />
                  <div>
                    <span className="block font-medium text-bone">Token generado para entorno local:</span>
                    <code className="font-mono text-[11px] text-signal-teal">{demoResetToken}</code>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[12px] font-medium text-mist mb-1.5">
                  Token de recuperación
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-fog absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-carbon border border-graphite rounded-inputs text-[13px] font-mono text-bone focus:outline-none focus:border-iris-violet shadow-subtle"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-mist mb-1.5">
                  Nueva contraseña (mín. 8 caracteres)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-carbon border border-graphite rounded-inputs text-[13px] text-bone focus:outline-none focus:border-iris-violet shadow-subtle"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setResetMode('none')}
                  className="px-4 py-2 text-[13px] text-mist hover:text-paper rounded-buttons hover:bg-graphite transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 py-2 px-4 bg-iris-violet hover:bg-iris-violet/90 text-paper text-[13px] font-medium rounded-buttons transition-colors disabled:opacity-60 shadow-sm"
                >
                  {resetLoading ? 'Guardando...' : 'Actualizar contraseña'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
