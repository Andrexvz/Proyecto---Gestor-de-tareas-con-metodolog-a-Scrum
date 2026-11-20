import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { store } from '../server/store';
import type { TaskStatus } from '../src/types/scrum';

test('Gestión de Tareas - Suite Automatizada', async (t) => {
  // Setup: obtener historias y usuarios de prueba existentes en el seed
  const projectStories = store.getStoriesByProject(1);
  assert.ok(projectStories.length > 0, 'Debe haber historias en el proyecto 1');

  // Historia en Sprint Activo o Backlog editable (sprint no cerrado)
  const activeSprintStory =
    projectStories.find((s) => {
      if (s.sprintId === null) return true;
      const sp = store.getSprintById(s.sprintId);
      return sp && sp.status !== 'CLOSED';
    }) || projectStories[0];
  // Historia en Sprint Cerrado
  const closedSprintStory =
    projectStories.find((s) => {
      if (s.sprintId === null) return false;
      const sp = store.getSprintById(s.sprintId);
      return sp && sp.status === 'CLOSED';
    }) || projectStories.find((s) => s.sprintId === 1);

  await t.test('1. Validaciones al crear tareas', () => {
    // 1.1 Falla si la descripción está vacía o tiene menos de 3 caracteres
    assert.throws(
      () => store.createTask(activeSprintStory.id, { description: '' }),
      (err: any) => err.status === 400 && err.message.includes('al menos 3 caracteres'),
      'Debe rechazar descripción vacía con error 400'
    );

    assert.throws(
      () => store.createTask(activeSprintStory.id, { description: '  ab  ' }),
      (err: any) => err.status === 400 && err.message.includes('al menos 3 caracteres'),
      'Debe rechazar descripción con menos de 3 caracteres útiles'
    );

    // 1.2 Falla si la descripción supera 500 caracteres
    const longDesc = 'A'.repeat(501);
    assert.throws(
      () => store.createTask(activeSprintStory.id, { description: longDesc }),
      (err: any) => err.status === 400 && err.message.includes('no puede exceder 500 caracteres'),
      'Debe rechazar descripción que exceda 500 caracteres'
    );

    // 1.3 Falla si la historia no existe
    assert.throws(
      () => store.createTask(999999, { description: 'Tarea huérfana' }),
      (err: any) => err.status === 404,
      'Debe retornar 404 para historia inexistente'
    );

    // 1.4 Falla si el usuario asignado no pertenece al proyecto ni es admin
    assert.throws(
      () => store.createTask(activeSprintStory.id, { description: 'Tarea con usuario inválido', assignedToId: 99999 }),
      (err: any) => err.status === 404 || err.status === 400,
      'Debe rechazar asignación a usuario no perteneciente al proyecto'
    );

    // 1.5 Falla si la historia pertenece a un Sprint cerrado
    if (closedSprintStory) {
      assert.throws(
        () => store.createTask(closedSprintStory.id, { description: 'Tarea en sprint cerrado' }),
        (err: any) => err.status === 409,
        'Debe rechazar creación de tarea en sprint cerrado con error 409'
      );
    }

    // 1.6 Creación exitosa con descripción válida y usuario válido
    const created = store.createTask(activeSprintStory.id, {
      description: 'Implementar validación criptográfica en backend',
      assignedToId: 4, // Dev 1 (Lucas Herrera, miembro del proyecto 1)
    });

    assert.ok(created.task.id > 0, 'La tarea debe tener un ID numérico generado');
    assert.strictEqual(created.task.status, 'TODO', 'La tarea nueva debe iniciar en TODO');
    assert.strictEqual(created.task.description, 'Implementar validación criptográfica en backend');
    assert.strictEqual(created.task.assignedToId, 4);
    assert.ok(created.task.code.startsWith('TASK-'), 'El código debe tener formato TASK-XX');
  });

  await t.test('2. Validaciones al editar tareas', () => {
    // Crear una tarea específica para pruebas de edición
    const { task } = store.createTask(activeSprintStory.id, {
      description: 'Tarea para pruebas de edición y actualización',
      assignedToId: 4,
    });

    // 2.1 Falla al intentar actualizar descripción con texto vacío o menor a 3 caracteres
    assert.throws(
      () => store.updateTask(task.id, { description: '  ' }),
      (err: any) => err.status === 400 && err.message.includes('al menos 3 caracteres'),
      'Debe rechazar actualización de descripción vacía'
    );

    // 2.2 Falla al intentar actualizar descripción superior a 500 caracteres
    assert.throws(
      () => store.updateTask(task.id, { description: 'X'.repeat(501) }),
      (err: any) => err.status === 400 && err.message.includes('no puede exceder 500 caracteres'),
      'Debe rechazar actualización con más de 500 caracteres'
    );

    // 2.3 Falla al intentar enviar un estado inválido
    assert.throws(
      () => store.updateTask(task.id, { status: 'INVALID_STATUS' as any }),
      (err: any) => err.status === 400,
      'Debe rechazar estado no reconocido por Scrum'
    );

    // 2.4 Falla al intentar asignar a usuario inválido
    assert.throws(
      () => store.updateTask(task.id, { assignedToId: 88888 }),
      (err: any) => err.status === 404 || err.status === 400,
      'Debe rechazar asignación a usuario inexistente'
    );

    // 2.5 Actualización exitosa de descripción y responsable
    const updated = store.updateTask(task.id, {
      description: 'Descripción técnica actualizada correctamente',
      assignedToId: 5, // Dev 2 (Valentina Cruz)
    });
    assert.strictEqual(updated.task.description, 'Descripción técnica actualizada correctamente');
    assert.strictEqual(updated.task.assignedToId, 5);

    // 2.6 Desasignar responsable enviando null
    const unassigned = store.updateTask(task.id, { assignedToId: null });
    assert.strictEqual(unassigned.task.assignedToId, null, 'Debe permitir desasignar responsable');
  });

  await t.test('3. Cambio de estados y sincronización Kanban con Historias de Usuario', () => {
    // Creamos una nueva historia dedicada para comprobar el cálculo de completitud
    const testStory = store.createStory(1, {
      title: 'Historia aislada para verificar Kanban',
      description: 'Historia para pruebas automatizadas de estado de tareas',
      acceptanceCriteria: ['Criterio 1', 'Criterio 2'],
      priority: 'HIGH',
      storyPoints: 5,
    });

    // Creamos dos tareas para esta historia
    const { task: task1 } = store.createTask(testStory.id, { description: 'Subtarea 1 para Kanban' });
    const { task: task2 } = store.createTask(testStory.id, { description: 'Subtarea 2 para Kanban' });

    let story = store.getStoryById(testStory.id)!;
    assert.strictEqual(story.isCompleted, false, 'La historia debe iniciar no completada');

    // Transición de task 1: TODO -> IN_PROGRESS -> TESTING
    store.updateTask(task1.id, { status: 'IN_PROGRESS' });
    assert.strictEqual(store.getTaskById(task1.id)?.status, 'IN_PROGRESS');
    story = store.getStoryById(testStory.id)!;
    assert.strictEqual(story.isCompleted, false);

    store.updateTask(task1.id, { status: 'TESTING' });
    assert.strictEqual(store.getTaskById(task1.id)?.status, 'TESTING');
    story = store.getStoryById(testStory.id)!;
    assert.strictEqual(story.isCompleted, false);

    // task 1 pasa a DONE; task 2 sigue en TODO -> historia sigue incompleta
    store.updateTask(task1.id, { status: 'DONE' });
    story = store.getStoryById(testStory.id)!;
    assert.strictEqual(story.isCompleted, false, 'Con una tarea pendiente la historia NO debe estar completada');

    // task 2 pasa a DONE -> ambas tareas DONE -> historia completada automáticamente
    store.updateTask(task2.id, { status: 'DONE' });
    story = store.getStoryById(testStory.id)!;
    assert.strictEqual(story.isCompleted, true, 'Al completar todas las tareas, la historia debe marcarse como completada');

    // Si task 1 regresa a TESTING -> la historia debe volver a incompleta
    store.updateTask(task1.id, { status: 'TESTING' });
    story = store.getStoryById(testStory.id)!;
    assert.strictEqual(story.isCompleted, false, 'Al retroceder una tarea desde DONE, la historia debe volver a incompleta');
  });

  await t.test('4. Persistencia en disco y recuperación tras recarga', () => {
    // Creamos una tarea específica con un marcador único
    const uniqueMarker = `TEST-PERSISTENCE-${Date.now()}`;
    const { task } = store.createTask(activeSprintStory.id, {
      description: `Tarea persistente de prueba ${uniqueMarker}`,
      assignedToId: 4,
    });
    store.updateTask(task.id, { status: 'TESTING' });

    // Verificar que getTaskById lo encuentra en la instancia actual
    const found = store.getTaskById(task.id);
    assert.ok(found, 'La tarea debe existir en memoria');
    assert.strictEqual(found?.description, `Tarea persistente de prueba ${uniqueMarker}`);
    assert.strictEqual(found?.status, 'TESTING');

    // Simular reinicio/recarga leyendo directamente el JSON del disco
    const dbPath = path.resolve(import.meta.dirname ?? process.cwd(), '..', 'data', 'scrum-db.json');
    assert.ok(fs.existsSync(dbPath), 'El archivo scrum-db.json debe existir en disco');

    const fileContent = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    const savedTask = fileContent.tasks.find((t: any) => t.id === task.id);

    assert.ok(savedTask, 'La tarea debe estar grabada en el archivo físico scrum-db.json');
    assert.strictEqual(savedTask.description, `Tarea persistente de prueba ${uniqueMarker}`);
    assert.strictEqual(savedTask.status, 'TESTING');
    assert.strictEqual(savedTask.assignedToId, 4);
  });

  await t.test('5. Eliminación de tareas y actualización de estado', () => {
    const { task } = store.createTask(activeSprintStory.id, {
      description: 'Tarea para ser eliminada en prueba',
    });

    assert.ok(store.getTaskById(task.id) !== undefined);
    store.deleteTask(task.id);
    assert.strictEqual(store.getTaskById(task.id), undefined, 'La tarea eliminada no debe existir');

    // Falla si se intenta eliminar nuevamente (404)
    assert.throws(
      () => store.deleteTask(task.id),
      (err: any) => err.status === 404,
      'Debe retornar 404 al intentar eliminar una tarea que ya no existe'
    );
  });
});
