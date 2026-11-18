--liquibase formatted sql

--changeset sena:007-seed-users
INSERT INTO users (id, email, full_name, password_hash, role, title, created_at)
VALUES 
(1, 'po@velocity.dev', 'Mateo Ríos', '$2b$10$yjOGCHqUOXkpdhOm6KoOBOV9CxFq4YCEk7wajlWLnlYycOxIeFEp2', 'ROLE_PRODUCT_OWNER', 'Product Owner', CURRENT_TIMESTAMP),
(2, 'sm@velocity.dev', 'Sofía Mendoza', '$2b$10$yjOGCHqUOXkpdhOm6KoOBOV9CxFq4YCEk7wajlWLnlYycOxIeFEp2', 'ROLE_SCRUM_MASTER', 'Scrum Master', CURRENT_TIMESTAMP),
(3, 'dev1@velocity.dev', 'Lucas Herrera', '$2b$10$yjOGCHqUOXkpdhOm6KoOBOV9CxFq4YCEk7wajlWLnlYycOxIeFEp2', 'ROLE_DEVELOPER', 'Senior Backend Engineer', CURRENT_TIMESTAMP),
(4, 'admin@velocity.dev', 'Elena Vance', '$2b$10$yjOGCHqUOXkpdhOm6KoOBOV9CxFq4YCEk7wajlWLnlYycOxIeFEp2', 'ROLE_ADMINISTRADOR', 'Lead Systems Architect', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

--changeset sena:008-seed-projects
INSERT INTO projects (id, code, name, description, created_at)
VALUES 
(1, 'CBA', 'Core Banking Auth v2', 'Plataforma de autenticación biométrica FIDO2, MFA adaptativo y pasarela OAuth2 para banca digital.', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

SELECT setval('projects_id_seq', (SELECT MAX(id) FROM projects));

--changeset sena:009-seed-sprints
INSERT INTO sprints (id, project_id, name, goal, start_date, end_date, status, closed_at, created_at)
VALUES 
(1, 1, 'Sprint 13 — OAuth2 Core', 'Consolidar emisión de tokens JWT rotativos y revocación de sesiones.', '2026-10-15', '2026-10-29', 'COMPLETED', '2026-10-29 18:00:00+00', CURRENT_TIMESTAMP),
(2, 1, 'Sprint 14 — Biometría & FIDO2', 'Habilitar acceso por huella digital, validación WebAuthn y auditoría de intentos fallidos.', '2026-11-02', '2026-11-16', 'ACTIVE', NULL, CURRENT_TIMESTAMP),
(3, 1, 'Sprint 15 — Rate Limiting & Auditoría', 'Proteger endpoints críticos contra fuerza bruta y exportar bitácora de cumplimiento.', '2026-11-17', '2026-12-01', 'PLANNED', NULL, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

SELECT setval('sprints_id_seq', (SELECT MAX(id) FROM sprints));

--changeset sena:010-seed-user-stories
INSERT INTO user_stories (id, project_id, sprint_id, code, title, description, acceptance_criteria, priority, story_points, is_completed, created_at)
VALUES 
(1, 1, 1, 'CBA-101', 'Rotación automática de Refresh Tokens', 'Como usuario autenticado, quiero que mis tokens de sesión roten de forma transparente para mantener mi cuenta protegida.', 'Cada uso de refresh token invalida el previo. La reutilización cierra todas las sesiones activas.', 'HIGH', 8, true, CURRENT_TIMESTAMP),
(2, 1, 1, 'CBA-102', 'Endpoint de introspección OAuth2', 'Como servicio interno, quiero consultar la validez y scopes de un token activo para autorizar operaciones sensibles.', 'Responde en menos de 40 ms en caché. Retorna active=false para tokens expirados.', 'MEDIUM', 5, true, CURRENT_TIMESTAMP),
(3, 1, 2, 'CBA-103', 'Registro de credencial biométrica WebAuthn', 'Como cliente de banca móvil, quiero vincular mi huella digital o FaceID para iniciar sesión sin contraseña.', 'El servidor genera un challenge criptográfico único. La credencial queda asociada al dispositivo.', 'HIGH', 8, false, CURRENT_TIMESTAMP),
(4, 1, 2, 'CBA-104', 'Verificación MFA por código temporal TOTP', 'Como usuario empresarial, quiero confirmar transferencias mayores mediante código TOTP de 6 dígitos.', 'Soporta ventana de tolerancia de +-30s. Bloquea temporalmente tras 5 intentos erróneos.', 'HIGH', 5, false, CURRENT_TIMESTAMP),
(5, 1, 2, 'CBA-105', 'Cierre remoto de sesiones activas', 'Como usuario, quiero visualizar mis dispositivos conectados y cerrar sesiones individuales.', 'Lista navegador, SO e IP aproximada. Invalida su JWT en el siguiente request.', 'MEDIUM', 5, true, CURRENT_TIMESTAMP),
(6, 1, NULL, 'CBA-108', 'Recuperación de cuenta con llaves de respaldo', 'Como usuario que perdió su MFA, quiero utilizar un código de respaldo de un solo uso.', 'Se generan 8 códigos alfanuméricos. Cada código se quema automáticamente tras validarse.', 'MEDIUM', 5, false, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

SELECT setval('user_stories_id_seq', (SELECT MAX(id) FROM user_stories));

--changeset sena:011-seed-tasks
INSERT INTO tasks (id, user_story_id, assigned_to_id, code, description, status, created_at)
VALUES 
(1, 1, 3, 'TASK-01', 'Implementar tabla y repositorio de refresh tokens con rotación', 'DONE', CURRENT_TIMESTAMP),
(2, 2, 3, 'TASK-02', 'Exponer endpoint /oauth/introspect con validación HMAC', 'DONE', CURRENT_TIMESTAMP),
(3, 3, 3, 'TASK-03', 'Crear servicio de generación de challenge WebAuthn y almacenamiento FIDO2', 'IN_PROGRESS', CURRENT_TIMESTAMP),
(4, 3, 3, 'TASK-04', 'Integrar navigator.credentials.create() en flujo de ajustes de seguridad', 'TESTING', CURRENT_TIMESTAMP),
(5, 3, NULL, 'TASK-05', 'Agregar pruebas de revocación de credenciales biométricas', 'TODO', CURRENT_TIMESTAMP),
(6, 4, 3, 'TASK-06', 'Implementar validador RFC 6238 para códigos TOTP con contador de reintentos', 'TESTING', CURRENT_TIMESTAMP),
(7, 4, 3, 'TASK-07', 'Diseñar modal interactivo de ingreso de 6 dígitos con auto-focus', 'IN_PROGRESS', CURRENT_TIMESTAMP),
(8, 4, NULL, 'TASK-08', 'Configurar límite de 5 intentos fallidos con bloqueo temporal', 'TODO', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

SELECT setval('tasks_id_seq', (SELECT MAX(id) FROM tasks));
