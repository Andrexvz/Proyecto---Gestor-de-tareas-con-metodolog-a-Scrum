package com.sena.scrum.model.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectWorkspaceResponse {
    private ProjectResponse project;
    private List<SprintResponse> sprints;
    private List<UserStoryResponse> stories;
    private List<TaskResponse> tasks;
    private List<SprintMetricResponse> metrics;
    private List<EpicResponse> epics;
}
