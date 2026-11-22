package com.sena.scrum.service;

import com.sena.scrum.exception.ResourceNotFoundException;
import com.sena.scrum.model.dto.EpicRequest;
import com.sena.scrum.model.dto.EpicResponse;
import com.sena.scrum.model.entity.Epic;
import com.sena.scrum.model.entity.Project;
import com.sena.scrum.model.entity.UserStory;
import com.sena.scrum.repository.EpicRepository;
import com.sena.scrum.repository.ProjectRepository;
import com.sena.scrum.repository.UserStoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EpicService {

    private final EpicRepository epicRepository;
    private final ProjectRepository projectRepository;
    private final UserStoryRepository userStoryRepository;

    @Transactional(readOnly = true)
    public List<EpicResponse> getEpicsByProject(Long projectId) {
        return epicRepository.findByProjectId(projectId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public EpicResponse getEpicById(Long id) {
        Epic epic = epicRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("Épica no encontrada con id: " + id));
        return toResponse(epic);
    }

    @Transactional
    public EpicResponse createEpic(Long projectId, EpicRequest request) {
        Project project = projectRepository.findById(Objects.requireNonNull(projectId))
                .orElseThrow(() -> new ResourceNotFoundException("Proyecto no encontrado con id: " + projectId));

        String colorHex = request.getColorHex() != null && !request.getColorHex().isBlank()
                ? request.getColorHex().trim()
                : "#8B5CF6";

        Epic epic = Epic.builder()
                .project(project)
                .name(request.getName().trim())
                .description(request.getDescription())
                .colorHex(colorHex)
                .createdAt(OffsetDateTime.now())
                .build();

        return toResponse(epicRepository.save(Objects.requireNonNull(epic)));
    }

    @Transactional
    public EpicResponse updateEpic(Long id, EpicRequest request) {
        Epic epic = epicRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("Épica no encontrada con id: " + id));

        if (request.getName() != null && !request.getName().isBlank()) {
            epic.setName(request.getName().trim());
        }
        if (request.getDescription() != null) {
            epic.setDescription(request.getDescription());
        }
        if (request.getColorHex() != null && !request.getColorHex().isBlank()) {
            epic.setColorHex(request.getColorHex().trim());
        }

        return toResponse(epicRepository.save(Objects.requireNonNull(epic)));
    }

    @Transactional
    public void deleteEpic(Long id) {
        Epic epic = epicRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new ResourceNotFoundException("Épica no encontrada con id: " + id));

        // Desvincular historias sin borrarlas (RF3)
        List<UserStory> linkedStories = userStoryRepository.findByEpicId(id);
        for (UserStory story : linkedStories) {
            story.setEpic(null);
            userStoryRepository.save(Objects.requireNonNull(story));
        }

        epicRepository.delete(Objects.requireNonNull(epic));
    }

    public EpicResponse toResponse(Epic epic) {
        return EpicResponse.builder()
                .id(epic.getId())
                .projectId(epic.getProject() != null ? epic.getProject().getId() : null)
                .name(epic.getName())
                .description(epic.getDescription())
                .colorHex(epic.getColorHex())
                .createdAt(epic.getCreatedAt())
                .build();
    }
}
