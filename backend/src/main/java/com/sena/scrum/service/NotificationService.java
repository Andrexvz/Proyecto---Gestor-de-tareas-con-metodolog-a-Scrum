package com.sena.scrum.service;

import com.sena.scrum.model.dto.NotificationResponse;
import com.sena.scrum.model.entity.AppNotification;
import com.sena.scrum.model.entity.User;
import com.sena.scrum.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    @Transactional(readOnly = true)
    public List<NotificationResponse> getNotificationsByUser(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void markAsRead(Long userId, Long notificationId) {
        if (notificationId != null) {
            notificationRepository.findById(Objects.requireNonNull(notificationId)).ifPresent(n -> {
                if (n.getUser() != null && n.getUser().getId().equals(userId)) {
                    n.setReadStatus(true);
                    notificationRepository.save(Objects.requireNonNull(n));
                }
            });
        } else {
            // Mark all as read
            List<AppNotification> list = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
            for (AppNotification n : list) {
                n.setReadStatus(true);
            }
            notificationRepository.saveAll(Objects.requireNonNull(list));
        }
    }

    @Transactional
    public AppNotification createNotification(User user, String message) {
        AppNotification notification = AppNotification.builder()
                .user(user)
                .message(message)
                .readStatus(false)
                .createdAt(OffsetDateTime.now())
                .build();
        return notificationRepository.save(Objects.requireNonNull(notification));
    }

    public NotificationResponse toResponse(AppNotification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .userId(n.getUser() != null ? n.getUser().getId() : null)
                .message(n.getMessage())
                .readStatus(n.getReadStatus())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
