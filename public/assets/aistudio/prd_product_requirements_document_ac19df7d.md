# Documento de Requisitos de Producto (PRD)
## Gestor de Tareas con Metodología Scrum y Asistencia IA

---

### 1. Visión General del Producto y Objetivos de Negocio
#### 1.1 Declaración del Problema
Los equipos de desarrollo de software frecuentemente experimentan desorganización, barreras de comunicación, retrasos y falta de visibilidad en el avance real de sus proyectos al operar bajo el marco Scrum. Este problema se intensifica debido a la fragmentación de herramientas: las historias de usuario, las tareas técnicas y los Sprints se gestionan de forma dispersa. Adicionalmente, la redacción manual de historias de usuario y criterios de aceptación suele ser un proceso propenso a ambigüedades y consumidor de tiempo crítico.

#### 1.2 Propuesta de Valor
Una plataforma web integral e intuitiva de gestión de proyectos basada en Scrum que centraliza el Product Backlog, el Sprint Backlog, la ejecución interactiva en tablero Kanban, la asignación de tareas y el seguimiento de Sprints. Su núcleo diferenciador es un asistente de Inteligencia Artificial (LLM) integrado en el backend que genera borradores estructurados de historias de usuario y criterios de aceptación a partir de descripciones concisas, manteniendo siempre al usuario humano como editor y aprobador final.

#### 1.3 Objetivos de Negocio y KPIs
* **Velocidad y Cumplimiento de Sprints:** Medición transaccional de historias completadas y Story Points finalizados frente a los planificados.
* **Latencia Operativa del Tablero Kanban:** Cambios de estado de tareas persistidos y reflejados en UI en menos de 500 ms.
* **Disponibilidad del Sistema:** Meta de 99.9% de tiempo activo en producción.
* **Capacidad de Concurrencia:** Soporte objetivo de hasta 500 usuarios concurrentes sin degradación de la API.
* **Eficiencia del Asistente IA:** Tiempo límite estricto de respuesta (timeout) de 8 segundos, con fallback garantizado a redacción manual.
* **Incremento de Productividad:** Reducción del tiempo de definición de requerimientos y planificación de Sprints.

---

### 2. Usuarios, Roles y Permisos (RBAC)
El sistema opera bajo un modelo RBAC con roles globales y membresías específicas por proyecto:
* **Rol Global `USER`:** Nivel base que permite autenticación en el sistema y visualización de proyectos donde posea membresía activa.
* **Administrador (`ADMIN`):** Acceso total al sistema. Capacidad para ejecutar CRUD completo de usuarios, proyectos, membresías y asignación de roles.
* **Product Owner (`PO`):** Responsable de la visión funcional del proyecto. Gestión completa (CRUD) del Product Backlog, priorización de historias, uso del Asistente IA y lectura/participación en Sprints.
* **Scrum Master (`SM`):** Responsable del flujo de trabajo y ceremonias. Planificación, inicio y cierre transaccional de Sprints, traslado de historias al Sprint Backlog, monitoreo del Kanban y uso del Asistente IA.
* **Developer (`DEV`):** Responsable técnico. Consulta de historias, estimación por Story Points, desglose en tareas técnicas, autoasignación y actualización de tarjetas en el tablero Kanban.

#### Matriz de Permisos
| Funcionalidad | Admin | Product Owner | Scrum Master | Developer |
| :--- | :---: | :---: | :---: | :---: |
| Gestión de Proyectos | CRUD | Lectura (Asignados) | Lectura (Asignados) | Lectura (Asignados) |
| Gestión de Usuarios y Membresías | CRUD | Lectura | Lectura | Lectura |
| Product Backlog (Historias) | CRUD | CRUD | Lectura | Estimación / Lectura |
| Gestión de Sprints (Plan/Start/Close) | CRUD | CRUD | CRUD | Lectura |
| Asistente de IA (Generación) | Sí | Sí | Sí | No |
| Tablero Kanban (Mover tareas) | Sí | Sí | Sí | Sí |

---

### 3. Requisitos Funcionales y Criterios de Aceptación

#### RF-01: Autenticación, Registro y Gestión de Sesión
* **Descripción:** Acceso seguro mediante email y contraseña cifrada, emitiendo un token JWT para operaciones protegidas.
* **Criterios de Aceptación:**
  * El administrador puede registrar nuevos usuarios especificando nombre, correo, contraseña y rol global.
  * Validación de formato RFC de email y restricción de unicidad estricta (HTTP 409 en colisión).
  * Validación de complejidad mínima de contraseña: al menos 8 caracteres.
  * Almacenamiento obligatorio de contraseñas mediante algoritmo BCrypt (factor de costo 10).
  * Emisión de token JWT con caducidad estricta de 24 horas tras credenciales válidas (HTTP 200).
  * Rechazo con HTTP 401 ante credenciales inválidas y HTTP 403 ante recursos no autorizados.

#### RF-02: Gestión de Proyectos
* **Descripción:** Creación, consulta, modificación y eliminación de entornos de proyecto Scrum.
* **Criterios de Aceptación:**
  * Nombre de proyecto obligatorio, no nulo y no vacío.
  * Restricción de visualización: cada usuario solo visualiza los proyectos en los que posee una membresía activa asignada.
  * Operaciones de creación y eliminación reservadas exclusivamente al rol Administrador.
  * Confirmación obligatoria antes del borrado de cualquier proyecto.

#### RF-03: Asignación de Roles y Membresías de Proyecto
* **Descripción:** Asociación de usuarios a proyectos con un único rol Scrum activo.
* **Criterios de Aceptación:**
  * El sistema prohíbe membresías duplicadas de un mismo usuario en el mismo proyecto.
  * Cada usuario tiene exactamente un rol Scrum (`PO`, `SM`, `DEV`) por proyecto.
  * Los cambios de membresía o rol se aplican en tiempo real en las subsiguientes validaciones de tokens/solicitudes.

#### RF-04 & RF-06: Gestión del Product Backlog y Estimación
* **Descripción:** Administración integral de historias de usuario y dimensionamiento de esfuerzo.
* **Criterios de Aceptación:**
  * Toda historia debe contener: título, descripción, criterios de aceptación, prioridad (`ALTA`, `MEDIA`, `BAJA`) y estimación en Story Points.
  * Rechazo automático de historias sin título o sin prioridad asignada.
  * Story Points deben ser enteros mayores o iguales a 0 (rechazo de valores negativos).
  * Las historias recién creadas quedan registradas en el Product Backlog sin Sprint asignado (`sprint_id = null`).
  * Prohibición absoluta de eliminar historias que pertenezcan a Sprints activos o cerrados.

#### RF-05: Asistente de Inteligencia Artificial para Historias de Usuario
* **Descripción:** Integración con LLM desde el backend para redactar historias estructuradas y criterios de aceptación.
* **Criterios de Aceptación:**
  * El usuario introduce una descripción de al menos 5 caracteres y presiona «Asistencia IA».
  * Backend despacha la solicitud al LLM protegiendo el API Key sin exponerlo al cliente.
  * La IA genera la estructura formal: *«Como [rol], quiero [acción], para [beneficio]»* acompañada de una lista de criterios de aceptación sugeridos.
  * El borrador generado se presenta en la interfaz como un formulario editable; no se persiste automáticamente en BD hasta que el usuario pulse «Guardar historia».
  * Timeout estricto de 8 segundos. En caso de timeout o indisponibilidad del proveedor, la interfaz muestra un toast de advertencia y mantiene el texto introducido previamente para continuar la redacción manual.

#### RF-07 & RF-08: Planificación y Activación de Sprints
* **Descripción:** Creación de ciclos temporales y asignación de historias del backlog.
* **Criterios de Aceptación:**
  * Cada Sprint requiere nombre, objetivo, fecha de inicio y fecha de finalización.
  * Validación temporal: la fecha de finalización debe ser estrictamente posterior a la fecha de inicio.
  * Todo Sprint nuevo se crea en estado `PLANNING`.
  * Restricción de concurrencia de Sprints: **solo puede existir exactamente 1 Sprint en estado `ACTIVE` por proyecto**. El sistema bloquea e impide activar un nuevo Sprint si existe uno activo.
  * Solo se pueden asignar al Sprint historias pertenecientes al mismo proyecto.
  * Arrastre o selección reactiva: en caso de error de red, la historia retorna a su contenedor visual original.

#### RF-09: Creación y Asignación de Tareas Técnicas
* **Descripción:** Desglose operativo de historias de usuario en tareas de ejecución.
* **Criterios de Aceptación:**
  * Toda tarea debe estar obligatoriamente vinculada a una historia de usuario existente.
  * Descripción técnica no nula y no vacía.
  * Las tareas se instancian por defecto en estado `TODO`.
  * Asignación permitida únicamente a usuarios con membresía activa en el proyecto.
  * Los desarrolladores pueden autoasignarse tareas.

#### RF-10 & RF-11: Tablero Kanban Interactivo
* **Descripción:** Tablero visual compuesto por 4 columnas canónicas para seguimiento del flujo de trabajo.
* **Criterios de Aceptación:**
  * Columnas fijas obligatorias: `To Do`, `In Progress`, `Testing`, `Done`.
  * Drag & Drop interactivo que persiste el cambio de estado inmediatamente en base de datos.
  * Meta técnica de persistencia y respuesta visual: inferior a 500 ms.
  * Reversión optimista: si el backend devuelve error (HTTP 4xx/5xx), la tarjeta regresa automáticamente a la columna original con un toast explicativo.
  * **Cálculo de Historia Completada:** Cuando el 100% de las tareas vinculadas a una historia alcanzan el estado `Done`, la historia se marca automáticamente como completada.
  * Si el proyecto no cuenta con un Sprint en estado `ACTIVE`, el tablero muestra un Empty State indicando la ausencia de Sprint activo.

#### RF-12: Filtros de Tareas en Kanban
* **Descripción:** Segmentación ágil de tarjetas en el tablero.
* **Criterios de Aceptación:**
  * Filtro por desarrollador asignado y por prioridad.
  * Botón de acceso rápido «Mis tareas» para el usuario en sesión.
  * Actualización puramente visual sin mutar el estado ni el orden subyacente.
  * Si ningún elemento coincide, visualización de mensaje informativo y botón «Limpiar filtros».

#### RF-13: Cierre Transaccional de Sprints
* **Descripción:** Conclusión de un Sprint activo y consolidación del trabajo.
* **Criterios de Aceptación:**
  * Solo ejecutable por Scrum Master o Administrador sobre un Sprint en estado `ACTIVE`.
  * Diálogo de confirmación que detalla la cantidad de historias completadas y la lista de historias incompletas.
  * Transaccionalidad estricta (operación ACID):
    * Las historias con tareas pendientes retornan automáticamente al Product Backlog (`sprint_id = null`).
    * Las historias completadas permanecen vinculadas al Sprint cerrado.
    * El Sprint pasa a estado `CLOSED`.
    * En caso de error en cualquier paso, la transacción realiza un rollback completo.

#### RF-14: Métricas y Reportes de Productividad
* **Descripción:** Consolidación de indicadores ágiles del proyecto.
* **Criterios de Aceptación:**
  * Cálculo transaccional de Story Points completados vs. planificados por Sprint.
  * Solo se contabilizan puntos de historias donde el 100% de las tareas técnicas llegaron a `Done`.
  * Las historias sin estimación suman 0 puntos sin provocar excepciones aritméticas ni valores nulos.

#### RF-15: Notificaciones Internas de Tareas
* **Descripción:** Alertas en plataforma ante asignación de trabajo.
* **Criterios de Aceptación:**
  * Al asignarse un responsable a una tarea técnica, se persiste una notificación para el usuario destinatario.
  * Si el usuario no tiene sesión abierta, la notificación se conserva en estado no leído para su siguiente ingreso.
  * Se suprimen notificaciones redundantes si la tarea se actualiza sin cambiar de responsable.

#### RF-16: Recuperación de Contraseñas
* **Descripción:** Mecanismo seguro de restauración de credenciales vía enlace temporal.
* **Criterios de Aceptación:**
  * Formulario público de solicitud por correo. La API responde con mensaje neutro sin confirmar ni desmentir si el correo existe en BD.
  * Generación de token criptográfico de un solo uso con expiración máxima de 15 minutos.
  * Almacenamiento de la nueva contraseña con BCrypt (factor de costo 10).

---

### 4. Restricciones, Límites y Exclusiones
* **Exclusiones de la Versión 1.0:** Gráficos Burndown avanzados, integración con repositorios externos (GitHub/GitLab API), OAuth2 federado y personalización dinámica de columnas Kanban.
* **Límites de Seguridad y Backend:** Prohibición absoluta de llamadas directas desde el navegador a APIs de LLM externas. Todas las interacciones deben transitar por el backend Spring Boot.
* **Restricción de Estados:** Prohibido añadir estados intermedios a la lógica del Kanban distintos de `To Do`, `In Progress`, `Testing` y `Done`.