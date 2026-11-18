# Agile Velocity - Backend API REST (Semana 2 - Sprint 2)

Servicio Backend empresarial desarrollado para el proyecto **"Gestor de tareas con metodología Scrum"**, siguiendo las especificaciones de formación técnica del SENA. Implementado con **Java 17**, **Spring Boot 3.2.5**, **PostgreSQL 15**, **Docker**, **Liquibase**, **Spring Security + JWT** y **OpenAPI / Swagger**.

---

## 1. Stack Tecnológico

| Componente | Tecnología | Versión |
| :--- | :--- | :--- |
| **Lenguaje** | Java (LTS) | 17 |
| **Framework Base** | Spring Boot | 3.2.5 |
| **Gestor de Dependencias** | Apache Maven / Maven Wrapper | 3.9+ |
| **Base de Datos Relacional** | PostgreSQL (Alpine) | 15 |
| **Control de Versiones de BD**| Liquibase Core | 4.24+ |
| **Seguridad y Tokens** | Spring Security 6 + JJWT | 0.11.5 |
| **Documentación Interactiva**| SpringDoc OpenAPI (Swagger UI) | 2.5.0 |
| **Contenedores y Orquestación**| Docker & Docker Compose | 29.8+ |

---

## 2. Puesta en Marcha de la Base de Datos con Docker

En la raíz del proyecto se encuentra el archivo `docker-compose.yml` configurado con persistencia de datos mediante volúmenes Docker.

### Iniciar el contenedor de PostgreSQL:
```bash
docker compose up -d
```

### Verificar que el contenedor esté activo:
```bash
docker ps
```
Debe visualizarse el contenedor `scrum_task_db` con la imagen `postgres:15-alpine` escuchando en el puerto `0.0.0.0:5432->5432/tcp`.

### Parámetros de Conexión:
- **Host**: `localhost`
- **Puerto**: `5432`
- **Base de Datos**: `scrum_manager_db`
- **Usuario**: `postgres`
- **Contraseña**: `password123`

---

## 3. Migraciones y Datos Semilla con Liquibase

El control de esquema se gestiona automáticamente al arrancar la aplicación mediante **Liquibase** (`hibernate.ddl-auto: validate`):

- **Master Changelog**: `src/main/resources/db/changelog/db.changelog-master.yaml`
- **Esquema Inicial (`001-initial-schema.sql`)**: Crea las tablas `users`, `projects`, `sprints`, `user_stories` y `tasks`, con sus llaves primarias, foráneas, índices de optimización y restricciones de unicidad.
- **Datos Semilla (`002-seed-data.sql`)**: Inicializa el sistema con 4 usuarios demo con contraseñas encriptadas en **BCrypt** (`123456`), un proyecto inicial (`CBA - Core Banking Auth v2`), 3 Sprints (`COMPLETED`, `ACTIVE`, `PLANNED`), historias de usuario en Backlog y Sprint, y tareas técnicas en diferentes estados del tablero Kanban.

---

## 4. Credenciales de Prueba Disponibles (Contraseña: `123456`)

| Correo Electrónico | Nombre | Rol Scrum | Perfil / Responsabilidades |
| :--- | :--- | :--- | :--- |
| `po@velocity.dev` | Mateo Ríos | `ROLE_PRODUCT_OWNER` | Gestión del Product Backlog, priorización y generación de historias con IA |
| `sm@velocity.dev` | Sofía Mendoza | `ROLE_SCRUM_MASTER` | Activación/cierre de Sprints, métricas, remoción de impedimentos |
| `dev1@velocity.dev` | Lucas Herrera | `ROLE_DEVELOPER` | Ejecución técnica, tablero Kanban y actualización de tareas |
| `admin@velocity.dev`| Elena Vance | `ROLE_ADMINISTRADOR` | Gobernanza global, administración de usuarios y configuración de proyectos |

> Todas las cuentas tienen asignada la contraseña predeterminada: **`123456`**.

---

## 5. Compilación y Ejecución del Backend

### Opción A: Ejecución Directa con Maven Wrapper
```bash
cd backend
./mvnw clean compile
./mvnw spring-boot:run
```
*(En Windows PowerShell o CMD, utilizar `mvnw.cmd spring-boot:run`)*

### Opción B: Ejecución Contenedorizada con Docker
El backend incluye un `Dockerfile` optimizado en dos etapas (multi-stage build):
```bash
cd backend
docker build -t scrum-backend .
docker run -d --name scrum_backend_app --net host -p 8080:8080 scrum-backend
```

---

## 6. Documentación Interactiva y Pruebas con Swagger UI

Una vez levantado el servidor backend en el puerto `8080`, ingresa desde tu navegador a:
👉 **[http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html)**

### Cómo probar endpoints protegidos:
1. Dirígete a la sección **`1. Autenticación y Autorización`** -> `POST /api/v1/auth/login`.
2. Haz clic en **Try it out** e ingresa las credenciales de prueba (ej. `po@velocity.dev` y contraseña `123456`).
3. Ejecuta la petición y copia el `token` JWT retornado en el cuerpo de la respuesta.
4. Sube al inicio de la página y pulsa el botón verde **Authorize** (con el candado).
5. Pega el token (o `Bearer <token>`) y haz clic en **Authorize**.
6. A partir de ese momento, todas las solicitudes enviarán la cabecera `Authorization: Bearer <token>` de forma automática.

---

## 7. Catálogo de Endpoints REST Principales

### 1. Autenticación y Autorización (`/api/v1/auth`)
- `POST /api/v1/auth/login`: Autentica credenciales y emite token JWT con 24h de validez.
- `POST /api/v1/auth/register`: Registra nuevos usuarios con rol Scrum asignado.

### 2. Gestión de Proyectos (`/api/v1/projects`)
- `GET /api/v1/projects`: Listado de proyectos con conteo de Sprints e Historias.
- `GET /api/v1/projects/{id}`: Detalle de un proyecto.
- `POST /api/v1/projects`: Creación de proyecto *(PO / ADMIN)*.
- `PUT /api/v1/projects/{id}`: Modificación de proyecto *(PO / ADMIN)*.
- `DELETE /api/v1/projects/{id}`: Eliminación de proyecto *(ADMIN)*.

### 3. Ciclos de Sprint (`/api/v1/sprints`)
- `GET /api/v1/sprints/project/{projectId}`: Listado de Sprints de un proyecto.
- `GET /api/v1/sprints/{id}`: Consulta de un Sprint y avance de puntos.
- `POST /api/v1/sprints`: Planificación de un nuevo Sprint *(SM / PO / ADMIN)*.
- `PATCH /api/v1/sprints/{id}/status`: Transición de estado (`PLANNED` -> `ACTIVE` -> `COMPLETED`) *(SM / ADMIN)*.
- `DELETE /api/v1/sprints/{id}`: Eliminación de Sprint liberando historias al Backlog.

### 4. Historias de Usuario & Backlog (`/api/v1/stories`)
- `GET /api/v1/stories/project/{projectId}`: Todas las historias del proyecto.
- `GET /api/v1/stories/project/{projectId}/product-backlog`: Historias pendientes en el Product Backlog.
- `GET /api/v1/stories/sprint/{sprintId}`: Historias comprometidas en el Sprint Backlog.
- `POST /api/v1/stories`: Crear historia de usuario con Story Points *(PO / ADMIN)*.
- `POST /api/v1/stories/ai-generate`: Generador asistido por IA que transforma requerimientos en formato canónico Scrum (`Como/Quiero/Para`), genera 3 criterios de aceptación Gherkin (`Dado/Cuando/Entonces`) y sugiere Story Points en serie Fibonacci.
- `PATCH /api/v1/stories/{id}/assign-sprint`: Asignar a Sprint o desasignar al Product Backlog.

### 5. Tareas Técnicas y Tablero Kanban (`/api/v1/tasks`)
- `GET /api/v1/tasks/sprint/{sprintId}`: Obtiene todas las tareas del Sprint para alimentar las 4 columnas del tablero Kanban.
- `GET /api/v1/tasks/story/{storyId}`: Tareas de una historia específica.
- `POST /api/v1/tasks`: Crear subtarea técnica asignada a un desarrollador.
- `PATCH /api/v1/tasks/{id}/kanban-status`: Mover tarea entre estados (`TODO`, `IN_PROGRESS`, `TESTING`, `DONE`) con sincronización automática del estado de la historia.

---

## 8. Reglas de Negocio Scrum Implementadas

1. **Unicidad de Sprint Activo**:
   Un proyecto solo puede tener un único Sprint en estado `ACTIVE` simultáneamente. La activación de un segundo sprint sin cerrar el anterior es rechazada con código `HTTP 400 Bad Request`.
2. **Cierre de Sprint y Retorno al Backlog**:
   Al transicionar un Sprint a `COMPLETED`, las historias que no fueron finalizadas (`isCompleted == false`) retornan de forma automática al Product Backlog para su futura reestimación y priorización.
3. **Sincronización Automática Historia-Tareas**:
   Cuando todas las tareas asociadas a una historia se marcan como `DONE`, la historia de usuario se marca automáticamente como `isCompleted = true`. Si una tarea regresa a otra columna, la historia vuelve a `isCompleted = false`.
4. **Control de Acceso Basado en Roles (RBAC)**:
   Protección de operaciones sensibles mediante `@PreAuthorize` garantizando que solo los roles autorizados puedan ejecutar modificaciones metodológicas.
