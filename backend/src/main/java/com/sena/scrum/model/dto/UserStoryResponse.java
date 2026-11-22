package com.sena.scrum.model.dto;

import com.sena.scrum.model.enums.StoryPriority;
import lombok.*;

import java.time.OffsetDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserStoryResponse {

    private Long id;
    private Long projectId;
    private String projectCode;
    private String projectName;
    private Long sprintId;
    private String sprintName;
    private Long epicId;
    private String epicName;
    private String epicColorHex;
    private String code;
    private String title;
    private String description;
    private String acceptanceCriteria;
    private StoryPriority priority;
    private Integer storyPoints;
    private Boolean isCompleted;
    private OffsetDateTime createdAt;
    private int totalTasks;
    private int completedTasks;
}
