package com.sena.scrum.service;

import com.sena.scrum.exception.ResourceNotFoundException;
import com.sena.scrum.model.dto.ImpedimentRequest;
import com.sena.scrum.model.dto.ImpedimentResolveRequest;
import com.sena.scrum.model.dto.ImpedimentResponse;
import com.sena.scrum.model.entity.Impediment;
import com.sena.scrum.model.entity.Task;
import com.sena.scrum.model.entity.User;
import com.sena.scrum.model.enums.ImpedimentStatus;
import com.sena.scrum.model.enums.ScrumRole;
import com.sena.scrum.repository.ImpedimentRepository;
import com.sena.scrum.repository.ProjectMembershipRepository;
import com.sena.scrum.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ImpedimentService {

    private final ImpedimentRepository impedimentRepository;
    private final TaskRepository taskRepository;
    private final ProjectMembershipRepository membershipRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<ImpedimentResponse> getImpedimentsByTask(Long taskId) {
        return impedimentRepository.findByTaskId(taskId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ImpedimentResponse createImpediment(Long taskId, ImpedimentRequest request, User currentUser) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Tarea no encontrada con id: " + taskId));

        Long projectId = task.getUserStory().getProject().getId();
        validateCanReport(currentUser, projectId);

        Impediment impediment = Impediment.builder()
                .task(task)
                .description(request.getDescription().trim())
                .status(ImpedimentStatus.OPEN)
                .createdBy(currentUser)
                .creatorName(currentUser.getFullName())
                .createdAt(OffsetDateTime.now())
                .build();

        Impediment saved = impedimentRepository.save(impediment);

        auditLogService.logEvent(
                currentUser,
                "IMPEDIMENT_REPORTED",
                "IMPEDIMENT",
                String.valueOf(saved.getId()),
                "Impedimento reportado en tarea " + task.getCode() + ": \"" + saved.getDescription() + "\""
        );

        return toResponse(saved);
    }

    @Transactional
    public ImpedimentResponse resolveImpediment(Long impedimentId, ImpedimentResolveRequest request, User currentUser) {
        Impediment impediment = impedimentRepository.findById(impedimentId)
                .orElseThrow(() -> new ResourceNotFoundException("Impedimento no encontrado con id: " + impedimentId));

        Long projectId = impediment.getTask().getUserStory().getProject().getId();
        validateCanResolve(currentUser, projectId);

        impediment.setStatus(ImpedimentStatus.RESOLVED);
        impediment.setResolvedBy(currentUser);
        impediment.setResolverName(currentUser.getFullName());
        impediment.setResolvedAt(OffsetDateTime.now());
        impediment.setResolutionComment(request.getResolutionComment().trim());

        Impediment updated = impedimentRepository.save(impediment);

        auditLogService.logEvent(
                currentUser,
                "IMPEDIMENT_RESOLVED",
                "IMPEDIMENT",
                String.valueOf(updated.getId()),
                "Impedimento resuelto en tarea " + impediment.getTask().getCode() + ": \"" + updated.getResolutionComment() + "\""
        );

        return toResponse(updated);
    }

    private void validateCanReport(User user, Long projectId) {
        if ("ADMIN".equals(user.getGlobalRole())) return;
        boolean isDevOrSm = membershipRepository.findByProjectIdAndUserId(projectId, user.getId())
                .map(m -> m.getScrumRole() == ScrumRole.DEVELOPER || m.getScrumRole() == ScrumRole.SCRUM_MASTER)
                .orElse(false);
        if (!isDevOrSm) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Solo los roles Developer y Scrum Master del proyecto pueden registrar impedimentos (RF5 / HU #9)");
        }
    }

    private void validateCanResolve(User user, Long projectId) {
        if ("ADMIN".equals(user.getGlobalRole())) return;
        boolean isSm = membershipRepository.findByProjectIdAndUserId(projectId, user.getId())
                .map(m -> m.getScrumRole() == ScrumRole.SCRUM_MASTER)
                .orElse(false);
        if (!isSm) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Solo el Scrum Master asignado al proyecto puede resolver impedimentos (RF6 / HU #9)");
        }
    }

    public ImpedimentResponse toResponse(Impediment imp) {
        return ImpedimentResponse.builder()
                .id(imp.getId())
                .taskId(imp.getTask() != null ? imp.getTask().getId() : null)
                .description(imp.getDescription())
                .status(imp.getStatus())
                .createdById(imp.getCreatedBy() != null ? imp.getCreatedBy().getId() : null)
                .creatorName(imp.getCreatorName())
                .createdAt(imp.getCreatedAt())
                .resolvedById(imp.getResolvedBy() != null ? imp.getResolvedBy().getId() : null)
                .resolverName(imp.getResolverName())
                .resolvedAt(imp.getResolvedAt())
                .resolutionComment(imp.getResolutionComment())
                .build();
    }
}
