package com.sena.scrum.model.dto;

import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.databind.JsonNode;
import com.sena.scrum.model.enums.StoryPriority;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserStoryRequest {

    private Long projectId;

    private Long epicId; // Opcional (vincular a Épica)

    private Long sprintId; // Opcional (null = Product Backlog)

    private String code;

    @NotBlank(message = "El título de la historia es requerido")
    private String title;

    @NotBlank(message = "La descripción de la historia es requerida")
    private String description;

    private String acceptanceCriteria;

    @JsonSetter("acceptanceCriteria")
    public void setAcceptanceCriteriaFromJson(JsonNode node) {
        if (node == null || node.isNull()) {
            this.acceptanceCriteria = null;
        } else if (node.isArray()) {
            List<String> list = new ArrayList<>();
            node.forEach(item -> list.add(item.asText()));
            this.acceptanceCriteria = String.join("\n", list);
        } else {
            this.acceptanceCriteria = node.asText();
        }
    }

    @Builder.Default
    private StoryPriority priority = StoryPriority.MEDIUM;

    @Min(value = 0, message = "Los Story Points deben ser al menos 0")
    @Builder.Default
    private Integer storyPoints = 1;

    @Builder.Default
    private Boolean isCompleted = false;
}
