import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { LoginView } from '../src/components/LoginView.js';
import { ThemeModal } from '../src/components/ThemeModal.js';
import { OnboardingModal } from '../src/components/OnboardingModal.js';
import { ThemeProvider } from '../src/context/ThemeContext.js';
import { AuthProvider } from '../src/context/AuthContext.js';
import { ToastProvider } from '../src/context/ToastContext.js';
import type { User } from '../src/types/scrum.js';

const mockUser: User = {
  id: 1,
  email: 'sm@velocity.dev',
  fullName: 'Sofía Mendoza',
  globalRole: 'USER',
  title: 'Scrum Master Certificada',
};

test('Login, Onboarding y Personalización (Etapa 5) - Suite Automatizada', async (t) => {
  await t.test('1. LoginView - renderizado de interfaz SaaS moderna con 2 columnas y branding', () => {
    const html = renderToString(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          AuthProvider,
          null,
          React.createElement(LoginView)
        )
      )
    );

    assert.ok(html.includes('Agile Velocity'), 'Debe incluir el nombre de la plataforma');
    assert.ok(
      html.includes('Scrum Management Suite') || html.includes('Scrum Management'),
      'Debe incluir subtítulo o descriptor de Scrum'
    );
    assert.ok(
      html.includes('Ejecución Scrum ágil con asistencia inteligente'),
      'Debe incluir el encabezado principal de valor'
    );
    assert.ok(
      html.includes('Backlog &amp; Sprints') || html.includes('Backlog & Sprints'),
      'Debe incluir la columna de arquitectura'
    );
  });

  await t.test('2. LoginView - campos accesibles, placeholders limpios y sin contraseñas en texto plano', () => {
    const html = renderToString(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          AuthProvider,
          null,
          React.createElement(LoginView)
        )
      )
    );

    // Accessible labels and inputs
    assert.ok(html.includes('Correo electrónico'), 'Debe tener etiqueta para correo electrónico');
    assert.ok(html.includes('Contraseña'), 'Debe tener etiqueta para contraseña');
    assert.ok(html.includes('placeholder="tu@empresa.com"'), 'Debe tener placeholder limpio tu@empresa.com');
    assert.ok(html.includes('placeholder="••••••••"'), 'Debe tener placeholder de puntos para contraseña');

    // No exposed plaintext passwords in the UI prose
    assert.ok(
      !html.includes('Password123!'),
      'NO debe exponer Password123! en texto plano visible en el DOM'
    );

    // Forgot password flow button
    assert.ok(
      html.includes('¿Olvidaste tu contraseña?'),
      'Debe incluir acceso al flujo de recuperación de contraseña'
    );
  });

  await t.test('3. LoginView - perfiles de evaluación rápida para los 4 roles Scrum', () => {
    const html = renderToString(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          AuthProvider,
          null,
          React.createElement(LoginView)
        )
      )
    );

    assert.ok(html.includes('Acceso rápido de evaluación'), 'Debe contener la sección de acceso rápido');
    assert.ok(html.includes('Administrador'), 'Debe contener perfil de Administrador');
    assert.ok(html.includes('Product Owner'), 'Debe contener perfil de Product Owner');
    assert.ok(html.includes('Scrum Master'), 'Debe contener perfil de Scrum Master');
    assert.ok(html.includes('Developer'), 'Debe contener perfil de Developer');
  });

  await t.test('4. ThemeModal - opciones de Modo Oscuro, Modo Claro y Movimiento Accesible', () => {
    const html = renderToString(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(ThemeModal, { open: true, onClose: () => {} })
      )
    );

    assert.ok(html.includes('Personalización y Apariencia'), 'Debe renderizar título del modal');
    assert.ok(html.includes('Modo Oscuro'), 'Debe contener opción de Modo Oscuro');
    assert.ok(html.includes('Modo Claro'), 'Debe contener opción de Modo Claro');
    assert.ok(html.includes('Automático (Sistema)'), 'Debe contener opción de tema automático');
    assert.ok(html.includes('Animaciones completas'), 'Debe contener opción de animaciones completas');
    assert.ok(html.includes('Movimiento reducido'), 'Debe contener opción de movimiento reducido (WCAG 2.2)');
  });

  await t.test('5. OnboardingModal - tutorial interactivo de 8 pasos con progreso y conceptos clave', () => {
    const html = renderToString(
      React.createElement(OnboardingModal, { open: true, user: mockUser, onClose: () => {} })
    );

    assert.ok(html.includes('Bienvenido a Agile Velocity'), 'Debe mostrar el título del paso 1');
    assert.ok(
      html.includes('Paso 1 · Introducción') || /Paso.*1.*de.*8/.test(html),
      'Debe indicar que hay 8 pasos en el tutorial'
    );
    assert.ok(html.includes('Conceptos Clave'), 'Debe listar conceptos clave del marco Scrum');
    assert.ok(html.includes('Omitir tutorial'), 'Debe permitir omitir el tutorial');
    assert.ok(html.includes('Siguiente'), 'Debe incluir botón Siguiente');
    assert.ok(html.includes('Anterior'), 'Debe incluir botón Anterior');
  });
});
