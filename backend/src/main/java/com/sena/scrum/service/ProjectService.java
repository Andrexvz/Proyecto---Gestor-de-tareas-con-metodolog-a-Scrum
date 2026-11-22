package com.sena.scrum.service;

import com.sena.scrum.exception.BusinessRuleException;
import com.sena.scrum.exception.ResourceNotFoundException;
import com.sena.scrum.model.dto.ProjectRequest;
import com.sena.scrum.model.dto.ProjectResponse;
import com.sena.scrum.model.entity.Project;
import com.sena.scrum.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;

    @Transactional(readOnly = true)
    public List<ProjectResponse> getAllProjects() {
        return projectRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProjectResponse getProjectById(Long id) {
        Project project = findEntityById(id);
        return mapToResponse(project);
    }

    @Transactional
    public ProjectResponse createProject(ProjectRequest request) {
        String code = request.getCode().toUpperCase().trim();
        if (projectRepository.existsByCode(code)) {
            throw new BusinessRuleException("Ya existe un proyecto con el código: " + code);
        }

        Project project = Project.builder()
                .code(code)
                .name(request.getName().trim())
                .description(request.getDescription())
                .build();

        return mapToResponse(projectRepository.save(Objects.requireNonNull(project)));
    }

    @Transactional
    public ProjectResponse updateProject(Long id, ProjectRequest request) {
        Project project = findEntityById(id);

        String newCode = request.getCode().toUpperCase().trim();
        if (!project.getCode().equalsIgnoreCase(newCode) && projectRepository.existsByCode(newCode)) {
            throw new BusinessRuleException("Ya existe otro proyecto con el código: " + newCode);
        }

        project.setCode(newCode);
        project.setName(request.getName().trim());
        project.setDescription(request.getDescription());

        return mapToResponse(projectRepository.save(Objects.requireNonNull(project)));
    }

    @Transactional
    public void deleteProject(Long id) {
        Project project = findEntityById(id);
        projectRepository.delete(Objects.requireNonNull(project));
    }

    public Project findEntityById(Long id) {
        return projectRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("Proyecto no encontrado con ID: " + id));
    }

    private ProjectResponse mapToResponse(Project project) {
        return ProjectResponse.builder()
                .id(project.getId())
                .code(project.getCode())
                .name(project.getName())
                .description(project.getDescription())
                .createdAt(project.getCreatedAt())
                .totalSprints(project.getSprints() != null ? project.getSprints().size() : 0)
                .totalStories(project.getUserStories() != null ? project.getUserStories().size() : 0)
                .build();
    }
}
