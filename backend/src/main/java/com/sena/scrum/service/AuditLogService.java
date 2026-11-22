package com.sena.scrum.service;

import com.sena.scrum.model.dto.AuditLogResponse;
import com.sena.scrum.model.entity.AuditLog;
import com.sena.scrum.model.entity.ProjectMembership;
import com.sena.scrum.model.entity.User;
import com.sena.scrum.model.enums.ScrumRole;
import com.sena.scrum.repository.AuditLogRepository;
import com.sena.scrum.repository.ProjectMembershipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final ProjectMembershipRepository membershipRepository;

    @Transactional(readOnly = true)
    public List<AuditLogResponse> getAuditLogs(String action, int limit, User currentUser) {
        validateCanViewAuditLogs(currentUser);

        int max = limit > 0 && limit <= 500 ? limit : 100;
        PageRequest pageRequest = PageRequest.of(0, max);

        List<AuditLog> logs;
        if (action != null && !action.isBlank()) {
            logs = auditLogRepository.findByActionOrderByTimestampDesc(action.trim(), pageRequest);
        } else {
            logs = auditLogRepository.findAllByOrderByTimestampDesc(pageRequest);
        }

        return logs.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public AuditLog logEvent(User user, String action, String entityType, String entityId, String details) {
        AuditLog log = AuditLog.builder()
                .user(user)
                .userName(user != null ? user.getFullName() : "SYSTEM")
                .userEmail(user != null ? user.getEmail() : null)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .details(details)
                .timestamp(OffsetDateTime.now())
                .build();

        return auditLogRepository.save(Objects.requireNonNull(log));
    }

    private void validateCanViewAuditLogs(User user) {
        if ("ADMIN".equals(user.getGlobalRole())) return;
        List<ProjectMembership> memberships = membershipRepository.findByUserId(user.getId());
        boolean isSmInAnyProject = memberships.stream().anyMatch(m -> m.getScrumRole() == ScrumRole.SCRUM_MASTER);
        if (!isSmInAnyProject) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Acceso restringido a Administradores y Scrum Masters (RNF-06)");
        }
    }

    public AuditLogResponse toResponse(AuditLog log) {
        return AuditLogResponse.builder()
                .id(log.getId())
                .userId(log.getUser() != null ? log.getUser().getId() : null)
                .userName(log.getUserName())
                .userEmail(log.getUserEmail())
                .action(log.getAction())
                .entityType(log.getEntityType())
                .entityId(log.getEntityId())
                .details(log.getDetails())
                .timestamp(log.getTimestamp())
                .build();
    }
}
