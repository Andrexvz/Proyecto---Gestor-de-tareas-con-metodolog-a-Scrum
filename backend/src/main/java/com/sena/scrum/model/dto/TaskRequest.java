package com.sena.scrum.model.dto;

import com.sena.scrum.model.enums.TaskStatus;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskRequest {

    private Long userStoryId;

    private Long assignedToId;

    private String code;

    @NotBlank(message = "La descripción de la tarea es requerida")
    private String description;

    @Builder.Default
    private TaskStatus status = TaskStatus.TODO;
}
