package com.sena.scrum.ai.service;

import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class AiKnowledgeService {

    public record KnowledgeDoc(String id, String title, String category, String content, Set<String> keywords) {}

    private final List<KnowledgeDoc> docs = List.of(
            new KnowledgeDoc(
                    "nav-routes",
                    "Módulos y Rutas Reales de Agile Velocity",
                    "Plataforma",
                    """
                    Rutas oficiales existentes en Agile Velocity:
                    - /dashboard: Dashboard global de proyectos, KPIs, gráficos Burndown/Donut y perspectiva por rol.
                    - /my-work: Vista personal Mi Trabajo con tareas asignadas y cambio rápido de estado.
                    - /projects/{id}/backlog: Product Backlog con historias de usuario, épicas, filtros, prioridad y Asistencia IA.
                    - /projects/{id}/sprints: Planificación, inicio y cierre transaccional de Sprints (exclusivo Scrum Master).
                    - /projects/{id}/kanban: Tablero Kanban con 4 columnas canónicas: Por Hacer (TODO), En Progreso (IN_PROGRESS), En Revisión (TESTING) y Hecho (DONE).
                    - /projects/{id}/metrics: Métricas Scrum deterministas (velocidad histórica, Say/Do ratio, distribución de tareas).
                    Modales globales: Búsqueda rápida (Ctrl+K), Bitácora de Auditoría (Admin/SM), Notificaciones, Temas (Dark Neon / Light / Reduced Motion) y Guía Interactiva.
                    """,
                    Set.of("ruta", "pantalla", "modulo", "dashboard", "kanban", "backlog", "sprint", "metricas", "trabajo", "navegar", "menu", "donde")
            ),
            new KnowledgeDoc(
                    "rbac-roles",
                    "Roles Scrum y Matriz de Permisos RBAC",
                    "Seguridad y Roles",
                    """
                    Roles oficiales en Agile Velocity:
                    1. ADMINISTRADOR: Gobernanza global, creación/eliminación de proyectos, registro de usuarios, membresías y acceso completo a Bitácora de Auditoría (RNF-06).
                    2. PRODUCT_OWNER: Crea, edita y elimina historias de usuario, gestiona Product Backlog, define prioridades y criterios de aceptación, gestiona épicas y usa Asistencia IA.
                    3. SCRUM_MASTER: Planifica, inicia y cierra Sprints (cierre exclusivo del Scrum Master), resuelve impedimentos (exclusivo SM), gestiona épicas, consulta Auditoría y publica comentarios.
                    4. DEVELOPER: Consulta historias/sprints, crea y actualiza tareas técnicas en Kanban y Mi Trabajo, reporta impedimentos y publica comentarios técnicos. No puede cerrar Sprints ni crear proyectos o historias.
                    """,
                    Set.of("rol", "permiso", "rbac", "admin", "product owner", "scrum master", "developer", "autorizacion", "puede", "quien")
            ),
            new KnowledgeDoc(
                    "scrum-rules",
                    "Reglas Canónicas Scrum y Validaciones",
                    "Metodología Scrum",
                    """
                    Reglas estrictas validadas por el backend:
                    - Tablero Kanban: 4 columnas obligatorias (Por Hacer, En Progreso, En Revisión, Hecho).
                    - Bloqueo por Impedimentos (RF5/HU #9): Está prohibido mover una tarea a Hecho (DONE) mientras tenga un impedimento en estado OPEN (retorna HTTP 409). Solo el Scrum Master puede resolver el impedimento.
                    - Sprint Único Activo: Solo puede existir un Sprint en estado ACTIVE por proyecto.
                    - Cierre de Sprint (RF6/HU #10): Exclusivo del Scrum Master; calcula velocidad únicamente con historias 100% completadas y retorna historias incompletas al Backlog o al siguiente Sprint planificado.
                    - Historias de Usuario: Formato 'Como [rol], quiero [acción], para [beneficio]', prioridad (LOW, MEDIUM, HIGH, URGENT) y Story Points Fibonacci.
                    - Comentarios (HU #12): Entre 1 y 1000 caracteres; solo Developer y Scrum Master del proyecto pueden publicar comentarios.
                    """,
                    Set.of("impedimento", "bloqueo", "done", "hecho", "cerrar", "cierre", "sprint", "regla", "validacion", "409", "kanban", "comentario", "invest")
            ),
            new KnowledgeDoc(
                    "scrum-guide",
                    "Guía Metodológica Scrum y Eventos",
                    "Scrum",
                    """
                    Eventos y artefactos clave en Scrum:
                    - Product Backlog: Lista ordenada por valor de negocio (Product Owner). Criterios INVEST: Independiente, Negociable, Valiosa, Estimable, Pequeña (Small), Testeable.
                    - Sprint Planning: Selección de historias del Backlog para el Sprint Goal según la velocidad histórica del equipo.
                    - Daily Scrum: Inspección diaria de 15 minutos enfocada en avance hacia el Sprint Goal e identificación temprana de impedimentos.
                    - Sprint Review: Inspección del incremento terminado al cierre del Sprint con stakeholders.
                    - Sprint Retrospective: Mejora continua de procesos, herramientas y colaboración del equipo.
                    """,
                    Set.of("scrum", "evento", "ceremonia", "daily", "review", "retrospectiva", "planning", "invest", "velocidad", "burndown", "epica", "story points")
            )
    );

    public String retrieveRelevantContext(String query) {
        return retrieveRelevantContext(query, false);
    }

    public String retrieveRelevantContext(String query, boolean compact) {
        if (query == null || query.isBlank()) return "";
        String lower = query.toLowerCase(Locale.ROOT);
        List<KnowledgeDoc> matched = new ArrayList<>();
        for (KnowledgeDoc doc : docs) {
            boolean hit = doc.keywords().stream().anyMatch(lower::contains);
            if (hit) matched.add(doc);
        }
        if (matched.isEmpty()) {
            if (compact) {
                return "";
            }
            matched.add(docs.get(0));
            matched.add(docs.get(1));
        }
        if (compact && matched.size() > 1) {
            matched = List.of(matched.get(0));
        }
        StringBuilder sb = new StringBuilder();
        for (KnowledgeDoc d : matched) {
            sb.append("### ").append(d.title()).append("\n").append(d.content().trim()).append("\n\n");
        }
        return sb.toString().trim();
    }

    public List<KnowledgeDoc> getAllDocs() {
        return docs;
    }
}
