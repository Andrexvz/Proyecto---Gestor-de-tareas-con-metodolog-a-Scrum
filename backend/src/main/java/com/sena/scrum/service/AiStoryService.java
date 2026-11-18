package com.sena.scrum.service;

import com.sena.scrum.model.dto.AiStoryGenerateRequest;
import com.sena.scrum.model.dto.AiStoryGenerateResponse;
import com.sena.scrum.model.enums.StoryPriority;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class AiStoryService {

    public AiStoryGenerateResponse generateStoryWithAi(AiStoryGenerateRequest request) {
        String prompt = request.getPrompt() != null ? request.getPrompt().trim() : "";
        String role = (request.getUserRole() != null && !request.getUserRole().isBlank())
                ? request.getUserRole().trim()
                : detectRoleFromPrompt(prompt);

        String title = extractTitle(prompt);
        String action = extractAction(prompt);
        String benefit = extractBenefit(prompt);

        String userStoryFormat = String.format("Como %s, quiero %s, para %s.", role, action, benefit);
        String description = String.format(
                "%s\n\nContexto técnico: Esta funcionalidad permite satisfacer la necesidad de negocio descrita en: \"%s\".",
                userStoryFormat, prompt
        );

        List<String> gherkinCriteria = generateGherkinCriteria(role, action, benefit);
        String rawCriteria = String.join("\n\n", gherkinCriteria);

        int storyPoints = estimateStoryPoints(prompt);
        StoryPriority priority = estimatePriority(prompt);

        return AiStoryGenerateResponse.builder()
                .title(title)
                .userStoryFormat(userStoryFormat)
                .description(description)
                .gherkinCriteria(gherkinCriteria)
                .rawAcceptanceCriteria(rawCriteria)
                .suggestedStoryPoints(storyPoints)
                .suggestedPriority(priority)
                .build();
    }

    private String detectRoleFromPrompt(String prompt) {
        String lower = prompt.toLowerCase();
        if (lower.contains("admin") || lower.contains("gestor") || lower.contains("gerente")) {
            return "administrador de la plataforma";
        } else if (lower.contains("auditor") || lower.contains("seguridad") || lower.contains("compliance")) {
            return "oficial de seguridad informática";
        } else if (lower.contains("desarrollador") || lower.contains("api") || lower.contains("backend") || lower.contains("microservicio")) {
            return "desarrollador de software";
        } else if (lower.contains("cliente") || lower.contains("banca") || lower.contains("cuenta")) {
            return "cliente de banca digital";
        }
        return "usuario autenticado";
    }

    private String extractTitle(String prompt) {
        if (prompt.length() <= 60) {
            return capitalize(prompt);
        }
        int dot = prompt.indexOf('.');
        if (dot > 10 && dot <= 80) {
            return capitalize(prompt.substring(0, dot).trim());
        }
        return capitalize(prompt.substring(0, Math.min(60, prompt.length())).trim()) + "...";
    }

    private String extractAction(String prompt) {
        String lower = prompt.toLowerCase();
        if (lower.startsWith("como") && lower.contains("quiero")) {
            int start = lower.indexOf("quiero") + 6;
            int end = lower.contains("para") ? lower.indexOf("para") : prompt.length();
            return prompt.substring(start, end).trim();
        }
        return "disponer de una funcionalidad para " + prompt.toLowerCase().replaceAll("^(necesito|quiero|crear|implementar)\\s+", "");
    }

    private String extractBenefit(String prompt) {
        String lower = prompt.toLowerCase();
        if (lower.contains("para")) {
            int start = lower.indexOf("para") + 4;
            return prompt.substring(start).trim();
        }
        return "agilizar mi flujo de trabajo, reducir errores y garantizar la integridad de los datos";
    }

    private List<String> generateGherkinCriteria(String role, String action, String benefit) {
        List<String> criteria = new ArrayList<>();

        criteria.add(String.format(
                "Escenario 1: Ejecución exitosa del flujo principal\n" +
                        "  Dado que soy un %s con permisos válidos en el sistema\n" +
                        "  Cuando solicito %s\n" +
                        "  Entonces el sistema procesa la solicitud exitosamente en menos de 200 ms y retorna confirmación visual.",
                role, action
        ));

        criteria.add(
                "Escenario 2: Validación de reglas de negocio y campos requeridos\n" +
                        "  Dado que el usuario envía parámetros incompletos o malformados\n" +
                        "  Cuando se ejecuta la validación en el cliente y servidor\n" +
                        "  Entonces el sistema rechaza la operación con código HTTP 400 y detalla el motivo del error."
        );

        criteria.add(
                "Escenario 3: Resiliencia y auditoría de eventos de seguridad\n" +
                        "  Dado que ocurre una falla transaccional o intento de acceso no autorizado\n" +
                        "  Cuando el sistema detecta la anomalía\n" +
                        "  Entonces revierte la transacción de forma atómica y registra el evento en la bitácora de auditoría sin exponer credenciales."
        );

        return criteria;
    }

    private int estimateStoryPoints(String prompt) {
        String lower = prompt.toLowerCase();
        if (lower.contains("fido2") || lower.contains("biometr") || lower.contains("oauth") || lower.contains("microservicio") || lower.contains("sincroniz")) {
            return 8;
        } else if (lower.contains("exportar") || lower.contains("filtro") || lower.contains("reporte") || lower.contains("mfa")) {
            return 5;
        } else if (lower.contains("formulario") || lower.contains("modal") || lower.contains("validacion")) {
            return 3;
        } else if (lower.contains("tooltip") || lower.contains("icono") || lower.contains("badge")) {
            return 1;
        }
        return 5;
    }

    private StoryPriority estimatePriority(String prompt) {
        String lower = prompt.toLowerCase();
        if (lower.contains("seguridad") || lower.contains("critico") || lower.contains("vulnerabilidad") || lower.contains("urgente")) {
            return StoryPriority.URGENT;
        } else if (lower.contains("auth") || lower.contains("fido") || lower.contains("login") || lower.contains("pago")) {
            return StoryPriority.HIGH;
        } else if (lower.contains("color") || lower.contains("tema") || lower.contains("cosmetico")) {
            return StoryPriority.LOW;
        }
        return StoryPriority.MEDIUM;
    }

    private String capitalize(String text) {
        if (text == null || text.isBlank()) return text;
        return Character.toUpperCase(text.charAt(0)) + text.substring(1);
    }
}
