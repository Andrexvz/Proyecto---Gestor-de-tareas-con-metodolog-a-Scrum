package com.sena.scrum.model.dto;

import com.sena.scrum.model.enums.TaskStatus;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskResponse {

    private Long id;
    private Long userStoryId;
    private String userStoryCode;
    private String userStoryTitle;
    private Long sprintId;
    private String sprintName;
    private Long assignedToId;
    private String assignedToName;
    private String assignedToEmail;
    private String code;
    private String description;
    private TaskStatus status;
    private Boolean hasActiveImpediment;
    private Integer commentsCount;
    private OffsetDateTime createdAt;

    // Rich nested objects for MyWork / Unified Views
    private Map<String, Object> assignee;
    private Map<String, Object> story;
    private Map<String, Object> project;
    private Map<String, Object> sprint;
}
