package com.sena.scrum;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sena.scrum.ai.config.AiProperties;
import com.sena.scrum.ai.model.AiMode;
import com.sena.scrum.ai.provider.*;
import com.sena.scrum.ai.service.AiConversationStore;
import com.sena.scrum.ai.service.AiDocumentService;
import com.sena.scrum.ai.service.AiKnowledgeService;
import com.sena.scrum.ai.service.AiResponseCacheService;
import com.sena.scrum.ai.service.AiUsageService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

class AiModuleTests {

    @Test
    @DisplayName("AI 1. ModelRouter - Selección automática de modo según intención y estado sin API Key")
    void testModelRouterModeAndUnconfiguredState() {
        AiProperties props = new AiProperties();
        ObjectMapper mapper = new ObjectMapper();
        AiModelRouter router = new AiModelRouter(
                props,
                new GeminiProviderAdapter(props, mapper),
                new OpenAiCompatibleProviderAdapter(props, mapper)
        );

        assertFalse(router.isAnyProviderConfigured());
        assertEquals(AiMode.DOCUMENTS, router.resolveEffectiveMode(AiMode.AUTO, "Resume esto", true));
        assertEquals(AiMode.AGENT, router.resolveEffectiveMode(AiMode.AUTO, "Crea una historia de usuario", false));
        assertEquals(AiMode.TUTOR, router.resolveEffectiveMode(AiMode.AUTO, "Cómo usar Kanban", false));
        assertEquals(AiMode.DEEP, router.resolveEffectiveMode(AiMode.AUTO, "Analiza los riesgos del Sprint", false));
        assertEquals(AiMode.FAST, router.resolveEffectiveMode(AiMode.AUTO, "Hola", false));

        // Verify Ollama defaults: Qwen2.5 3B fast, Qwen3 4B deep
        AiProperties ollamaProps = new AiProperties();
        ollamaProps.setProvider("ollama");
        ollamaProps.setOllamaEnabled("true");
        OpenAiCompatibleProviderAdapter ollamaAdapter = new OpenAiCompatibleProviderAdapter(ollamaProps, mapper);
        assertEquals("qwen2.5:3b", ollamaAdapter.resolveModel(false));
        assertEquals("qwen3:4b", ollamaAdapter.resolveModel(true));
        AiModelRouter ollamaRouter = new AiModelRouter(ollamaProps, new GeminiProviderAdapter(ollamaProps, mapper), ollamaAdapter);
        assertFalse(ollamaRouter.isDeepReasoningMode(AiMode.FAST));
        assertFalse(ollamaRouter.isDeepReasoningMode(AiMode.TUTOR));
        assertFalse(ollamaRouter.isDeepReasoningMode(AiMode.AGENT));
        assertTrue(ollamaRouter.isDeepReasoningMode(AiMode.DEEP));
        assertTrue(ollamaRouter.isDeepReasoningMode(AiMode.DOCUMENTS));
        assertEquals("qwen2.5:3b", ollamaRouter.resolveModelForRequest(AiMode.AUTO, AiMode.DEEP));
        assertEquals("qwen2.5:3b", ollamaRouter.resolveModelForRequest(AiMode.FAST, AiMode.FAST));
        assertEquals("qwen3:4b", ollamaRouter.resolveModelForRequest(AiMode.DEEP, AiMode.DEEP));
    }

    @Test
    @DisplayName("AI 6. ResponseCache - Aislamiento por usuario/rol e invalidación por fingerprint")
    void testResponseCacheIsolationAndInvalidation() {
        AiResponseCacheService cache = new AiResponseCacheService();
        String k1 = cache.buildKey(1L, "SCRUM_MASTER", 10L, AiMode.AUTO, AiMode.FAST, "fp_v1", "estado");
        String k2 = cache.buildKey(2L, "DEVELOPER", 10L, AiMode.AUTO, AiMode.FAST, "fp_v1", "estado");
        String k1Updated = cache.buildKey(1L, "SCRUM_MASTER", 10L, AiMode.AUTO, AiMode.FAST, "fp_v2", "estado");

        cache.put(k1, "Respuesta segura", "qwen2.5:3b", "ollama");
        assertTrue(cache.get(k1).isPresent());
        assertTrue(cache.get(k2).isEmpty());
        assertTrue(cache.get(k1Updated).isEmpty());
        assertFalse(cache.isCacheable(AiMode.AGENT, AiMode.AGENT, false));
        assertFalse(cache.isCacheable(AiMode.FAST, AiMode.FAST, true));
    }

    @Test
    @DisplayName("AI 2. UsageService - Límites de concurrencia, RPM y presupuesto diario por usuario")
    void testUsageServiceLimits() throws Exception {
        AiProperties props = new AiProperties();
        props.setMaxConcurrentPerUser(1);
        props.setMaxRequestsPerMinutePerUser(2);
        props.setDailyTokenBudgetPerUser(100);

        AiUsageService usage = new AiUsageService(props);
        usage.acquirePermit(99L);
        AiProviderException concEx = assertThrows(AiProviderException.class, () -> usage.acquirePermit(99L));
        assertEquals("AI_CONCURRENCY_LIMIT", concEx.getCode());
        usage.releasePermit(99L);

        usage.recordUsage(99L, 120);
        AiProviderException budgetEx = assertThrows(AiProviderException.class, () -> usage.acquirePermit(99L));
        assertEquals("AI_DAILY_BUDGET_EXCEEDED", budgetEx.getCode());
    }

    @Test
    @DisplayName("AI 3. DocumentService - Sanitización XSS y rechazo de extensiones peligrosas")
    void testDocumentSanitizationAndValidation() throws Exception {
        AiDocumentService docService = new AiDocumentService();

        MockMultipartFile exe = new MockMultipartFile("file", "payload.exe", "application/octet-stream", "MZ".getBytes());
        AiProviderException ex = assertThrows(AiProviderException.class, () -> docService.parseFile(exe));
        assertEquals("UNSUPPORTED_FILE_TYPE", ex.getCode());

        MockMultipartFile md = new MockMultipartFile(
                "file",
                "req.md",
                "text/markdown",
                "# Requisitos\n<script>alert('xss')</script>\nRF1: Login seguro".getBytes(StandardCharsets.UTF_8)
        );
        AiDocumentService.ParsedDocument parsed = docService.parseFile(md);
        assertEquals("md", parsed.getExtension());
        assertFalse(parsed.getExtractedText().contains("<script>"));
        assertTrue(parsed.getExtractedText().contains("RF1: Login seguro"));
    }

    @Test
    @DisplayName("AI 4. KnowledgeService - Recupera rutas reales y reglas canónicas sin inventar")
    void testKnowledgeRetrieval() {
        AiKnowledgeService kb = new AiKnowledgeService();
        String ctx = kb.retrieveRelevantContext("por qué no puedo mover una tarea con impedimento a hecho en kanban");
        assertTrue(ctx.contains("409"));
        assertTrue(ctx.contains("Scrum Master"));
    }

    @Test
    @DisplayName("AI 5. ConversationStore - Aislamiento estricto por usuario y chats temporales")
    void testConversationUserIsolation() {
        AiConversationStore store = new AiConversationStore(new ObjectMapper());
        var conv = store.createConversation(1001L, 1L, "Chat Privado", AiMode.FAST, false);
        assertTrue(store.getConversation(1001L, conv.getId()).isPresent());
        assertTrue(store.getConversation(2002L, conv.getId()).isEmpty());
        assertFalse(store.renameConversation(2002L, conv.getId(), "Hack"));
        assertFalse(store.deleteConversation(2002L, conv.getId()));
        assertTrue(store.deleteConversation(1001L, conv.getId()));

        var temp = store.createConversation(1001L, 1L, "Temporal", AiMode.FAST, true);
        assertTrue(store.getConversation(1001L, temp.getId()).isEmpty());
    }
}
