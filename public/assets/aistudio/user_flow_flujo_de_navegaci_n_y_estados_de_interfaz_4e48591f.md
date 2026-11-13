# Especificación de Flujos de Usuario (User Flow)

## Gestor de Tareas con Metodología Scrum y Asistencia IA

### 1. Punto de Entrada y Redirecciones Iniciales

```
                       [Acceso a URL Raíz: /]
                                  |
                      ¿Tiene token JWT válido?
                                  |
                    +-------------+-------------+
                    | No                        | Sí
                    v                           v
         [Pantalla de Login]           [Redirección: /dashboard]
        (Email / Contraseña)           (Proyectos del usuario)

```

* **Usuario Anónimo:** Cualquier solicitud a una ruta protegida o a la raíz (`/`) redirige inmediatamente a `/login`. No existe landing page pública promocional en la versión inicial.

* **Usuario Autenticado:** El acceso a la raíz redirige automáticamente a `/dashboard`.

* **Sesión Expirada:** Si el token JWT supera las 24 horas, cualquier llamada a la API devuelve HTTP 401; la SPA intercepta la respuesta, purga el almacenamiento local y redirige a `/login` con un toast informativo: *«Tu sesión ha expirado. Por favor, ingresa nuevamente»*.

### 2. El Happy Path Principal (Ruta Crítica Paso a Paso)

#### Paso 1: Autenticación y Entrada al Dashboard

* **Pantalla:** `/login`.

* **Acción:** El usuario introduce su correo y contraseña; presiona el botón «Iniciar Sesión».

* **Comportamiento Visual:** El botón muestra un spinner con el texto *«Validando...»* y queda deshabilitado.

* **Transición Exitosa:** Notificación Toast verde: *«Bienvenido al sistema»*. Redirección inmediata a `/dashboard`.

#### Paso 2: Selección o Creación de Proyecto

* **Pantalla:** `/dashboard`.

* **Acción:**

  * *Administrador:* Visualiza lista de proyectos y presiona botón «Crear proyecto». Completa nombre y descripción en modal; presiona «Guardar».

  * *Otros Roles:* Seleccionan directamente un proyecto existente en su lista de tarjetas.

* **Comportamiento Visual:** La tarjeta del nuevo proyecto aparece inmediatamente en la grilla tras la respuesta del servidor. Toast: *«Proyecto creado correctamente»*.

* **Transición Exitosa:** Clic sobre la tarjeta del proyecto; navegación hacia `/projects/:id/backlog`.

#### Paso 3: Definición de Requerimientos en Product Backlog (con Asistente IA)

* **Pantalla:** `/projects/:id/backlog`.

* **Acción:** El Product Owner pulsa «Nueva historia».

  1. Introduce un título conciso (ej. *«Autenticación con huella digital»*).

  2. Presiona el botón «Asistencia IA».

  3. El botón pasa a estado de carga: spinner activo con texto *«Generando historia...»*.

  4. La IA devuelve el borrador estructurado en los campos del modal:

     * **Descripción:** *«Como usuario móvil, quiero autenticarme mediante mi huella dactilar, para ingresar rápidamente sin escribir mi contraseña»*.

     * **Criterios de Aceptación:** lista de viñetas editables.

  5. El usuario edita o refina el texto a conveniencia, asigna prioridad (`ALTA`) y Story Points (`5`).

  6. Presiona «Guardar historia».

* **Transición Exitosa:** Toast: *«Historia de usuario guardada correctamente»*. La tarjeta se incorpora a la lista del Product Backlog.

#### Paso 4: Planificación e Inicio del Sprint

* **Pantalla:** `/projects/:id/sprints`.

* **Acción:** El Scrum Master selecciona «Crear Sprint».

  1. Define nombre (*«Sprint 1»*), objetivo y rango de fechas válidas.

  2. Arrastra la historia recién creada desde el panel «Product Backlog» al contenedor «Sprint Backlog».

  3. Presiona «Iniciar Sprint».

* **Transición Exitosa:** El badge de estado del Sprint cambia de `PLANNING` a `ACTIVE` (verde). Toast: *«Sprint iniciado correctamente»*. Opción visible: enlace directo «Ir al Tablero Kanban».

#### Paso 5: Desglose Técnico y Movimiento en Tablero Kanban

* **Pantalla:** `/projects/:id/kanban`.

* **Acción:**

  1. El Developer visualiza las historias del Sprint activo.

  2. Presiona «+ Agregar tarea» sobre una historia; introduce la descripción técnica y se autoasigna como responsable.

  3. La tarea aparece como tarjeta en la columna `To Do`.

  4. Conforme avanza el trabajo, arrastra la tarjeta secuencialmente:
     

     $$
     \text{To Do} \longrightarrow \text{In Progress} \longrightarrow \text{Testing} \longrightarrow \text{Done}
     $$

* **Comportamiento Visual:** Arrastre fluido mediante DnD-Kit. Al soltar, persistencia en BD con latencia menor a 500 ms. Toast discreto en esquina inferior: *«Estado actualizado correctamente»*.

* **Cierre Automático de Historia:** En el momento en que la última tarea asociada a la historia entra a la columna `Done`, el badge de la historia se actualiza automáticamente con un check de completado.

#### Paso 6: Conclusión del Ciclo y Cierre de Sprint

* **Pantalla:** `/projects/:id/sprints` (o cabecera del Kanban).

* **Acción:** El Scrum Master presiona «Cerrar Sprint».

  1. Se despliega modal de confirmación con el resumen: *«Historias completadas: 1 | Historias pendientes: 0»*.

  2. Presiona «Confirmar cierre».

* **Transición Exitosa:** El Sprint cambia su estado a `CLOSED`. Toast: *«Sprint finalizado correctamente»*. Se despliega el panel de cierre mostrando el total de Story Points entregados con éxito frente a los planificados.

### 3. Matriz de Estados de la Interfaz (UI States)

| Vista / Componente | Estado de Carga (Loading) | Estado Vacío (Empty State) | Error en Formulario | Error de Red / Servidor | 
| ----- | ----- | ----- | ----- | ----- | 
| **Dashboard** | Tarjetas de proyectos con skeletons parpadeantes (3 bloques). | Ilustración de carpeta vacía + texto: *«Todavía no hay proyectos registrados»* + botón «Crear proyecto» (solo Admin). | N/A | Banner superior de alerta roja con botón «Reintentar conexión». | 
| **Product Backlog** | Líneas horizontales skeleton simulando filas de historias. | Texto: *«Aún no hay historias de usuario en este proyecto»* + botón «Crear historia». | Texto en rojo bajo cada input (*«El título es obligatorio»*, *«Mínimo 0 puntos»*). | Toast flotante en esquina superior derecha con código y mensaje de error. | 
| **Modal Asistencia IA** | Spinner circular dentro del botón con texto *«Generando historia...»* (inputs deshabilitados). | N/A | Texto en rojo: *«Ingresa al menos 5 caracteres para asistir a la IA»*. | Toast de advertencia: *«El asistente de IA no está disponible temporalmente. Puedes continuar manualmente»*. | 
| **Tablero Kanban** | 4 columnas con bloques skeleton rectangulares. | Si no hay Sprint activo: Tarjeta centrada *«No hay un Sprint activo en este proyecto»* + botón «Ir a planificación». | Mensaje de validación bajo campo al crear tarea rápida. | Reversión visual inmediata de la tarjeta a su columna origen + Toast de fallo de sincronización. | 
| **Filtros Kanban** | N/A | Texto centrado: *«No encontramos tareas con estos filtros»* + botón «Limpiar filtros». | N/A | N/A | 

### 4. Rutas Alternativas, Bifurcaciones y Escenarios Límite (Edge Cases)

```
                            [Acción de Usuario]
                                     |
       +-----------------------------+-----------------------------+
       |                             |                             |
       v                             v                             v
[Timeout IA (> 8s)]       [Cierre de Modal sucio]      [Arrastre Kanban Fallido]
       |                             |                             |
Cancela solicitud;             Muestra diálogo:             Backend responde 500;
Muestra toast de error;       «¿Descartar cambios?»         Tarjeta retorna a origen;
Conserva texto ingresado.     (Continuar / Descartar).      Toast: «Fallo al mover».

```

* **Fallo de Proveedor de IA o Latencia Mayor a 8 Segundos:**
  El frontend interrumpe el estado de carga tras 8000 ms exactos mediante `AbortController`. Muestra el mensaje informativo: *«El asistente de IA no está disponible temporalmente. Puedes continuar escribiendo manualmente»*. Ningún carácter escrito en el formulario es borrado.

* **Cierre Accidental de Formularios Modales con Datos Introducidos:**
  Si el usuario hace clic fuera del modal o pulsa «Cancelar» habiendo modificado algún campo, se intercepta el evento mostrando una alerta: *«Tienes cambios sin guardar. ¿Deseas descartarlos?»* con opciones *«Continuar editando»* y *«Descartar cambios»*. Si el formulario no fue alterado, se cierra inmediatamente.

* **Fallo de Conectividad durante el Arrastre en Kanban:**
  Si una tarjeta es movida de `In Progress` a `Testing` y la llamada `PATCH` falla por error de red o HTTP 500, la mutación optimista es descartada: la tarjeta vuela visualmente de regreso a `In Progress` y se despliega un Toast de error: *«No se pudo actualizar la tarea. Verifica tu conexión e inténtalo nuevamente»*.

* **Intento de Iniciar un Segundo Sprint Concurrente:**
  Si el Scrum Master intenta iniciar un Sprint cuando ya existe uno activo, el botón «Iniciar Sprint» aparece deshabilitado con un tooltip explicativo. Si se envía la petición directamente, el backend responde HTTP 409 con el mensaje: *«Ya existe un Sprint activo en este proyecto. Debes cerrar el Sprint actual antes de iniciar uno nuevo»*.

* **Cierre de Sprint con Historias Técnicamente Incompletas:**
  Al presionar «Cerrar Sprint», el sistema verifica el estado de las tareas. Si hay historias con tareas pendientes en `To Do`, `In Progress` o `Testing`, el modal de advertencia indica: *«Este Sprint contiene historias de usuario incompletas. Al cerrarlo, estas historias regresarán automáticamente al Product Backlog. ¿Deseas continuar?»*. Si el usuario confirma, la transacción reasigna las historias al backlog general de manera atómica sin pérdida de datos.