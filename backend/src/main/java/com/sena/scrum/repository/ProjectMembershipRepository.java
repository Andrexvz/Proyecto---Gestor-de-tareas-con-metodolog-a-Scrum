package com.sena.scrum.repository;

import com.sena.scrum.model.entity.ProjectMembership;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectMembershipRepository extends JpaRepository<ProjectMembership, Long> {
    List<ProjectMembership> findByProjectId(Long projectId);
    List<ProjectMembership> findByUserId(Long userId);
    Optional<ProjectMembership> findByProjectIdAndUserId(Long projectId, Long userId);
}
