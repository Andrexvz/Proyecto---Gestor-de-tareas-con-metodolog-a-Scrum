package com.sena.scrum.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String SECURITY_SCHEME_NAME = "Bearer Authentication";

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME_NAME))
                .components(new Components()
                        .addSecuritySchemes(SECURITY_SCHEME_NAME, new SecurityScheme()
                                .name(SECURITY_SCHEME_NAME)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Ingrese su token JWT en el formato: Bearer {token}")
                        )
                )
                .info(new Info()
                        .title("Agile Velocity - Backend API REST (Semana 2 - Sprint 2)")
                        .description("API REST para la gestión integral de tareas y proyectos bajo Metodología Scrum (SENA). " +
                                "Incluye autenticación JWT, control de acceso basado en roles (RBAC: Product Owner, Scrum Master, Developer, Administrador), " +
                                "gestión de Sprints, Product Backlog, estimaciones, Kanban board y generación de historias con IA.")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Equipo de Desarrollo SENA")
                                .email("contacto@velocity.dev")
                        )
                        .license(new License()
                                .name("Apache 2.0")
                                .url("https://www.apache.org/licenses/LICENSE-2.0")
                        )
                );
    }
}
