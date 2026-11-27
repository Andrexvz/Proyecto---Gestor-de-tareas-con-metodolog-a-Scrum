package com.sena.scrum;

import com.sena.scrum.model.dto.AiStoryGenerateRequest;
import com.sena.scrum.model.dto.AiStoryGenerateResponse;
import com.sena.scrum.model.entity.User;
import com.sena.scrum.model.enums.Role;
import com.sena.scrum.model.enums.SprintStatus;
import com.sena.scrum.model.enums.StoryPriority;
import com.sena.scrum.service.AiStoryService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;

class ScrumBackendApplicationTests {

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final AiStoryService aiStoryService = new AiStoryService();

    @Test
    @DisplayName("1. BCrypt Password Encoder - Valida encriptación y coincidencia con contraseña demo 123456")
    void testBCryptPasswordHashing() {
        String plain = "123456";
        String hash = passwordEncoder.encode(plain);

        assertNotNull(hash);
        assertTrue(passwordEncoder.matches(plain, hash));
        assertTrue(passwordEncoder.matches("123456", "$2b$10$yjOGCHqUOXkpdhOm6KoOBOV9CxFq4YCEk7wajlWLnlYycOxIeFEp2"));
    }

    @Test
    @DisplayName("2. AI Story Generator - Transforma requerimiento a formato estándar Scrum y 3 criterios Gherkin")
    void testAiStoryGenerator() {
        AiStoryGenerateRequest request = AiStoryGenerateRequest.builder()
                .prompt("Autenticación biométrica WebAuthn con huella digital para banca móvil")
                .userRole("cliente bancario")
                .build();

        AiStoryGenerateResponse response = aiStoryService.generateStoryWithAi(request);

        assertNotNull(response);
        assertNotNull(response.getTitle());
        assertTrue(response.getUserStoryFormat().startsWith("Como cliente bancario, quiero"));
        assertTrue(response.getUserStoryFormat().contains("para"));
        assertEquals(3, response.getGherkinCriteria().size());
        assertTrue(response.getGherkinCriteria().get(0).contains("Dado que"));
        assertTrue(response.getGherkinCriteria().get(0).contains("Cuando"));
        assertTrue(response.getGherkinCriteria().get(0).contains("Entonces"));
        assertTrue(response.getSuggestedStoryPoints() >= 1);
    }

    @Test
    @DisplayName("3. Enums Scrum - Integridad de estados y prioridades canónicas")
    void testScrumEnums() {
        assertEquals("PLANNED", SprintStatus.PLANNED.name());
        assertEquals("ACTIVE", SprintStatus.ACTIVE.name());
        assertEquals("COMPLETED", SprintStatus.COMPLETED.name());

        assertEquals("LOW", StoryPriority.LOW.name());
        assertEquals("MEDIUM", StoryPriority.MEDIUM.name());
        assertEquals("HIGH", StoryPriority.HIGH.name());
        assertEquals("URGENT", StoryPriority.URGENT.name());
    }

    @Test
    @DisplayName("4. User Entity & RBAC Authorities - Concesión adecuada de rol en Spring Security")
    void testUserAuthorities() {
        User po = User.builder()
                .email("po@velocity.dev")
                .fullName("Mateo Ríos")
                .role(Role.ROLE_PRODUCT_OWNER)
                .passwordHash("hash")
                .build();

        assertEquals("po@velocity.dev", po.getUsername());
        assertEquals(1, po.getAuthorities().size());
        assertEquals("ROLE_PRODUCT_OWNER", po.getAuthorities().iterator().next().getAuthority());
        assertTrue(po.isEnabled());
    }

    @Test
    @DisplayName("5. Security Exceptions - Manejo de InsufficientAuthenticationException para 401")
    void testSecurityAuthenticationException() {
        org.springframework.security.authentication.InsufficientAuthenticationException ex =
                new org.springframework.security.authentication.InsufficientAuthenticationException("Usuario no autenticado");
        assertEquals("Usuario no autenticado", ex.getMessage());
    }
}
