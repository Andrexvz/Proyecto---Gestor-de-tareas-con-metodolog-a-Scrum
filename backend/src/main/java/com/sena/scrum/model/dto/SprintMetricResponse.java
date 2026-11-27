package com.sena.scrum.model.dto;

import com.sena.scrum.model.enums.SprintStatus;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SprintMetricResponse {
    private Long sprintId;
    private String sprintName;
    private SprintStatus status;
    private LocalDate startDate;
    private LocalDate endDate;
    private int plannedPoints;
    private int completedPoints;
    private int totalStories;
    private int completedStories;
}
