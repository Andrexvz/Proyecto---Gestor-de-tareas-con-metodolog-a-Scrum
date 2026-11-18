package com.sena.scrum.model.dto;

import com.sena.scrum.model.enums.TaskStatus;
import lombok.*;

import java.time.OffsetDateTime;

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
    private OffsetDateTime createdAt;
}
