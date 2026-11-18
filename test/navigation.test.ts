import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { AppShell } from '../src/components/AppShell.js';
import { CommandPalette } from '../src/components/CommandPalette.js';
import { ToastProvider } from '../src/context/ToastContext.js';
import { AuthProvider } from '../src/context/AuthContext.js';
import type { ProjectSummary, User, AppNotification } from '../src/types/scrum.js';

const mockUser: User = {
  id: 1,
  email: 'po@velocity.dev',
  fullName: 'Ada Lovelace (PO)',
  globalRole: 'USER',
  title: 'Product Owner',
};

const mockProject: ProjectSummary = {
  id: 101,
  name: 'Plataforma Core Scrum',
  code: 'CORE',
  description: 'Sistema principal',
  createdAt: '2026-01-01',
  activeSprint: null,
  myRole: 'PRODUCT_OWNER',
  totalStories: 10,
  completedStories: 4,
  totalPoints: 32,
  completedPoints: 12,
  members: [],
};

const mockNotification: AppNotification = {
  id: 1,
  userId: 1,
  message: 'Sprint 1 iniciado con éxito',
  readStatus: false,
  createdAt: new Date().toISOString(),
};

test('Navegación, AppShell y Command Palette - Suite Automatizada', async (t) => {
  await t.test('1. AppShell - renderizado de marca, secciones y accesibilidad', () => {
    const html = renderToString(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          AuthProvider,
          { initialUser: mockUser },
          React.createElement(
            AppShell,
            {
              route: 'backlog',
              projects: [mockProject],
              currentProject: mockProject,
              notifications: [mockNotification],
              onNavigate: () => {},
              onMarkNotificationsRead: () => {},
              onOpenCommandPalette: () => {},
            },
            React.createElement('div', { id: 'test-content' }, 'Contenido del Backlog')
          )
        )
      )
    );

    assert.ok(html.includes('Agile Velocity'), 'Debe renderizar el nombre de marca');
    assert.ok(html.includes('Product Backlog'), 'Debe incluir el elemento Product Backlog');
    assert.ok(html.includes('Plataforma Core Scrum'), 'Debe mostrar el nombre del proyecto activo');
    assert.ok(html.includes('aria-current="page"'), 'Debe marcar la ruta activa con aria-current="page"');
    assert.ok(html.includes('Contenido del Backlog'), 'Debe renderizar los componentes hijos (children)');
    assert.ok(html.includes('Ada Lovelace'), 'Debe renderizar el usuario autenticado');
    assert.ok(html.includes('Buscar o navegar'), 'Debe incluir el botón de acceso rápido al Command Palette');
  });

  await t.test('2. CommandPalette - renderizado condicional cuando está cerrado', () => {
    const html = renderToString(
      React.createElement(CommandPalette, {
        open: false,
        projects: [mockProject],
        currentProject: mockProject,
        onClose: () => {},
        onNavigate: () => {},
      })
    );

    assert.strictEqual(html, '', 'Cuando open=false no debe renderizar markup en el DOM');
  });

  await t.test('3. CommandPalette - renderizado interactivo, grupos y atajos de teclado', () => {
    const html = renderToString(
      React.createElement(CommandPalette, {
        open: true,
        projects: [mockProject],
        currentProject: mockProject,
        onClose: () => {},
        onNavigate: () => {},
        onQuickCreateStory: () => {},
      })
    );

    assert.ok(html.includes('Escribe un comando'), 'Debe tener el placeholder del campo de búsqueda');
    assert.ok(html.includes('ESC'), 'Debe incluir el atajo ESC');
    assert.ok(html.includes('Proyecto Activo'), 'Debe incluir la categoría Proyecto Activo');
    assert.ok(html.includes('Acciones'), 'Debe incluir la categoría Acciones para roles autorizados');
    assert.ok(html.includes('Nueva historia de usuario (con Asistencia IA)'), 'Debe mostrar acción rápida de historia');
    assert.ok(html.includes('Tablero Kanban'), 'Debe listar acceso directo a Kanban');
    assert.ok(html.includes('Métricas y Velocidad'), 'Debe listar acceso directo a Métricas');
    assert.ok(html.includes('Navegar'), 'Debe mostrar pistas de navegación por teclado');
  });

  await t.test('4. ToastProvider - contenedor accesible y suscripción de estado', () => {
    const html = renderToString(
      React.createElement(
        ToastProvider,
        null,
        React.createElement('div', null, 'Aplicación Montada')
      )
    );

    assert.ok(html.includes('aria-live="polite"'), 'Debe tener contenedor accesible aria-live="polite"');
    assert.ok(html.includes('Aplicación Montada'), 'Debe renderizar la aplicación contenida');
  });
});
