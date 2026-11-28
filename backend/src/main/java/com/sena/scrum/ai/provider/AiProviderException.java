package com.sena.scrum.ai.provider;

import lombok.Getter;

@Getter
public class AiProviderException extends RuntimeException {

    private final int statusCode;
    private final String code;

    public AiProviderException(String message, int statusCode, String code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
    }

    public AiProviderException(String message, int statusCode, String code, Throwable cause) {
        super(message, cause);
        this.statusCode = statusCode;
        this.code = code;
    }
}
