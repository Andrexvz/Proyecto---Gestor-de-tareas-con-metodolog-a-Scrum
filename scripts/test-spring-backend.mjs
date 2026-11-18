// Script de prueba y verificación de la API REST de Spring Boot 3
const BASE_URL = 'http://localhost:8080/api/v1';

async function testBackend() {
  console.log('--- INICIANDO VERIFICACIÓN DE BACKEND SPRING BOOT 3 ---');

  // 1. Login con Product Owner
  console.log('\n1. Test POST /api/v1/auth/login (Product Owner):');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'po@velocity.dev', password: '123456' }),
  });
  const loginData = await loginRes.json();
  console.log('Status:', loginRes.status);
  console.log('Usuario:', loginData.fullName, '| Rol:', loginData.role);
  console.log('Token emitido:', loginData.token ? `${loginData.token.substring(0, 30)}...` : 'NONE');

  const token = loginData.token;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. Proyectos
  console.log('\n2. Test GET /api/v1/projects:');
  const projRes = await fetch(`${BASE_URL}/projects`, { headers: authHeaders });
  const projects = await projRes.json();
  console.log('Status:', projRes.status);
  console.log('Proyectos cargados:', projects.map(p => `${p.code} - ${p.name} (Sprints: ${p.totalSprints}, Historias: ${p.totalStories})`));

  const projectId = projects[0]?.id || 1;

  // 3. Sprints del proyecto
  console.log(`\n3. Test GET /api/v1/sprints/project/${projectId}:`);
  const sprintsRes = await fetch(`${BASE_URL}/sprints/project/${projectId}`, { headers: authHeaders });
  const sprints = await sprintsRes.json();
  console.log('Status:', sprintsRes.status);
  console.log('Sprints:', sprints.map(s => `[${s.status}] ${s.name} (Puntos: ${s.totalPoints})`));

  // 4. Product Backlog
  console.log(`\n4. Test GET /api/v1/stories/project/${projectId}/product-backlog:`);
  const backlogRes = await fetch(`${BASE_URL}/stories/project/${projectId}/product-backlog`, { headers: authHeaders });
  const backlog = await backlogRes.json();
  console.log('Status:', backlogRes.status);
  console.log('Historias en Product Backlog:', backlog.map(s => `${s.code}: ${s.title} (${s.storyPoints} pts, ${s.priority})`));

  // 5. Tareas del Sprint activo (Kanban)
  const activeSprint = sprints.find(s => s.status === 'ACTIVE') || sprints[0];
  console.log(`\n5. Test GET /api/v1/tasks/sprint/${activeSprint.id} (Tablero Kanban):`);
  const tasksRes = await fetch(`${BASE_URL}/tasks/sprint/${activeSprint.id}`, { headers: authHeaders });
  const tasks = await tasksRes.json();
  console.log('Status:', tasksRes.status);
  console.log('Tareas en Kanban:', tasks.map(t => `[${t.status}] ${t.code} - ${t.description.substring(0, 45)}... (Asignado: ${t.assignedToName || 'Sin asignar'})`));

  // 6. Generación de historia con IA
  console.log('\n6. Test POST /api/v1/stories/ai-generate (IA Generator):');
  const aiRes = await fetch(`${BASE_URL}/stories/ai-generate`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      prompt: 'Autenticación biométrica WebAuthn con huella digital para banca móvil',
      userRole: 'cliente de banca digital',
    }),
  });
  const aiData = await aiRes.json();
  console.log('Status:', aiRes.status);
  console.log('Título IA:', aiData.title);
  console.log('Formato Scrum:', aiData.userStoryFormat);
  console.log('Criterios Gherkin:', aiData.gherkinCriteria.length, 'escenarios generados');
  console.log('Puntos sugeridos:', aiData.suggestedStoryPoints, '| Prioridad:', aiData.suggestedPriority);

  // 7. Movimiento Kanban (PATCH /tasks/{id}/kanban-status)
  if (tasks.length > 0) {
    const taskToMove = tasks[0];
    console.log(`\n7.1. Intento de movimiento por Product Owner (debe retornar 403 Forbidden por RBAC):`);
    const poPatchRes = await fetch(`${BASE_URL}/tasks/${taskToMove.id}/kanban-status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status: 'TESTING' }),
    });
    console.log('Status con Product Owner (esperado 403):', poPatchRes.status);

    console.log(`\n7.2. Login con Developer (Lucas Herrera - dev1@velocity.dev):`);
    const devLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dev1@velocity.dev', password: '123456' }),
    });
    const devLoginData = await devLoginRes.json();
    console.log('Status Login Developer:', devLoginRes.status, '| Rol:', devLoginData.role);

    const devHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${devLoginData.token}`,
    };

    console.log(`\n7.3. Movimiento Kanban autorizado ejecutado por Developer:`);
    const devPatchRes = await fetch(`${BASE_URL}/tasks/${taskToMove.id}/kanban-status`, {
      method: 'PATCH',
      headers: devHeaders,
      body: JSON.stringify({ status: 'DONE' }),
    });
    const updatedTask = await devPatchRes.json();
    console.log('Status con Developer (esperado 200):', devPatchRes.status);
    console.log('Tarea actualizada a estado:', updatedTask.status);
  }

  // 8. Swagger UI accesible
  console.log('\n8. Test Swagger UI (GET /swagger-ui/index.html):');
  const swaggerRes = await fetch('http://localhost:8080/swagger-ui/index.html');
  console.log('Status Swagger UI:', swaggerRes.status);

  console.log('\n--- VERIFICACIÓN DE ENDPOINTS COMPLETADA CON ÉXITO ---');
}

testBackend().catch(err => {
  console.error('Error durante la verificación:', err);
  process.exit(1);
});
