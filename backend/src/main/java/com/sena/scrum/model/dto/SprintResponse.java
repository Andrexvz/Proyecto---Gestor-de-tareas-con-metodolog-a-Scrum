package com.sena.scrum.model.dto;

import com.sena.scrum.model.enums.SprintStatus;
import lombok.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SprintResponse {

    private Long id;
    private Long projectId;
    private String projectName;
    private String name;
    private String goal;
    private LocalDate startDate;
    private LocalDate endDate;
    private SprintStatus status;
    private OffsetDateTime closedAt;
    private OffsetDateTime createdAt;
    private int totalStories;
    private int completedStories;
    private int totalPoints;
}
