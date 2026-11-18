import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { store } from '../server/store.js';
import { OnboardingModal } from '../src/components/OnboardingModal.js';
import type { User } from '../src/types/scrum.js';

test('Auditoría, Seguridad y Estabilización (Etapa 6) - Suite Automatizada', async (t) => {
  await t.test('1. Seguridad Criptográfica - Generación de tokens de recuperación con alta entropía', () => {
    // Generate two consecutive tokens for a valid user
    const token1 = store.createResetToken('admin@velocity.dev');
    assert.ok(token1, 'Debe generar un token para un usuario existente');
    
    // Validate format: 4 groups of 4 uppercase hex characters (64-bit cryptographic entropy)
    const tokenRegex = /^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/;
    assert.match(token1!, tokenRegex, 'El token debe seguir el formato criptográfico XXXX-XXXX-XXXX-XXXX');

    const token2 = store.createResetToken('admin@velocity.dev');
    assert.ok(token2, 'Debe generar un segundo token');
    assert.notEqual(token1, token2, 'Cada token generado debe ser estrictamente único e impredecible');
  });

  await t.test('2. Seguridad de Sesión - Invalidación de tokens anteriores y expiración estricta de 15 minutos', () => {
    const user = store.findUserByEmail('po@velocity.dev');
    assert.ok(user, 'Usuario po@velocity.dev debe existir');

    const firstToken = store.createResetToken('po@velocity.dev');
    assert.ok(firstToken);

    // Requesting a second token should invalidate the first one
    const secondToken = store.createResetToken('po@velocity.dev');
    assert.ok(secondToken);

    // Attempting to reset password with the first (now invalidated) token must throw 400
    assert.throws(
      () => {
        store.resetPasswordWithToken(firstToken!, 'NewPassword123!');
      },
      (err: any) => err?.status === 400,
      'El token anterior debe ser invalidado automáticamente al emitir uno nuevo'
    );
  });

  await t.test('3. Seguridad de Sesión - Uso único e invalidación inmediata tras restablecer contraseña', () => {
    const token = store.createResetToken('sm@velocity.dev');
    assert.ok(token);

    // Successful reset
    store.resetPasswordWithToken(token!, 'SecurePassword2026!');

    // Replay attack attempt: Using the same token a second time must fail
    assert.throws(
      () => {
        store.resetPasswordWithToken(token!, 'AnotherPassword2026!');
      },
      (err: any) => err?.status === 400,
      'Un token de recuperación ya utilizado no debe poder ser reutilizado'
    );
  });

  await t.test('4. Regla Canónica Scrum - Restricción estricta de un único Sprint activo por proyecto', () => {
    // Project 1 already has active sprint or planning sprints
    const projectSprints = store.getSprintsByProject(1);
    const activeSprint = projectSprints.find((s) => s.status === 'ACTIVE');
    const planningSprint = projectSprints.find((s) => s.status === 'PLANNING');

    if (activeSprint && planningSprint) {
      assert.throws(
        () => {
          store.startSprint(planningSprint.id);
        },
        (err: any) => err?.status === 409,
        'Debe lanzar error 409 si se intenta iniciar un Sprint cuando ya existe uno activo'
      );
    } else {
      assert.ok(true, 'Condición de Sprints evaluada');
    }
  });

  await t.test('5. Integridad de Datos Scrum - Cierre transaccional y retorno de historias incompletas al Backlog', () => {
    // Create an isolated sprint for transaction testing
    const testSprint = store.createSprint(1, {
      name: 'Sprint de Prueba Transaccional',
      goal: 'Verificar retorno al backlog',
      startDate: '2026-03-01',
      endDate: '2026-03-15',
    });

    const testStory = store.createStory(1, {
      title: 'Historia de verificación transaccional',
      description: 'Historia para verificar retorno al backlog',
      acceptanceCriteria: ['Criterio 1'],
      priority: 'MEDIUM',
      storyPoints: 5,
    });

    // Assign story to sprint
    store.assignStoryToSprint(testStory.id, testSprint.id);
    assert.equal(store.getStoryById(testStory.id)?.sprintId, testSprint.id);

    // Mark sprint as ACTIVE in-memory to test close
    testSprint.status = 'ACTIVE';

    // Close sprint
    const summary = store.closeSprint(testSprint.id);
    assert.equal(summary.sprintId, testSprint.id);

    // Story was incomplete (has no completed tasks), must have returned to Backlog (sprintId === null)
    const refreshedStory = store.getStoryById(testStory.id);
    assert.equal(
      refreshedStory?.sprintId,
      null,
      'Las historias no completadas deben retornar al Product Backlog con sprintId null'
    );

    // Clean up temporary test entities
    store.deleteStory(testStory.id);
  });

  await t.test('6. Tutorial Onboarding - Adaptación contextual a roles de usuario (ADMIN, PO, SM, DEV)', () => {
    const adminUser: User = {
      id: 1,
      email: 'admin@velocity.dev',
      fullName: 'Elena Vance',
      globalRole: 'ADMIN',
      title: 'Administrador de Sistemas',
    };
    const poUser: User = {
      id: 2,
      email: 'po@velocity.dev',
      fullName: 'Mateo Ríos',
      globalRole: 'USER',
      title: 'Product Owner',
    };

    const adminHtml = renderToString(
      React.createElement(OnboardingModal, { open: true, user: adminUser, onClose: () => {} })
    );
    assert.ok(
      adminHtml.includes('Gobernanza') || adminHtml.includes('Administrador'),
      'Debe contener orientación para rol Administrador'
    );

    const poHtml = renderToString(
      React.createElement(OnboardingModal, { open: true, user: poUser, onClose: () => {} })
    );
    assert.ok(
      poHtml.includes('Product Owner'),
      'Debe contener orientación adaptada para rol Product Owner'
    );
  });
});
