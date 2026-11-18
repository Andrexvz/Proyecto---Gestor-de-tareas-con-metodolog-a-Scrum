package com.sena.scrum.model.dto;

import com.sena.scrum.model.enums.TaskStatus;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KanbanStatusUpdateRequest {

    @NotNull(message = "El nuevo estado Kanban es requerido")
    private TaskStatus status;
}
