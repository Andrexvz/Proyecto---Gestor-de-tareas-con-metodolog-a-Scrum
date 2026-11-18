package com.sena.scrum.model.dto;

import com.sena.scrum.model.enums.TaskStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskRequest {

    @NotNull(message = "El ID de la historia de usuario es requerido")
    private Long userStoryId;

    private Long assignedToId;

    @NotBlank(message = "El código de la tarea es requerido (ej. TASK-01)")
    private String code;

    @NotBlank(message = "La descripción de la tarea es requerida")
    private String description;

    @Builder.Default
    private TaskStatus status = TaskStatus.TODO;
}
