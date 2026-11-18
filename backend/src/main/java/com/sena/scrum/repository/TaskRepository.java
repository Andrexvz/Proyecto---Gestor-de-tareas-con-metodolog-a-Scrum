package com.sena.scrum.repository;

import com.sena.scrum.model.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByUserStoryId(Long userStoryId);

    @Query("SELECT t FROM Task t WHERE t.userStory.sprint.id = :sprintId")
    List<Task> findBySprintId(@Param("sprintId") Long sprintId);

    List<Task> findByAssignedToId(Long assignedToId);

    long countByUserStoryId(Long userStoryId);
}
