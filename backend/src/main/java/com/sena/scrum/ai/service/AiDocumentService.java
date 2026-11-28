package com.sena.scrum.ai.service;

import com.sena.scrum.ai.provider.AiProviderException;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.w3c.dom.Document;
import org.w3c.dom.NodeList;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * Safe document parser for TXT, MD, CSV, DOCX, XLSX, and PDF.
 * Treats all uploaded files as untrusted data: enforces size/extension limits,
 * disables XML External Entities (XXE), and strips control characters/scripts.
 */
@Slf4j
@Service
public class AiDocumentService {

    private static final long MAX_FILE_BYTES = 5L * 1024L * 1024L; // 5 MB
    private static final int MAX_EXTRACTED_CHARS = 18_000;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("txt", "md", "csv", "docx", "xlsx", "pdf");

    public ParsedDocument parseFile(MultipartFile file) throws AiProviderException {
        if (file == null || file.isEmpty()) {
            throw new AiProviderException("El archivo adjunto está vacío.", 400, "EMPTY_FILE");
        }
        if (file.getSize() > MAX_FILE_BYTES) {
            throw new AiProviderException("El archivo excede el límite máximo permitido de 5 MB.", 400, "FILE_TOO_LARGE");
        }

        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename().trim() : "documento";
        String ext = getExtension(originalName);
        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            throw new AiProviderException(
                    "Formato no compatible ('." + ext + "'). Formatos permitidos: PDF, DOCX, TXT, MD, CSV y XLSX.",
                    400,
                    "UNSUPPORTED_FILE_TYPE"
            );
        }

        try {
            byte[] bytes = file.getBytes();
            String rawText = switch (ext) {
                case "txt", "md", "csv" -> new String(bytes, StandardCharsets.UTF_8);
                case "docx" -> extractDocxText(bytes);
                case "xlsx" -> extractXlsxText(bytes);
                case "pdf" -> extractPdfTextBasic(bytes);
                default -> "";
            };

            String sanitized = sanitizeExtractedText(rawText);
            boolean truncated = sanitized.length() > MAX_EXTRACTED_CHARS;
            if (truncated) {
                sanitized = sanitized.substring(0, MAX_EXTRACTED_CHARS) + "\n[... contenido truncado por límite de seguridad ...]";
            }

            return ParsedDocument.builder()
                    .fileName(originalName.replaceAll("[^a-zA-Z0-9._\\- ]", "_"))
                    .extension(ext)
                    .sizeBytes(file.getSize())
                    .charCount(sanitized.length())
                    .truncated(truncated)
                    .extractedText(sanitized)
                    .build();
        } catch (AiProviderException e) {
            throw e;
        } catch (Exception e) {
            log.warn("[AiDocumentService] Failed parsing {}: {}", originalName, e.getMessage());
            throw new AiProviderException("No se pudo leer el contenido del documento de forma segura.", 400, "FILE_PARSE_ERROR");
        }
    }

    private String extractDocxText(byte[] bytes) throws Exception {
        StringBuilder sb = new StringBuilder();
        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(bytes))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if ("word/document.xml".equals(entry.getName())) {
                    Document doc = parseXmlSafely(zis);
                    NodeList paragraphs = doc.getElementsByTagNameNS("*", "p");
                    for (int i = 0; i < paragraphs.getLength(); i++) {
                        String line = paragraphs.item(i).getTextContent();
                        if (line != null && !line.isBlank()) {
                            sb.append(line.trim()).append("\n");
                        }
                    }
                    break;
                }
            }
        }
        return sb.toString();
    }

    private String extractXlsxText(byte[] bytes) throws Exception {
        List<String> sharedStrings = new ArrayList<>();
        List<String> sheetXmls = new ArrayList<>();

        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(bytes))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if ("xl/sharedStrings.xml".equals(entry.getName())) {
                    Document doc = parseXmlSafely(zis);
                    NodeList si = doc.getElementsByTagNameNS("*", "si");
                    for (int i = 0; i < si.getLength(); i++) {
                        sharedStrings.add(si.item(i).getTextContent());
                    }
                } else if (entry.getName().startsWith("xl/worksheets/sheet") && entry.getName().endsWith(".xml")) {
                    sheetXmls.add(new String(zis.readAllBytes(), StandardCharsets.UTF_8));
                }
            }
        }

        StringBuilder sb = new StringBuilder();
        int sheetIdx = 1;
        for (String xml : sheetXmls) {
            sb.append("--- Hoja ").append(sheetIdx++).append(" ---\n");
            Document doc = parseXmlSafely(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)));
            NodeList rows = doc.getElementsByTagNameNS("*", "row");
            for (int r = 0; r < rows.getLength(); r++) {
                NodeList cells = rows.item(r).getChildNodes();
                List<String> rowVals = new ArrayList<>();
                for (int c = 0; c < cells.getLength(); c++) {
                    var cell = cells.item(c);
                    if (cell.getAttributes() == null) continue;
                    var typeAttr = cell.getAttributes().getNamedItem("t");
                    String val = cell.getTextContent() != null ? cell.getTextContent().trim() : "";
                    if (typeAttr != null && "s".equals(typeAttr.getNodeValue()) && !val.isEmpty()) {
                        try {
                            int idx = Integer.parseInt(val);
                            if (idx >= 0 && idx < sharedStrings.size()) val = sharedStrings.get(idx);
                        } catch (NumberFormatException ignored) {}
                    }
                    if (!val.isEmpty()) rowVals.add(val);
                }
                if (!rowVals.isEmpty()) {
                    sb.append(String.join(" | ", rowVals)).append("\n");
                }
            }
        }
        return sb.toString();
    }

    private String extractPdfTextBasic(byte[] bytes) {
        // Lightweight safe PDF text extraction without executing embedded JS or actions
        String raw = new String(bytes, StandardCharsets.ISO_8859_1);
        if (!raw.startsWith("%PDF-")) {
            throw new IllegalArgumentException("Encabezado PDF inválido");
        }
        StringBuilder sb = new StringBuilder();
        Pattern tjPattern = Pattern.compile("\\(([^()\\\\]{2,300})\\)\\s*Tj");
        Matcher m = tjPattern.matcher(raw);
        while (m.find() && sb.length() < MAX_EXTRACTED_CHARS) {
            String segment = m.group(1).replaceAll("[^\\x20-\\x7E\\xA0-\\xFF]", " ").trim();
            if (!segment.isEmpty()) {
                sb.append(segment).append(" ");
            }
        }
        if (sb.length() < 20) {
            return "[PDF detectado. Si el PDF contiene texto escaneado como imagen o flujos comprimidos FlateDecode avanzados, exporta el texto a TXT/MD/DOCX para un análisis completo.]";
        }
        return sb.toString();
    }

    private Document parseXmlSafely(InputStream is) throws Exception {
        DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
        dbf.setNamespaceAware(true);
        dbf.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        dbf.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        dbf.setFeature("http://xml.org/sax/features/external-general-entities", false);
        dbf.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        dbf.setXIncludeAware(false);
        dbf.setExpandEntityReferences(false);
        return dbf.newDocumentBuilder().parse(new NonClosingInputStream(is));
    }

    private String sanitizeExtractedText(String text) {
        if (text == null) return "";
        return text
                .replace("\0", "")
                .replaceAll("<script[^>]*>[\\s\\S]*?</script>", "")
                .replaceAll("[\\p{Cntrl}&&[^\r\n\t]]", "")
                .trim();
    }

    private String getExtension(String name) {
        int idx = name.lastIndexOf('.');
        return idx >= 0 ? name.substring(idx + 1).toLowerCase(Locale.ROOT) : "";
    }

    private static class NonClosingInputStream extends InputStream {
        private final InputStream delegate;
        NonClosingInputStream(InputStream delegate) { this.delegate = delegate; }
        @Override public int read() throws java.io.IOException { return delegate.read(); }
        @Override public int read(byte[] b, int off, int len) throws java.io.IOException { return delegate.read(b, off, len); }
        @Override public void close() {}
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class ParsedDocument {
        private String fileName;
        private String extension;
        private long sizeBytes;
        private int charCount;
        private boolean truncated;
        private String extractedText;
    }
}
