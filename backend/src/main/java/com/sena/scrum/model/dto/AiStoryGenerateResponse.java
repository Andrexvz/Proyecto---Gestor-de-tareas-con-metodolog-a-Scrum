package com.sena.scrum.model.dto;

import com.sena.scrum.model.enums.StoryPriority;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiStoryGenerateResponse {

    private String title;
    private String userStoryFormat; // "Como [rol], quiero [acción], para [beneficio]"
    private String description;
    private List<String> gherkinCriteria; // Criterios de aceptación en formato Given/When/Then (Gherkin)
    private String rawAcceptanceCriteria;
    private Integer suggestedStoryPoints;
    private StoryPriority suggestedPriority;
}
