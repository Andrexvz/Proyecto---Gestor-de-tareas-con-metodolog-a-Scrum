package com.sena.scrum.model.converter;

import com.sena.scrum.model.enums.SprintStatus;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class SprintStatusConverter implements AttributeConverter<SprintStatus, String> {

    @Override
    public String convertToDatabaseColumn(SprintStatus attribute) {
        if (attribute == null) {
            return null;
        }
        return attribute.name();
    }

    @Override
    public SprintStatus convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return null;
        }
        String upper = dbData.trim().toUpperCase();
        if ("CLOSED".equals(upper) || "COMPLETED".equals(upper)) {
            return SprintStatus.COMPLETED;
        }
        if ("PLANNING".equals(upper) || "PLANNED".equals(upper)) {
            return SprintStatus.PLANNED;
        }
        if ("ACTIVE".equals(upper)) {
            return SprintStatus.ACTIVE;
        }
        return SprintStatus.valueOf(upper);
    }
}
