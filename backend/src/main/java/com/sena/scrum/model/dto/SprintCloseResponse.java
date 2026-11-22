package com.sena.scrum.model.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SprintCloseResponse {
    private Long sprintId;
    private String sprintName;
    private int completedStoriesCount;
    private int returnedStoriesCount;
    private int deliveredPoints;
    private int plannedPoints;
    private int velocity;
    private String targetDestination;
}
