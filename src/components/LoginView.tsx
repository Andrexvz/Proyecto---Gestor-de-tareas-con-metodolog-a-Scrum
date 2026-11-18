import React, { useState } from 'react';
import {
  Loader2,
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Kanban,
  Layers,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../lib/api';
import { Button } from './ui';

const DEMO_ACCOUNTS = [
  {
    label: 'Administrador',
    email: 'admin@velocity.dev',
    name: 'Elena Vance',
    scope: 'Control total · Proyectos y equipo',
    badge: 'Admin',
  },
  {
    label: 'Product Owner',
    email: 'po@velocity.dev',
    name: 'Mateo Ríos',
    scope: 'Backlog · Asistente IA',
    badge: 'PO',
  },
  {
    label: 'Scrum Master',
    email: 'sm@velocity.dev',
    name: 'Sofía Mendoza',
    scope: 'Sprints · Cierre transaccional',
    badge: 'SM',
  },
  {
    label: 'Developer',
    email: 'dev1@velocity.dev',
    name: 'Lucas Herrera',
    scope: 'Tablero Kanban · Tareas',
    badge: 'DEV',
  },
];

export function LoginView() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const shouldReduceMotion = useReducedMotion();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Forgot password modal state (RF-16)
  const [resetMode, setResetMode] = useState<'none' | 'request' | 'confirm'>('none');
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetFeedback, setResetFeedback] = useState('');
  const [demoResetToken, setDemoResetToken] = useState('');

  // Controlled evaluation profiles: only rendered on localhost/dev or explicit demo flag
  const isDemoEnvironment =
    typeof window !== 'undefined'
      ? window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        import.meta.env.DEV ||
        import.meta.env.VITE_ENABLE_DEMO === 'true'
      : true;

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
    if (!isDemoEnvironment) return;
    setEmail(demoEmail);
    setPassword('Password123!');
    setErrorMsg('');
    setSubmitting(true);
    try {
      await login(demoEmail, 'Password123!');
    } catch (err: any) {
      setErrorMsg(err?.message || 'No se pudo iniciar sesión con este perfil');
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
    <div className="min-h-screen bg-void text-mist grid lg:grid-cols-12 selection:bg-iris-violet/30">
      {/* Left Architectural Context Panel */}
      <div className="hidden lg:flex lg:col-span-7 flex-col justify-between p-12 bg-carbon border-r border-graphite relative overflow-hidden">
        {/* Subtle decorative background gradient */}
        <div
          className="absolute -top-40 -left-40 w-96 h-96 bg-iris-violet/10 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-40 -right-40 w-96 h-96 bg-signal-teal/10 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-inputs bg-iris-violet flex items-center justify-center text-paper font-display font-bold text-base shadow-sm ring-1 ring-lavender/30">
            AV
          </div>
          <div>
            <span className="font-display text-lg font-semibold tracking-tight text-bone block leading-none">
              Agile Velocity
            </span>
            <span className="text-[11px] text-fog font-mono">Scrum Management Suite</span>
          </div>
        </div>

        <div className="relative z-10 max-w-xl space-y-8 my-auto py-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pills bg-obsidian border border-graphite text-[12px] text-lavender shadow-subtle">
            <Sparkles className="w-3.5 h-3.5 text-lavender animate-pulse" />
            <span>Modernización UI/UX · Edición Enterprise</span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight text-bone leading-[1.12] [text-wrap:balance]">
            Ejecución Scrum ágil con asistencia inteligente.
          </h1>

          <p className="text-[15px] text-mist leading-relaxed">
            Centraliza tu Product Backlog, planifica Sprints con estimación en Story Points, gestiona
            tu tablero Kanban con sincronización automática y redacta historias de usuario
            estructuradas con soporte de IA.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-graphite">
            <div className="p-3.5 rounded-cards bg-obsidian/70 border border-graphite/70 shadow-subtle space-y-2">
              <div className="w-8 h-8 rounded-inputs bg-carbon border border-graphite flex items-center justify-center text-signal-teal">
                <Layers className="w-4 h-4" />
              </div>
              <h2 className="text-[13px] font-semibold text-bone">Backlog & Sprints</h2>
              <p className="text-[12px] text-fog leading-relaxed">
                Priorización MoSCoW, Story Points Fibonacci y regla de 1 Sprint activo.
              </p>
            </div>

            <div className="p-3.5 rounded-cards bg-obsidian/70 border border-graphite/70 shadow-subtle space-y-2">
              <div className="w-8 h-8 rounded-inputs bg-carbon border border-graphite flex items-center justify-center text-lavender">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-[13px] font-semibold text-bone">Asistencia IA</h2>
              <p className="text-[12px] text-fog leading-relaxed">
                Genera borradores estructurados y criterios de aceptación editables.
              </p>
            </div>

            <div className="p-3.5 rounded-cards bg-obsidian/70 border border-graphite/70 shadow-subtle space-y-2">
              <div className="w-8 h-8 rounded-inputs bg-carbon border border-graphite flex items-center justify-center text-pulse-green">
                <Kanban className="w-4 h-4" />
              </div>
              <h2 className="text-[13px] font-semibold text-bone">Kanban Drag & Drop</h2>
              <p className="text-[12px] text-fog leading-relaxed">
                Flujo canónico de 4 etapas con cierre automático de historias.
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[12px] text-fog pt-4 border-t border-graphite">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-pulse-green" />
            <span>Acceso seguro mediante JWT</span>
          </div>
          <span className="font-mono text-[11px]">Control de roles RBAC</span>
        </div>
      </div>

      {/* Right Authentication Panel */}
      <div className="lg:col-span-5 flex flex-col justify-center px-6 py-12 sm:px-12 bg-void relative">
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="w-full max-w-md mx-auto space-y-8"
        >
          {/* Mobile branding header */}
          <div className="lg:hidden flex items-center gap-3 pb-2 border-b border-graphite">
            <div className="w-9 h-9 rounded-inputs bg-iris-violet flex items-center justify-center text-paper font-display font-bold text-sm shadow-sm">
              AV
            </div>
            <div>
              <span className="font-display text-base font-semibold text-bone block leading-none">
                Agile Velocity
              </span>
              <span className="text-[11px] text-fog font-mono">Scrum Management</span>
            </div>
          </div>

          {resetMode === 'none' ? (
            <>
              <div>
                <h2 className="font-display text-2xl font-semibold text-bone tracking-tight">
                  Iniciar sesión
                </h2>
                <p className="mt-1.5 text-[13px] text-fog">
                  Ingresa con tu correo corporativo o selecciona un perfil de evaluación Scrum.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="block text-[12px] font-medium text-mist mb-1.5">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-fog absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="login-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@empresa.com"
                      autoComplete="email"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-carbon border border-graphite rounded-inputs text-[13px] text-bone placeholder:text-ash focus:outline-none focus:border-iris-violet focus:ring-1 focus:ring-iris-violet shadow-subtle transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="login-password" className="text-[12px] font-medium text-mist">
                      Contraseña
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(email);
                        setResetMode('request');
                      }}
                      className="text-[12px] text-signal-teal hover:text-paper transition-colors focus:outline-none focus:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-fog absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full pl-10 pr-10 py-2.5 bg-carbon border border-graphite rounded-inputs text-[13px] text-bone placeholder:text-ash focus:outline-none focus:border-iris-violet focus:ring-1 focus:ring-iris-violet shadow-subtle transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-fog hover:text-bone focus:outline-none transition-colors"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-mist" />
                      ) : (
                        <Eye className="w-4 h-4 text-fog" />
                      )}
                    </button>
                  </div>
                </div>

                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-3.5 py-2.5 rounded-inputs bg-coral-red/15 border border-coral-red/30 text-[12px] text-coral-red"
                  >
                    {errorMsg}
                  </motion.div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={submitting}
                  className="w-full justify-center"
                  rightIcon={!submitting ? <ArrowRight className="w-4 h-4" /> : undefined}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Validando credenciales...</span>
                    </>
                  ) : (
                    'Iniciar Sesión'
                  )}
                </Button>
              </form>

              {/* Quick Evaluation Profiles (Development / Demo Environment Only) */}
              {isDemoEnvironment && (
                <div className="pt-5 border-t border-graphite space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[12px] font-semibold text-bone">
                      <Zap className="w-3.5 h-3.5 text-signal-teal" />
                      <span>Acceso rápido de evaluación</span>
                    </div>
                    <span className="text-[11px] text-fog">Entorno Demo · 1 clic</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {DEMO_ACCOUNTS.map((acc) => (
                      <button
                        key={acc.email}
                        type="button"
                        disabled={submitting}
                        onClick={() => handleQuickLogin(acc.email)}
                        className="text-left p-3 rounded-cards bg-obsidian hover:bg-graphite/40 border border-graphite hover:border-iris-violet/40 transition-all disabled:opacity-60 shadow-subtle group focus:outline-none focus:ring-1 focus:ring-iris-violet"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-semibold text-bone group-hover:text-paper transition-colors">
                            {acc.label}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-pills bg-graphite/80 text-[10px] font-mono text-lavender group-hover:border group-hover:border-iris-violet/40">
                            {acc.badge}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-signal-teal truncate">{acc.name}</p>
                        <p className="mt-0.5 text-[10px] text-fog truncate">{acc.scope}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : resetMode === 'request' ? (
            <motion.form
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              onSubmit={handleRequestReset}
              className="space-y-4"
            >
              <div>
                <h2 className="font-display text-xl font-semibold text-bone">
                  Recuperar contraseña
                </h2>
                <p className="mt-1.5 text-[13px] text-fog">
                  Generaremos un token temporal de un solo uso válido por 15 minutos.
                </p>
              </div>

              <div>
                <label htmlFor="reset-email" className="block text-[12px] font-medium text-mist mb-1.5">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-fog absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="usuario@velocity.dev"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-carbon border border-graphite rounded-inputs text-[13px] text-bone placeholder:text-ash focus:outline-none focus:border-iris-violet shadow-subtle"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setResetMode('none')}
                >
                  Volver
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={resetLoading}
                  className="flex-1 justify-center"
                >
                  {resetLoading ? 'Enviando...' : 'Solicitar recuperación'}
                </Button>
              </div>
            </motion.form>
          ) : (
            <motion.form
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              onSubmit={handleConfirmReset}
              className="space-y-4"
            >
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
                    <span className="block font-medium text-bone">Token de entorno local:</span>
                    <code className="font-mono text-[11px] text-signal-teal">{demoResetToken}</code>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="reset-token" className="block text-[12px] font-medium text-mist mb-1.5">
                  Token de recuperación
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-fog absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="reset-token"
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Pega el token aquí"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-carbon border border-graphite rounded-inputs text-[13px] font-mono text-bone focus:outline-none focus:border-iris-violet shadow-subtle"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reset-newpassword" className="block text-[12px] font-medium text-mist mb-1.5">
                  Nueva contraseña (mín. 8 caracteres)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-fog absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="reset-newpassword"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full pl-10 pr-10 py-2.5 bg-carbon border border-graphite rounded-inputs text-[13px] text-bone focus:outline-none focus:border-iris-violet shadow-subtle"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-fog hover:text-bone focus:outline-none transition-colors"
                    aria-label={showNewPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4 text-mist" />
                    ) : (
                      <Eye className="w-4 h-4 text-fog" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setResetMode('none')}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={resetLoading}
                  className="flex-1 justify-center"
                >
                  {resetLoading ? 'Guardando...' : 'Actualizar contraseña'}
                </Button>
              </div>
            </motion.form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
