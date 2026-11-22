package com.sena.scrum.model.dto;

import com.sena.scrum.model.enums.StoryPriority;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserStoryRequest {

    @NotNull(message = "El ID del proyecto es requerido")
    private Long projectId;

    private Long epicId; // Opcional (vincular a Épica)

    private Long sprintId; // Opcional (null = Product Backlog)

    @NotBlank(message = "El código de la historia es requerido (ej. CBA-101)")
    private String code;

    @NotBlank(message = "El título de la historia es requerido")
    private String title;

    @NotBlank(message = "La descripción de la historia es requerida")
    private String description;

    private String acceptanceCriteria;

    @Builder.Default
    private StoryPriority priority = StoryPriority.MEDIUM;

    @NotNull(message = "Los Story Points son requeridos")
    @Min(value = 1, message = "Los Story Points deben ser al menos 1")
    @Builder.Default
    private Integer storyPoints = 1;

    @Builder.Default
    private Boolean isCompleted = false;
}
