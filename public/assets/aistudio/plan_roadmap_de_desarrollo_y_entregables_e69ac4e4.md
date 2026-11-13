# Plan de Desarrollo y Hoja de Ruta (Roadmap)
## Gestor de Tareas con Metodología Scrum y Asistencia IA

---

### 1. Estrategia de Priorización y Alcance

#### Fase 1: MVP (Producto Mínimo Viable)
Entrega del flujo de valor central de extremo a extremo:
* Autenticación básica JWT y control de acceso RBAC.
* Gestión de proyectos y membresías de equipo.
* Product Backlog completo con estimación en Story Points.
* Asistente IA funcional para generación y refinamiento de historias (timeout 8s).
* Planificación, activación y cierre de Sprints (regla de un único Sprint activo).
* Tablero Kanban drag-and-drop con persistencia inferior a 500 ms y transición automática de historias a `Done`.

#### Fase 2: Mejoras Operativas y Experiencia de Usuario
* Módulo de recuperación de contraseña vía SMTP con tokens temporales.
* Sistema interno de notificaciones para asignación de tareas técnicas.
* Filtros avanzados en el Kanban por responsable («Mis tareas») y prioridad.
* Resumen transaccional y métricas básicas de Story Points completados vs. planificados.

#### Fase 3: Escala, Optimización e Integraciones Futuras
* Reportes visuales avanzados y gráficas de velocidad.
* Gráficos Burndown en tiempo real.
* Conectores con repositorios de control de versiones (GitHub / GitLab APIs).
* Refinamiento avanzado de prompts y soporte multi-modelo para IA.

---

### 2. Estructura de Hitos Secuenciales (Enfoque End-to-End)

El desarrollo del MVP se estructura en 8 hitos incrementales. Cada hito entrega una funcionalidad completa (*Front-to-Back*) lista para ser validada antes de iniciar la siguiente.

```
[Hito 1: Setup] ---> [Hito 2: Auth] ---> [Hito 3: Proyectos] ---> [Hito 4: Backlog]
                                                                          |
[Hito 8: Cierre MVP] <-- [Hito 7: Asistente IA] <-- [Hito 6: Kanban] <-- [Hito 5: Sprints]
```

#### Hito 1: Configuración de Infraestructura y Setup Base
* **Objetivo:** Disponer del entorno de desarrollo unificado y contenerizado.
* **Tareas Atómicas:**
  * Configurar `docker-compose.yml` con servicio PostgreSQL 15 y volumen persistente.
  * Inicializar proyecto Spring Boot con dependencias JPA, Web, Security, Liquibase y Validation.
  * Configurar estructura inicial de Liquibase changelog (`master.xml` o `.sql`).
  * Inicializar proyecto React con Vite, Tailwind CSS y cliente HTTP centralizado.
  * Verificar compilación limpia y arranque conjunto de la infraestructura.

#### Hito 2: Autenticación, Usuarios y Permisos RBAC
* **Objetivo:** Asegurar la plataforma con control de acceso basado en tokens y roles.
* **Tareas Atómicas:**
  * Crear migración Liquibase para tabla `users`.
  * Implementar entidad `User`, repositorio JPA y encriptación de contraseña con `BCryptPasswordEncoder`.
  * Desarrollar `JwtTokenProvider` y `JwtAuthenticationFilter`.
  * Implementar endpoint de Login (`POST /api/v1/auth/login`) y validación de credenciales.
  * Construir vista de Login en React, almacenamiento del token en contexto seguro y redirección condicionada.
  * Configurar pruebas unitarias con JUnit 5 y de endpoints con `MockMvc`.

#### Hito 3: Gestión de Proyectos y Membresías
* **Objetivo:** Habilitar la creación de proyectos y la asignación de roles Scrum a los usuarios.
* **Tareas Atómicas:**
  * Crear migración Liquibase para tablas `projects` y `project_memberships`.
  * Desarrollar entidades `Project`, `ProjectMembership` y repositorios correspondientes.
  * Implementar endpoints CRUD de proyectos y asignación de membresías con validación RBAC (`@PreAuthorize`).
  * Construir Dashboard de proyectos en React con filtrado por usuario logueado.
  * Implementar modal de creación de proyectos para rol Administrador.

#### Hito 4: Product Backlog y Estimación
* **Objetivo:** Permitir la creación, priorización y dimensionamiento de historias de usuario.
* **Tareas Atómicas:**
  * Crear migración Liquibase para tabla `user_stories`.
  * Implementar entidad `UserStory`, enumeraciones de prioridad y repositorio.
  * Crear endpoints REST para CRUD y priorización de historias en el backlog.
  * Construir vista de Product Backlog en React con listado de historias y badges de prioridad/puntos.
  * Implementar modal de «Nueva Historia» con validación de campos obligatorios.

#### Hito 5: Planificación y Activación de Sprints
* **Objetivo:** Gestionar ciclos de trabajo y el traslado de historias al Sprint Backlog.
* **Tareas Atómicas:**
  * Crear migración Liquibase para tabla `sprints`.
  * Implementar entidad `Sprint` con validación de fechas (`end_date > start_date`) y estados.
  * Implementar regla de negocio estricta: bloqueo de activación si ya existe un Sprint activo en el proyecto.
  * Desarrollar endpoint de asignación de historias a Sprints (`PATCH /api/v1/stories/{id}/sprint`).
  * Construir vista de Sprint Planning en React con soporte para transferir historias entre Backlog y Sprint.

#### Hito 6: Tareas Técnicas y Tablero Kanban
* **Objetivo:** Ejecutar y visualizar el trabajo diario a través de un flujo Drag & Drop reactivo.
* **Tareas Atómicas:**
  * Crear migración Liquibase para tabla `tasks`.
  * Implementar entidad `Task`, repositorio y reglas de cambio de estado (`TODO`, `IN_PROGRESS`, `TESTING`, `DONE`).
  * Implementar regla de completitud: marcar historia como completada cuando todas sus tareas estén en `DONE`.
  * Construir tablero Kanban en React con `@dnd-kit` organizado en las 4 columnas canónicas.
  * Implementar reversión visual de tarjetas si la actualización falla en el backend.
  * Validar latencia de persistencia inferior a 500 ms en entorno local.

#### Hito 7: Asistente de Inteligencia Artificial
* **Objetivo:** Asistir a Product Owners y Scrum Masters en la redacción de requerimientos.
* **Tareas Atómicas:**
  * Implementar servicio Spring Boot para consumir la API externa del LLM usando variables de entorno protegidas.
  * Configurar timeout de cliente HTTP a 8 segundos.
  * Diseñar prompt de sistema para forzar formato JSON estructurado y deserializar con Jackson.
  * Incorporar botón «Asistencia IA» en el modal de historias del frontend.
  * Manejar fallback: captura de error/timeout y preservación del texto ingresado por el usuario.

#### Hito 8: Cierre de Sprint y Validación Integral del MVP
* **Objetivo:** Completar el ciclo metodológico transaccional y verificar el sistema completo.
* **Tareas Atómicas:**
  * Implementar servicio transaccional para cierre de Sprint: retorno de historias incompletas al Backlog y cambio a `CLOSED`.
  * Diseñar diálogo modal de confirmación de cierre en React mostrando resumen de historias.
  * Ejecutar suite de pruebas integradas con `MockMvc` para todos los flujos principales.
  * Realizar verificación manual del ciclo completo por el desarrollador.
  * Preparar despliegue de prueba en PaaS (Railway / Render) para acceso de evaluadores.

---

### 3. Puertas de Calidad (Validation Gates) y Criterio de Parada

Para declarar un hito formalmente terminado, debe atravesar la siguiente compuerta de validación:
1. **Compilación y Linters:** Ejecución exitosa de `./mvnw clean compile` en backend y `npm run build && npm run lint` en frontend sin advertencias críticas.
2. **Pruebas Automatizadas:** Ejecución limpia de `./mvnw test` con cobertura de pruebas unitarias y de controladores para los casos de éxito y de error del hito.
3. **Persistencia Verificada:** Confirmación de que las migraciones de Liquibase ejecutan de forma reproducible en un contenedor de base de datos limpio.
4. **Revisión Humana (*Human-in-the-Loop*):** Validación interactiva directa en el navegador ejecutada por el desarrollador confirmando que el flujo cumple los criterios de aceptación del SRS.
5. **Consolidación en Git:** Commit descriptivo en rama `feature/` y fusión directa en `main`.

---

### 4. Política de Ramas en Git
* **Rama `main`:** Código fuente en estado estable y ejecutable. Todo cambio integrado debe haber superado la puerta de calidad.
* **Ramas `feature/<nombre-hito-tarea>`:** Ramas de trabajo aisladas para cada micro-tarea atómica. Se eliminan tras completar la fusión en `main`.