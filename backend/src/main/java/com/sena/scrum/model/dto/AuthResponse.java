package com.sena.scrum.model.dto;

import com.sena.scrum.model.enums.Role;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {

    private String token;

    @Builder.Default
    private String type = "Bearer";

    private Long id;
    private String email;
    private String fullName;
    private Role role;
    private String title;
}
