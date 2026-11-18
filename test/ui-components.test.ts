import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  Button,
  Input,
  Textarea,
  Select,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Modal,
  SkeletonLoader,
  SkeletonCard,
  EmptyState,
} from '../src/components/ui/index.js';

test('Componentes Atómicos UI - Suite Automatizada', async (t) => {
  await t.test('1. Button - renderizado, variantes y estados', () => {
    const primaryHtml = renderToString(
      React.createElement(Button, { variant: 'primary', size: 'md' }, 'Guardar Tarea')
    );
    assert.ok(primaryHtml.includes('Guardar Tarea'), 'Debe contener el texto del botón');
    assert.ok(primaryHtml.includes('bg-iris-violet'), 'Debe aplicar la clase de variante primary');

    const loadingHtml = renderToString(
      React.createElement(Button, { variant: 'danger', loading: true }, 'Eliminar')
    );
    assert.ok(loadingHtml.includes('disabled=""'), 'Debe estar deshabilitado en estado loading');
    assert.ok(loadingHtml.includes('animate-spin'), 'Debe contener el icono de spinner');
  });

  await t.test('2. Input - accesibilidad, labels y estados de error', () => {
    const inputHtml = renderToString(
      React.createElement(Input, {
        label: 'Título de la tarea',
        error: 'El título es obligatorio',
        placeholder: 'Ingresa un valor',
      })
    );
    assert.ok(inputHtml.includes('Título de la tarea'), 'Debe renderizar la etiqueta accesible');
    assert.ok(inputHtml.includes('aria-invalid="true"'), 'Debe marcar aria-invalid en error');
    assert.ok(inputHtml.includes('El título es obligatorio'), 'Debe mostrar el mensaje de error');
    assert.ok(inputHtml.includes('border-coral-red'), 'Debe tener borde de error coral-red');
  });

  await t.test('3. Textarea - conteo de caracteres y accesibilidad', () => {
    const textareaHtml = renderToString(
      React.createElement(Textarea, {
        label: 'Descripción técnica',
        value: 'Descripción de prueba',
        readOnly: true,
        maxLength: 500,
        showCount: true,
      })
    );
    assert.ok(textareaHtml.includes('Descripción técnica'), 'Debe renderizar la etiqueta');
    assert.ok(textareaHtml.includes('21/500'), 'Debe calcular y mostrar el contador de caracteres');
  });

  await t.test('4. Select - renderizado de opciones e indicador', () => {
    const selectHtml = renderToString(
      React.createElement(Select, {
        label: 'Estado de la tarea',
        options: [
          { value: 'TODO', label: 'To Do' },
          { value: 'DONE', label: 'Done' },
        ],
      })
    );
    assert.ok(selectHtml.includes('Estado de la tarea'), 'Debe renderizar la etiqueta');
    assert.ok(selectHtml.includes('To Do'), 'Debe contener la opción To Do');
    assert.ok(selectHtml.includes('Done'), 'Debe contener la opción Done');
  });

  await t.test('5. Badge - variantes semánticas y puntos indicadores', () => {
    const badgeHtml = renderToString(
      React.createElement(Badge, { variant: 'success', shape: 'pill', dot: true }, 'Activo')
    );
    assert.ok(badgeHtml.includes('Activo'), 'Debe contener el texto');
    assert.ok(badgeHtml.includes('text-pulse-green'), 'Debe usar el token pulse-green');
    assert.ok(badgeHtml.includes('rounded-pills'), 'Debe tener forma de píldora');
  });

  await t.test('6. Card - estructura modular y variantes de superficie', () => {
    const cardHtml = renderToString(
      React.createElement(
        Card,
        { variant: 'default' },
        React.createElement(CardHeader, null, React.createElement(CardTitle, null, 'Sprint 1')),
        React.createElement(CardContent, null, 'Contenido del Sprint'),
        React.createElement(CardFooter, null, React.createElement(Button, { size: 'sm' }, 'Ver'))
      )
    );
    assert.ok(cardHtml.includes('Sprint 1'), 'Debe renderizar el título de la tarjeta');
    assert.ok(cardHtml.includes('Contenido del Sprint'), 'Debe renderizar el contenido');
    assert.ok(cardHtml.includes('bg-obsidian'), 'Debe usar superficie obsidian');
  });

  await t.test('7. Modal - diálogo accesible con slots de cabecera y pie', () => {
    const modalHtml = renderToString(
      React.createElement(
        Modal,
        {
          open: true,
          onClose: () => {},
          title: 'Confirmar eliminación',
          footer: React.createElement(Button, { variant: 'danger' }, 'Eliminar'),
        },
        React.createElement('p', null, '¿Estás seguro de continuar?')
      )
    );
    assert.ok(modalHtml.includes('Confirmar eliminación'), 'Debe renderizar el título');
    assert.ok(modalHtml.includes('role="dialog"'), 'Debe tener rol de diálogo accesible');
    assert.ok(modalHtml.includes('aria-modal="true"'), 'Debe marcar aria-modal');
  });

  await t.test('8. SkeletonLoader - variantes de carga y reducción de movimiento', () => {
    const skeletonHtml = renderToString(
      React.createElement(SkeletonLoader, { variant: 'text', lines: 3 })
    );
    assert.ok(skeletonHtml.includes('aria-busy="true"'), 'Debe declarar aria-busy');
    assert.ok(skeletonHtml.includes('skeleton-wave'), 'Debe aplicar la animación skeleton-wave');
    assert.ok(
      skeletonHtml.includes('motion-reduce:animate-none'),
      'Debe respetar prefers-reduced-motion'
    );
  });

  await t.test('9. EmptyState - ilustración, título explicativo y llamada a la acción', () => {
    const emptyHtml = renderToString(
      React.createElement(EmptyState, {
        title: 'No hay historias en este Sprint',
        description: 'Planifica historias desde el Backlog para comenzar.',
        action: React.createElement(Button, { size: 'sm' }, 'Ir al Backlog'),
      })
    );
    assert.ok(emptyHtml.includes('No hay historias en este Sprint'), 'Debe mostrar el título');
    assert.ok(emptyHtml.includes('Planifica historias'), 'Debe mostrar la descripción');
    assert.ok(emptyHtml.includes('Ir al Backlog'), 'Debe renderizar la acción');
  });
});
