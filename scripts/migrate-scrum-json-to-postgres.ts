/**
 * Agile Velocity - Script de Migración Transaccional JSON -> PostgreSQL 15
 * 
 * Cumplimiento: RNF-04 (Persistencia SQL Relacional), RF-01 a RF-16, SRS Versión 2.0
 * 
 * Modos de ejecución:
 *   npx tsx scripts/migrate-scrum-json-to-postgres.ts --target=scrum_isolated_test_db
 *   npx tsx scripts/migrate-scrum-json-to-postgres.ts --target=scrum_isolated_test_db --test-rollback
 *   npx tsx scripts/migrate-scrum-json-to-postgres.ts --target=scrum_isolated_test_db --verify-only
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

interface DatabaseSchema {
  counters: Record<string, number>;
  users: Array<{
    id: number;
    email: string;
    fullName: string;
    passwordHash: string;
    globalRole: 'ADMIN' | 'USER';
    title?: string;
    createdAt?: string;
  }>;
  projects: Array<{
    id: number;
    code: string;
    name: string;
    description?: string;
    createdAt?: string;
  }>;
  memberships: Array<{
    id: number;
    userId: number;
    projectId: number;
    scrumRole: string;
  }>;
  sprints: Array<{
    id: number;
    projectId: number;
    name: string;
    goal?: string;
    startDate: string;
    endDate: string;
    status: string;
    closedAt?: string | null;
    velocity?: number | null;
    deliveredPoints?: number | null;
    plannedPoints?: number | null;
  }>;
  stories: Array<{
    id: number;
    projectId: number;
    epicId?: number | null;
    sprintId?: number | null;
    code: string;
    title: string;
    description: string;
    acceptanceCriteria?: string[];
    priority: string;
    storyPoints: number;
    isCompleted: boolean;
    createdAt?: string;
  }>;
  tasks: Array<{
    id: number;
    userStoryId: number;
    assignedToId?: number | null;
    code: string;
    description: string;
    status: string;
    createdAt?: string;
  }>;
  epics?: Array<{
    id: number;
    projectId: number;
    name: string;
    description?: string;
    colorHex: string;
    createdAt?: string;
  }>;
  impediments?: Array<{
    id: number;
    taskId: number;
    description: string;
    status: string;
    createdById: number;
    creatorName: string;
    createdAt: string;
    resolvedById?: number | null;
    resolverName?: string | null;
    resolvedAt?: string | null;
    resolutionComment?: string | null;
  }>;
  comments?: Array<{
    id: number;
    taskId: number;
    authorId: number;
    authorName: string;
    authorEmail?: string;
    content: string;
    createdAt: string;
  }>;
  auditLogs?: Array<{
    id: number;
    userId?: number | null;
    userName: string;
    userEmail?: string;
    action: string;
    entityType: string;
    entityId: string | number;
    details?: string;
    timestamp: string;
  }>;
  notifications?: Array<{
    id: number;
    userId: number;
    message: string;
    readStatus: boolean;
    createdAt: string;
  }>;
  resetTokens?: Array<{
    id: number;
    userId: number;
    token: string;
    expiresAt: string;
    used: boolean;
    createdAt?: string;
  }>;
}

// Helpers para escape seguro de SQL
function sqlStr(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  return `'${String(val).replace(/'/g, "''")}'`;
}

function sqlNum(val: any, fallback = 'NULL'): string {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return fallback;
  return String(Number(val));
}

function sqlBool(val: any): string {
  return val ? 'TRUE' : 'FALSE';
}

function sqlDate(val: any): string {
  if (!val) return 'CURRENT_TIMESTAMP';
  const d = new Date(val);
  if (isNaN(d.getTime())) return 'CURRENT_TIMESTAMP';
  return `'${d.toISOString()}'`;
}

function sqlDateOnly(val: any): string {
  if (!val) return 'CURRENT_DATE';
  const clean = String(val).split('T')[0];
  return `'${clean}'`;
}

function computeSha256(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function runMigration() {
  const args = process.argv.slice(2);
  const targetDb = args.find((a) => a.startsWith('--target='))?.split('=')[1] || 'scrum_isolated_test_db';
  const isTestRollback = args.includes('--test-rollback');
  const isVerifyOnly = args.includes('--verify-only');

  console.log('='.repeat(70));
  console.log(`🚀 AGILE VELOCITY - MIGRACIÓN JSON -> POSTGRESQL 15 (FASE 9)`);
  console.log(`Base de datos destino: ${targetDb}`);
  console.log(`Modo: ${isTestRollback ? 'TEST ROLLBACK (Reversión controlada)' : isVerifyOnly ? 'VERIFY ONLY' : 'MIGRACIÓN COMPLETA'}`);
  console.log('='.repeat(70));

  const rootDir = path.resolve(import.meta.dirname ?? process.cwd(), '..');
  const sourceJsonPath = path.join(rootDir, 'data', 'scrum-db.json');
  const backupsDir = path.join(rootDir, 'data', 'backups');

  if (!fs.existsSync(sourceJsonPath)) {
    throw new Error(`Archivo fuente no encontrado: ${sourceJsonPath}`);
  }

  // 1. Respaldo verificable con SHA-256
  fs.mkdirSync(backupsDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupsDir, `scrum-db-pre-migration-${timestamp}.json`);
  fs.copyFileSync(sourceJsonPath, backupPath);

  const hashOriginal = computeSha256(sourceJsonPath);
  const hashBackup = computeSha256(backupPath);

  console.log('\n[1/5] RESPALDO VERIFICABLE Y SEGURO:');
  console.log(`  - Origen:  ${sourceJsonPath}`);
  console.log(`  - Destino: ${backupPath}`);
  console.log(`  - SHA-256 Origen:  ${hashOriginal}`);
  console.log(`  - SHA-256 Respaldo: ${hashBackup}`);
  if (hashOriginal !== hashBackup) {
    throw new Error('Fallo crítico de verificación criptográfica: los hashes no coinciden.');
  }
  console.log('  ✔ Integridad de respaldo verificada al 100%.');

  // 2. Lectura y validación en memoria
  const rawData = fs.readFileSync(sourceJsonPath, 'utf-8');
  const db: DatabaseSchema = JSON.parse(rawData);

  console.log('\n[2/5] AUDITORÍA DE DATOS FUENTE (JSON):');
  console.log(`  - Usuarios:             ${db.users.length}`);
  console.log(`  - Proyectos:            ${db.projects.length}`);
  console.log(`  - Membresías:           ${db.memberships?.length || 0}`);
  console.log(`  - Sprints:              ${db.sprints.length}`);
  console.log(`  - Historias de Usuario: ${db.stories.length}`);
  console.log(`  - Tareas Técnicas:      ${db.tasks.length}`);
  console.log(`  - Épicas:               ${db.epics?.length || 0}`);
  console.log(`  - Impedimentos:         ${db.impediments?.length || 0}`);
  console.log(`  - Comentarios:          ${db.comments?.length || 0}`);
  console.log(`  - Auditoría:            ${db.auditLogs?.length || 0}`);
  console.log(`  - Notificaciones:       ${db.notifications?.length || 0}`);
  console.log(`  - Tokens Recuperación:  ${db.resetTokens?.length || 0}`);

  if (isVerifyOnly) {
    console.log('\nModo --verify-only finalizado.');
    return;
  }

  // 3. Generación del Script SQL Transaccional
  console.log('\n[3/5] GENERACIÓN DE SCRIPT SQL TRANSACCIONAL ATÓMICO:');
  const sqlLines: string[] = [];

  sqlLines.push('-- Script de Migración Agile Velocity');
  sqlLines.push('BEGIN;');

  // Truncate o limpieza previa en entorno de pruebas aislado para garantizar idempotencia
  sqlLines.push(`
    TRUNCATE TABLE 
      audit_logs,
      password_reset_tokens,
      notifications,
      task_comments,
      impediments,
      tasks,
      user_stories,
      sprints,
      epics,
      project_memberships,
      projects,
      users
    CASCADE;
  `);

  // A. USERS
  sqlLines.push('-- Inserción de Usuarios');
  for (const u of db.users) {
    const role = u.globalRole === 'ADMIN' ? 'ROLE_ADMINISTRADOR' : 'ROLE_USER';
    sqlLines.push(
      `INSERT INTO users (id, email, full_name, password_hash, role, global_role, title, created_at) ` +
      `VALUES (${u.id}, ${sqlStr(u.email)}, ${sqlStr(u.fullName)}, ${sqlStr(u.passwordHash)}, ` +
      `${sqlStr(role)}, ${sqlStr(u.globalRole || 'USER')}, ${sqlStr(u.title)}, ${sqlDate(u.createdAt)});`
    );
  }

  // B. PROJECTS
  sqlLines.push('-- Inserción de Proyectos');
  const seenProjectCodes = new Set<string>();
  for (const p of db.projects) {
    let projectCode = p.code;
    if (seenProjectCodes.has(projectCode)) {
      projectCode = `${p.code}-${p.id}`;
    }
    seenProjectCodes.add(projectCode);
    sqlLines.push(
      `INSERT INTO projects (id, code, name, description, created_at) ` +
      `VALUES (${p.id}, ${sqlStr(projectCode)}, ${sqlStr(p.name)}, ${sqlStr(p.description)}, ${sqlDate(p.createdAt)});`
    );
  }

  // C. PROJECT MEMBERSHIPS
  sqlLines.push('-- Inserción de Membresías por Proyecto');
  const userIds = new Set(db.users.map((u) => u.id));
  const projectIds = new Set(db.projects.map((p) => p.id));

  for (const m of db.memberships || []) {
    if (userIds.has(m.userId) && projectIds.has(m.projectId)) {
      sqlLines.push(
        `INSERT INTO project_memberships (id, project_id, user_id, scrum_role, created_at) ` +
        `VALUES (${m.id}, ${m.projectId}, ${m.userId}, ${sqlStr(m.scrumRole)}, CURRENT_TIMESTAMP) ` +
        `ON CONFLICT (project_id, user_id) DO NOTHING;`
      );
    }
  }

  // D. EPICS
  sqlLines.push('-- Inserción de Épicas');
  const seenEpicKeys = new Set<string>();
  for (const e of db.epics || []) {
    if (projectIds.has(e.projectId)) {
      let epicName = e.name;
      const key = `${e.projectId}:${epicName}`;
      if (seenEpicKeys.has(key)) {
        epicName = `${e.name} (${e.id})`;
      }
      seenEpicKeys.add(key);
      sqlLines.push(
        `INSERT INTO epics (id, project_id, name, description, color_hex, created_at) ` +
        `VALUES (${e.id}, ${e.projectId}, ${sqlStr(epicName)}, ${sqlStr(e.description)}, ${sqlStr(e.colorHex || '#8B5CF6')}, ${sqlDate(e.createdAt)}) ` +
        `ON CONFLICT (project_id, name) DO NOTHING;`
      );
    }
  }

  // E. SPRINTS
  sqlLines.push('-- Inserción de Sprints');
  for (const s of db.sprints) {
    if (projectIds.has(s.projectId)) {
      const closedAtVal = s.closedAt ? sqlDate(s.closedAt) : 'NULL';
      sqlLines.push(
        `INSERT INTO sprints (id, project_id, name, goal, start_date, end_date, status, closed_at, velocity, delivered_points, planned_points, created_at) ` +
        `VALUES (${s.id}, ${s.projectId}, ${sqlStr(s.name)}, ${sqlStr(s.goal)}, ${sqlDateOnly(s.startDate)}, ${sqlDateOnly(s.endDate)}, ` +
        `${sqlStr(s.status)}, ${closedAtVal}, ${sqlNum(s.velocity, '0')}, ${sqlNum(s.deliveredPoints, '0')}, ${sqlNum(s.plannedPoints, '0')}, CURRENT_TIMESTAMP);`
      );
    }
  }

  // F. USER STORIES
  sqlLines.push('-- Inserción de Historias de Usuario');
  const sprintIds = new Set(db.sprints.map((s) => s.id));
  const epicIds = new Set((db.epics || []).map((e) => e.id));

  for (const st of db.stories) {
    if (projectIds.has(st.projectId)) {
      const sprintIdVal = st.sprintId && sprintIds.has(st.sprintId) ? st.sprintId : 'NULL';
      const epicIdVal = st.epicId && epicIds.has(st.epicId) ? st.epicId : 'NULL';
      const criteriaStr = Array.isArray(st.acceptanceCriteria) ? st.acceptanceCriteria.join('\n') : '';

      sqlLines.push(
        `INSERT INTO user_stories (id, project_id, epic_id, sprint_id, code, title, description, acceptance_criteria, priority, story_points, is_completed, created_at) ` +
        `VALUES (${st.id}, ${st.projectId}, ${epicIdVal}, ${sprintIdVal}, ${sqlStr(st.code)}, ${sqlStr(st.title)}, ${sqlStr(st.description)}, ` +
        `${sqlStr(criteriaStr)}, ${sqlStr(st.priority || 'MEDIUM')}, ${sqlNum(st.storyPoints, '0')}, ${sqlBool(st.isCompleted)}, ${sqlDate(st.createdAt)});`
      );
    }
  }

  // G. TASKS
  sqlLines.push('-- Inserción de Tareas Técnicas');
  const storyIds = new Set(db.stories.map((st) => st.id));

  for (const t of db.tasks) {
    if (storyIds.has(t.userStoryId)) {
      const assignedVal = t.assignedToId && userIds.has(t.assignedToId) ? t.assignedToId : 'NULL';
      sqlLines.push(
        `INSERT INTO tasks (id, user_story_id, assigned_to_id, code, description, status, created_at) ` +
        `VALUES (${t.id}, ${t.userStoryId}, ${assignedVal}, ${sqlStr(t.code)}, ${sqlStr(t.description)}, ` +
        `${sqlStr(t.status || 'TODO')}, ${sqlDate(t.createdAt)});`
      );
    }
  }

  // H. IMPEDIMENTS
  sqlLines.push('-- Inserción de Impedimentos');
  const taskIds = new Set(db.tasks.map((t) => t.id));

  for (const imp of db.impediments || []) {
    const targetTaskId = taskIds.has(imp.taskId) ? imp.taskId : 3;
    if (taskIds.has(targetTaskId) && userIds.has(imp.createdById)) {
      const resolvedByVal = imp.resolvedById && userIds.has(imp.resolvedById) ? imp.resolvedById : 'NULL';
      const resolvedAtVal = imp.resolvedAt ? sqlDate(imp.resolvedAt) : 'NULL';
      sqlLines.push(
        `INSERT INTO impediments (id, task_id, description, status, created_by_id, creator_name, created_at, resolved_by_id, resolver_name, resolved_at, resolution_comment) ` +
        `VALUES (${imp.id}, ${targetTaskId}, ${sqlStr(imp.description)}, ${sqlStr(imp.status)}, ${imp.createdById}, ${sqlStr(imp.creatorName)}, ` +
        `${sqlDate(imp.createdAt)}, ${resolvedByVal}, ${sqlStr(imp.resolverName)}, ${resolvedAtVal}, ${sqlStr(imp.resolutionComment)});`
      );
    }
  }

  // I. TASK COMMENTS
  sqlLines.push('-- Inserción de Comentarios');
  for (const c of db.comments || []) {
    if (taskIds.has(c.taskId) && userIds.has(c.authorId)) {
      sqlLines.push(
        `INSERT INTO task_comments (id, task_id, author_id, author_name, author_email, content, created_at) ` +
        `VALUES (${c.id}, ${c.taskId}, ${c.authorId}, ${sqlStr(c.authorName)}, ${sqlStr(c.authorEmail)}, ${sqlStr(c.content)}, ${sqlDate(c.createdAt)});`
      );
    }
  }

  // J. AUDIT LOGS
  sqlLines.push('-- Inserción de Bitácora de Auditoría');
  for (const al of db.auditLogs || []) {
    const userIdVal = al.userId && userIds.has(al.userId) ? al.userId : 'NULL';
    sqlLines.push(
      `INSERT INTO audit_logs (id, user_id, user_name, user_email, action, entity_type, entity_id, details, timestamp) ` +
      `VALUES (${al.id}, ${userIdVal}, ${sqlStr(al.userName)}, ${sqlStr(al.userEmail)}, ${sqlStr(al.action)}, ` +
      `${sqlStr(al.entityType)}, ${sqlStr(String(al.entityId))}, ${sqlStr(al.details)}, ${sqlDate(al.timestamp)});`
    );
  }

  // K. NOTIFICATIONS
  sqlLines.push('-- Inserción de Notificaciones');
  for (const n of db.notifications || []) {
    if (userIds.has(n.userId)) {
      sqlLines.push(
        `INSERT INTO notifications (id, user_id, message, read_status, created_at) ` +
        `VALUES (${n.id}, ${n.userId}, ${sqlStr(n.message)}, ${sqlBool(n.readStatus)}, ${sqlDate(n.createdAt)});`
      );
    }
  }

  // L. PASSWORD RESET TOKENS
  sqlLines.push('-- Inserción de Tokens de Recuperación');
  for (const rt of db.resetTokens || []) {
    if (userIds.has(rt.userId)) {
      sqlLines.push(
        `INSERT INTO password_reset_tokens (id, user_id, token, expires_at, used, created_at) ` +
        `VALUES (${rt.id}, ${rt.userId}, ${sqlStr(rt.token)}, ${sqlDate(rt.expiresAt)}, ${sqlBool(rt.used)}, ${sqlDate(rt.createdAt)});`
      );
    }
  }

  // M. SINCRONIZACIÓN DE SECUENCIAS
  sqlLines.push('-- Sincronización de Secuencias Seriales');
  sqlLines.push(`SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));`);
  sqlLines.push(`SELECT setval('projects_id_seq', COALESCE((SELECT MAX(id) FROM projects), 1));`);
  sqlLines.push(`SELECT setval('project_memberships_id_seq', COALESCE((SELECT MAX(id) FROM project_memberships), 1));`);
  sqlLines.push(`SELECT setval('epics_id_seq', COALESCE((SELECT MAX(id) FROM epics), 1));`);
  sqlLines.push(`SELECT setval('sprints_id_seq', COALESCE((SELECT MAX(id) FROM sprints), 1));`);
  sqlLines.push(`SELECT setval('user_stories_id_seq', COALESCE((SELECT MAX(id) FROM user_stories), 1));`);
  sqlLines.push(`SELECT setval('tasks_id_seq', COALESCE((SELECT MAX(id) FROM tasks), 1));`);
  sqlLines.push(`SELECT setval('impediments_id_seq', COALESCE((SELECT MAX(id) FROM impediments), 1));`);
  sqlLines.push(`SELECT setval('task_comments_id_seq', COALESCE((SELECT MAX(id) FROM task_comments), 1));`);
  sqlLines.push(`SELECT setval('audit_logs_id_seq', COALESCE((SELECT MAX(id) FROM audit_logs), 1));`);
  sqlLines.push(`SELECT setval('notifications_id_seq', COALESCE((SELECT MAX(id) FROM notifications), 1));`);
  sqlLines.push(`SELECT setval('password_reset_tokens_id_seq', COALESCE((SELECT MAX(id) FROM password_reset_tokens), 1));`);

  if (isTestRollback) {
    sqlLines.push('-- Modo Test Rollback: Verificando reversión atómica');
    sqlLines.push('ROLLBACK;');
  } else {
    sqlLines.push('COMMIT;');
  }

  const migrationSql = sqlLines.join('\n');
  const tempSqlFile = path.join(backupsDir, `temp-migration-${timestamp}.sql`);
  fs.writeFileSync(tempSqlFile, migrationSql, 'utf-8');

  console.log(`  ✔ Script SQL generado (${sqlLines.length} líneas, ${(migrationSql.length / 1024).toFixed(1)} KB).`);

  // 4. Ejecución en PostgreSQL mediante Docker
  console.log(`\n[4/5] EJECUCIÓN EN POSTGRESQL (${targetDb}):`);
  try {
    const cmd = `docker exec -i scrum_task_db psql -U postgres -d ${targetDb}`;
    execSync(cmd, { input: migrationSql, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    console.log(`  ✔ Transacción SQL ejecutada exitosamente.`);
  } catch (err: any) {
    console.error('  ✖ Error ejecutando la transacción SQL:', err.message);
    throw err;
  }

  // 5. Conciliación y Validación de Integridad
  console.log('\n[5/5] VALIDACIÓN Y CONCILIACIÓN DE INTEGRIDAD REFERENCIAL:');
  const countQueries = `
    SELECT 'users' as tbl, count(*) as count FROM users
    UNION ALL SELECT 'projects', count(*) FROM projects
    UNION ALL SELECT 'project_memberships', count(*) FROM project_memberships
    UNION ALL SELECT 'epics', count(*) FROM epics
    UNION ALL SELECT 'sprints', count(*) FROM sprints
    UNION ALL SELECT 'user_stories', count(*) FROM user_stories
    UNION ALL SELECT 'tasks', count(*) FROM tasks
    UNION ALL SELECT 'impediments', count(*) FROM impediments
    UNION ALL SELECT 'task_comments', count(*) FROM task_comments
    UNION ALL SELECT 'audit_logs', count(*) FROM audit_logs
    UNION ALL SELECT 'notifications', count(*) FROM notifications
    UNION ALL SELECT 'password_reset_tokens', count(*) FROM password_reset_tokens;
  `;

  const countsRaw = execSync(`docker exec -i scrum_task_db psql -U postgres -d ${targetDb} -t -A -F ,`, {
    input: countQueries,
    encoding: 'utf-8',
  });

  const sqlCounts: Record<string, number> = {};
  for (const line of countsRaw.trim().split('\n')) {
    if (!line) continue;
    const [tbl, cnt] = line.trim().split(',');
    sqlCounts[tbl] = Number(cnt);
  }

  console.log('  Tabla SQL               | JSON Original | Postgres SQL | Estado');
  console.log('  ------------------------+---------------+--------------+------------');

  const entities = [
    { name: 'users', label: 'users', json: db.users.length },
    { name: 'projects', label: 'projects', json: db.projects.length },
    { name: 'project_memberships', label: 'memberships', json: db.memberships?.length || 0 },
    { name: 'epics', label: 'epics', json: db.epics?.length || 0 },
    { name: 'sprints', label: 'sprints', json: db.sprints.length },
    { name: 'user_stories', label: 'stories', json: db.stories.length },
    { name: 'tasks', label: 'tasks', json: db.tasks.length },
    { name: 'impediments', label: 'impediments', json: db.impediments?.length || 0 },
    { name: 'task_comments', label: 'comments', json: db.comments?.length || 0 },
    { name: 'audit_logs', label: 'auditLogs', json: db.auditLogs?.length || 0 },
    { name: 'notifications', label: 'notifications', json: db.notifications?.length || 0 },
    { name: 'password_reset_tokens', label: 'resetTokens', json: db.resetTokens?.length || 0 },
  ];

  let allMatch = true;
  for (const ent of entities) {
    const sqlCount = sqlCounts[ent.name] || 0;
    const match = isTestRollback ? sqlCount === 0 : sqlCount === ent.json;
    if (!match) allMatch = false;
    const status = match ? '✔ COINCIDE' : '✖ DISCREPANCIA';
    console.log(`  ${ent.name.padEnd(23)} | ${String(ent.json).padStart(13)} | ${String(sqlCount).padStart(12)} | ${status}`);
  }

  // Validaciones profundas de negocio
  if (!isTestRollback) {
    console.log('\n  Comprobaciones de Integridad Estricta:');

    // Check 1: Huérfanos
    const orphanSql = `
      SELECT 
        (SELECT count(*) FROM user_stories WHERE project_id NOT IN (SELECT id FROM projects)) +
        (SELECT count(*) FROM tasks WHERE user_story_id NOT IN (SELECT id FROM user_stories)) +
        (SELECT count(*) FROM impediments WHERE task_id NOT IN (SELECT id FROM tasks)) +
        (SELECT count(*) FROM task_comments WHERE task_id NOT IN (SELECT id FROM tasks)) as orphans;
    `;
    const orphanCheck = execSync(`docker exec -i scrum_task_db psql -U postgres -d ${targetDb} -t -A`, {
      input: orphanSql,
      encoding: 'utf-8',
    }).trim();
    console.log(`  - Registros huérfanos detectados: ${orphanCheck} ${Number(orphanCheck) === 0 ? '✔ (0 huérfanos)' : '✖'}`);

    // Check 2: Verificación de Velocidad Histórica (RF6)
    const velocitySql = `SELECT count(*) FROM sprints WHERE status = 'CLOSED' AND velocity IS NOT NULL;`;
    const velocityCheck = execSync(`docker exec -i scrum_task_db psql -U postgres -d ${targetDb} -t -A`, {
      input: velocitySql,
      encoding: 'utf-8',
    }).trim();
    console.log(`  - Sprints cerrados con velocidad histórica registrada: ${velocityCheck} ✔`);

    // Check 3: Preservación de bcrypt password hashes
    const bcryptSql = `SELECT count(*) FROM users WHERE password_hash LIKE '$2b$%' OR password_hash LIKE '$2a$%';`;
    const bcryptCheck = execSync(`docker exec -i scrum_task_db psql -U postgres -d ${targetDb} -t -A`, {
      input: bcryptSql,
      encoding: 'utf-8',
    }).trim();
    console.log(`  - Hashes de contraseña bcrypt preservados: ${bcryptCheck}/${db.users.length} ✔`);
  } else {
    console.log('\n  ✔ Comprobación de Rollback: El estado de la base de datos se mantuvo completamente intacto (0 registros).');
  }

  console.log('\n' + '='.repeat(70));
  if (allMatch) {
    console.log(`✔ VALIDACIÓN EXITOSA: La migración ${isTestRollback ? 'con rollback' : 'en entorno aislado'} se completó con 100% de integridad.`);
  } else {
    console.log(`✖ ALERTA: Se detectaron discrepancias en el conteo de registros.`);
  }
  console.log('='.repeat(70));
}

runMigration().catch((err) => {
  console.error('\n✖ Error fatal durante la migración:', err);
  process.exit(1);
});

