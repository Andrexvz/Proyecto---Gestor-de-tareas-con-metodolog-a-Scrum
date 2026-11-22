package com.sena.scrum.model.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SprintCloseRequest {
    @Builder.Default
    private String destination = "BACKLOG"; // BACKLOG o NEXT_SPRINT
    private Long targetSprintId;
}
