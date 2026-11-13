# Documento de Requisitos Técnicos (TRD)
## Gestor de Tareas con Metodología Scrum y Asistencia IA

---

### 1. Stack Tecnológico y Arquitectura de Software
#### 1.1 Estilo Arquitectónico
Monolito Modular en Capas (*Layered Modular Architecture*) con orientación por dominios funcionales, desacoplado de una Single Page Application (SPA).
* **Capa de Presentación (Frontend):** React 18+ empaquetado con Vite y estilizado mediante Tailwind CSS.
* **Capa de Controladores (Backend REST):** Spring Boot 3+ (Java 17) exponiendo contratos HTTP RESTful estrictamente serializados en JSON.
* **Capa de Aplicación y Servicios:** Servicios de negocio organizados por dominio (`auth`, `project`, `backlog`, `sprint`, `task`, `ai`, `notification`).
* **Capa de Persistencia:** Spring Data JPA / Hibernate interactuando con PostgreSQL 15+.

```
+--------------------------------------------------------------+
|                    React SPA (Vite + Tailwind)               |
|            [DnD-Kit]   [TanStack Query]   [React Router]      |
+------------------------------+-------------------------------+
                               | (HTTPS / JSON + Bearer JWT)
                               v
+--------------------------------------------------------------+
|                  Spring Boot API (Java 17)                   |
|  +--------------------------------------------------------+  |
|  | Controller Layer (@RestController, Bean Validation)    |  |
|  +--------------------------------------------------------+  |
|  | Service Layer (@Service, @Transactional, Business Rules)|  |
|  +--------------------------------------------------------+  |
|  | Repository Layer (Spring Data JPA, Hibernate)          |  |
|  +--------------------------------------------------------+  |
+---------------+------------------------------+---------------+
                |                              |
                v                              v
    +-----------------------+      +-----------------------+
    |  PostgreSQL 15 (DB)   |      |  External LLM API     |
    |  (Liquibase Migr.)    |      |  (Gemini / OpenAI)    |
    +-----------------------+      +-----------------------+
```

#### 1.2 Librerías de Soporte Específicas
* **Frontend:**
  * `@dnd-kit/core`, `@dnd-kit/sortable`: Gestión accesible y optimizada de Drag & Drop para el tablero Kanban.
  * `@tanstack/react-query`: Caché en cliente, invalidación reactiva de queries y mutaciones optimistas.
  * `react-router-dom`: Enrutamiento y protección de rutas mediante guards.
  * `lucide-react`: Iconografía SVG ligera.
* **Backend:**
  * `spring-boot-starter-security`: Filtros de autenticación y autorización RBAC.
  * `jjwt-api`, `jjwt-impl`, `jjwt-jackson`: Generación y parseo criptográfico de tokens JWT (HMAC-SHA256).
  * `spring-boot-starter-validation`: Bean Validation (`jakarta.validation`).
  * `liquibase-core`: Control de versiones y migraciones de esquemas DDL en PostgreSQL.
  * `spring-boot-starter-mail`: Despacho SMTP de recuperación de acceso.
  * `spring-boot-starter-actuator`: Endpoints de salud operacional y métricas base.

---

### 2. Modelo de Datos y Persistencia (ERD y DDL)
Motor de base de datos: **PostgreSQL 15+** ejecutado en contenedor Docker estandarizado.

```
                      +-------------------+
                      |       users       |
                      +-------------------+
                      | PK  id            |
                      |     email (UQ)    |
                      |     password_hash |
                      |     full_name     |
                      |     global_role   |
                      +---------+---------+
                                |
             +------------------+------------------+
             | 1..*                                | 1..*
+------------v------------+           +------------v------------+
|   project_memberships   |           |  password_reset_tokens  |
+-------------------------+           +-------------------------+
| PK  id                  |           | PK  id                  |
| FK  user_id             |           | FK  user_id             |
| FK  project_id          |           |     token (UQ)          |
|     scrum_role          |           |     expires_at          |
+------------+------------+           |     used                |
             | *..1                   +-------------------------+
+------------v------------+
|        projects         |
+-------------------------+
| PK  id                  |
|     name                |
|     description         |
|     created_at          |
+------------+------------+
             | 1..*
             +-------------------------------------+
             |                                     |
+------------v------------+           +------------v------------+
|         sprints         |           |      user_stories       |
+-------------------------+           +-------------------------+
| PK  id                  |           | PK  id                  |
| FK  project_id          |           | FK  project_id          |
|     name                |           | FK  sprint_id (nullable)|
|     goal                |           |     title               |
|     start_date          |           |     description         |
|     end_date            |           |     acceptance_criteria |
|     status (PLN/ACT/CLS)|           |     priority (H/M/L)    |
+------------+------------+           |     story_points        |
             | 0..1                   |     is_completed        |
             |                        +------------+------------+
             +------------------+                  | 1..*
                                | 0..*             |
                                +-------+  +-------+
                                        |  |
                               +--------v--v--------+
                               |       tasks        |
                               +--------------------+
                               | PK  id             |
                               | FK  user_story_id  |
                               | FK  assigned_to_id |
                               |     description    |
                               |     status (KANBAN)|
                               |     created_at     |
                               +--------------------+
```

#### 2.1 Tablas y Restricciones Principales
* `users`: `id` (UUID/BIGSERIAL PK), `email` (VARCHAR(150), UNIQUE, NOT NULL), `password_hash` (VARCHAR(255), NOT NULL), `full_name` (VARCHAR(120)), `global_role` (VARCHAR(20)).
* `projects`: `id` (BIGSERIAL PK), `name` (VARCHAR(100), NOT NULL), `description` (TEXT), `created_at` (TIMESTAMP NOT NULL).
* `project_memberships`: `id` (BIGSERIAL PK), `user_id` (FK), `project_id` (FK), `scrum_role` (VARCHAR(20), NOT NULL: `PRODUCT_OWNER`, `SCRUM_MASTER`, `DEVELOPER`).
  * *Constraint de unicidad:* `UNIQUE(user_id, project_id)`.
* `sprints`: `id` (BIGSERIAL PK), `project_id` (FK), `name` (VARCHAR(100), NOT NULL), `goal` (TEXT), `start_date` (DATE NOT NULL), `end_date` (DATE NOT NULL), `status` (VARCHAR(20) NOT NULL: `PLANNING`, `ACTIVE`, `CLOSED`).
  * *Constraint de fechas:* `CHECK (end_date > start_date)`.
* `user_stories`: `id` (BIGSERIAL PK), `project_id` (FK), `sprint_id` (FK, NULLABLE), `title` (VARCHAR(200), NOT NULL), `description` (TEXT), `acceptance_criteria` (TEXT), `priority` (VARCHAR(10), NOT NULL: `HIGH`, `MEDIUM`, `LOW`), `story_points` (INT DEFAULT 0), `is_completed` (BOOLEAN DEFAULT FALSE).
  * *Constraint de estimación:* `CHECK (story_points >= 0)`.
* `tasks`: `id` (BIGSERIAL PK), `user_story_id` (FK NOT NULL), `assigned_to_id` (FK, NULLABLE), `description` (TEXT NOT NULL), `status` (VARCHAR(20) NOT NULL: `TODO`, `IN_PROGRESS`, `TESTING`, `DONE`), `created_at` (TIMESTAMP NOT NULL).
* `notifications`: `id` (BIGSERIAL PK), `user_id` (FK NOT NULL), `message` (VARCHAR(255) NOT NULL), `read_status` (BOOLEAN DEFAULT FALSE), `created_at` (TIMESTAMP NOT NULL).
* `password_reset_tokens`: `id` (BIGSERIAL PK), `user_id` (FK NOT NULL), `token` (VARCHAR(100) UNIQUE NOT NULL), `expires_at` (TIMESTAMP NOT NULL), `used` (BOOLEAN DEFAULT FALSE).

#### 2.2 Estrategia de Migraciones
Implementación con **Liquibase Community** mediante archivos SQL changelogs versionados estructurados jerárquicamente en `src/main/resources/db/changelog/`.
* Formato: SQL nativo estructurado con tags `--changeset author:id`.
* Ejecución automática vinculada al ciclo de arranque de Spring Boot (`spring.liquibase.enabled=true`).

---

### 3. Seguridad e Integración de Servicios Externos
#### 3.1 Esquema de Autenticación y Autorización
* **Filtro de Seguridad:** `JwtAuthenticationFilter` intercepta cada petición HTTP inspeccionando la cabecera `Authorization: Bearer <token>`.
* **Cifrado de Contraseñas:** `BCryptPasswordEncoder` configurado con fuerza $10$.
* **Expiración de Tokens:** 24 horas continuas ($86,400,000$ ms).
* **Control de Acceso:** Uso de anotaciones `@PreAuthorize` en endpoints del controlador para validar roles globales y verificación mediante servicios de autorización para roles de proyecto (`@PreAuthorize("@projectSecurity.hasRole(#projectId, 'SCRUM_MASTER')")`).

#### 3.2 Integración con Proveedor LLM
* **Consumo:** Despachado estrictamente desde el backend mediante `RestClient` / `WebClient` hacia la API REST del proveedor seleccionado (Google Gemini API / OpenAI API).
* **Esquema de Payload de Solicitud:**
  * Enrutamiento interno: `POST /api/v1/ai/generate-story`.
  * Parámetros: `{ "prompt": "string con longitud >= 5" }`.
* **Manejo Estricto del Esquema de Respuesta:**
  El prompt del sistema instruye al modelo a responder con un objeto JSON plano sin delimitadores Markdown:
  ```json
  {
    "role": "string",
    "action": "string",
    "benefit": "string",
    "acceptanceCriteria": ["criterio 1", "criterio 2"]
  }
  ```
  La deserialización se procesa con `ObjectMapper` de Jackson directamente a un DTO de respuesta. Ante falla de esquema o timeout de 8 segundos, el servicio lanza un `AiIntegrationException` controlado devuelto como HTTP 503/504 con payload normalizado.

#### 3.3 Gestión de Secretos y Variables de Entorno
* **Inyección Local:** Archivo `.env` en la raíz (ignorado explícitamente en `.gitignore`).
* **Mapeo a Spring Boot:** `application.yml` parametrizado con referencias al sistema:
  * `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`
  * `JWT_SECRET` (mínimo 256 bits para HMAC-SHA256)
  * `AI_PROVIDER_API_KEY`
  * `SPRING_MAIL_HOST`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD`

---

### 4. Estrategia de Pruebas y Validación de Datos
#### 4.1 Cobertura y Herramientas
* **Pruebas Unitarias:** JUnit 5 y Mockito para aislar servicios (`ProjectServiceTest`, `SprintServiceTest`, `AiServiceTest`).
* **Pruebas de Integración y API REST:** `@SpringBootTest` junto con `MockMvc` para validar:
  * Manejo adecuado de códigos HTTP de respuesta (200, 201, 400, 401, 403, 404, 409).
  * Validación del filtro de seguridad y autorización RBAC ante tokens válidos y expirados.

#### 4.2 Validación de Datos
* **Bean Validation (`jakarta.validation`):**
  * Uso de anotaciones `@NotBlank`, `@Size`, `@Email`, `@Min`, `@NotNull` en DTOs de entrada.
  * Captura centralizada de errores de validación mediante `@RestControllerAdvice` retornando una estructura estándar:
    ```json
    {
      "timestamp": "2026-11-11T22:34:00Z",
      "status": 400,
      "error": "Bad Request",
      "errors": [
        {"field": "email", "message": "El correo electrónico no es válido"}
      ]
    }
    ```

---

### 5. Operaciones, DevOps y Observabilidad
#### 5.1 Entornos de Ejecución
* **Entorno de Desarrollo y Demostración:** Orquestación total mediante `docker-compose.yml`:
  * Servicio `db`: Contenedor `postgres:15-alpine` con volumen mapeado para persistencia de datos.
  * Servicio `backend`: Contenedor generado por Dockerfile multi-stage con OpenJDK 17.
  * Servicio `frontend`: Contenedor Nginx sirviendo la compilación estática de Vite.
* **Entorno de Producción / Staging:** Despliegue en PaaS simplificado (Railway o Render) enlazado al repositorio Git para integración continua.

#### 5.2 Observabilidad
* **Logging Estructurado:** SLF4J / Logback con niveles configurados:
  * `INFO` para eventos del ciclo de vida y auditoría transaccional de Sprints.
  * `WARN` para reintentos o timeouts del servicio de IA.
  * `ERROR` para excepciones no controladas capturadas por el Handler global.
* **Health Checks y Métricas:** Spring Boot Actuator configurado con exposición protegida en `/actuator/health` y `/actuator/metrics`.