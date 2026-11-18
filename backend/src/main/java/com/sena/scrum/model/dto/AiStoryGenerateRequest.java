package com.sena.scrum.model.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiStoryGenerateRequest {

    @NotBlank(message = "El prompt o necesidad de negocio es requerido")
    private String prompt;

    private Long projectId;

    private String userRole; // Ej. "cliente de banca móvil", "administrador", "auditor"
}
