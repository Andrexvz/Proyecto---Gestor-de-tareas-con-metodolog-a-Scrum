package com.sena.scrum.service;

import com.sena.scrum.exception.ResourceNotFoundException;
import com.sena.scrum.model.dto.ProjectMembershipRequest;
import com.sena.scrum.model.dto.ProjectMembershipResponse;
import com.sena.scrum.model.entity.Project;
import com.sena.scrum.model.entity.ProjectMembership;
import com.sena.scrum.model.entity.User;
import com.sena.scrum.repository.ProjectMembershipRepository;
import com.sena.scrum.repository.ProjectRepository;
import com.sena.scrum.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectMembershipService {

    private final ProjectMembershipRepository membershipRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<ProjectMembershipResponse> getMembershipsByProject(Long projectId) {
        return membershipRepository.findByProjectId(projectId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ProjectMembershipResponse upsertMembership(Long projectId, ProjectMembershipRequest request) {
        Project project = projectRepository.findById(Objects.requireNonNull(projectId))
                .orElseThrow(() -> new ResourceNotFoundException("Proyecto no encontrado con id: " + projectId));

        User user = userRepository.findById(Objects.requireNonNull(request.getUserId()))
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con id: " + request.getUserId()));

        Optional<ProjectMembership> existing = membershipRepository.findByProjectIdAndUserId(projectId, user.getId());

        ProjectMembership membership;
        if (existing.isPresent()) {
            membership = existing.get();
            membership.setScrumRole(request.getScrumRole());
        } else {
            membership = ProjectMembership.builder()
                    .project(project)
                    .user(user)
                    .scrumRole(request.getScrumRole())
                    .createdAt(OffsetDateTime.now())
                    .build();
        }

        return toResponse(membershipRepository.save(Objects.requireNonNull(membership)));
    }

    @Transactional
    public void deleteMembership(Long projectId, Long userId) {
        membershipRepository.delete(
                membershipRepository.findByProjectIdAndUserId(projectId, userId)
                        .orElseThrow(() -> new ResourceNotFoundException("Membresía no encontrada para el proyecto " + projectId + " y usuario " + userId))
        );
    }

    public ProjectMembershipResponse toResponse(ProjectMembership m) {
        return ProjectMembershipResponse.builder()
                .id(m.getId())
                .projectId(m.getProject() != null ? m.getProject().getId() : null)
                .userId(m.getUser() != null ? m.getUser().getId() : null)
                .userFullName(m.getUser() != null ? m.getUser().getFullName() : null)
                .userEmail(m.getUser() != null ? m.getUser().getEmail() : null)
                .scrumRole(m.getScrumRole())
                .createdAt(m.getCreatedAt())
                .build();
    }
}
