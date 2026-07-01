package com.hps.switchmonitoring.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hps.switchmonitoring.repository.AppUserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.Set;

/**
 * Vérifie à chaque requête API que l'utilisateur identifié par X-User-Email
 * n'a pas été bloqué par un administrateur depuis sa dernière connexion.
 *
 * Les routes publiques (login, activate, reset-password) sont exclues.
 */
@Component
public class BlockedUserFilter extends OncePerRequestFilter {

    private static final Set<String> PUBLIC_PATHS = Set.of(
        "/api/v1/auth/login",
        "/api/v1/auth/activate",
        "/api/v1/auth/forgot-password",
        "/api/v1/auth/reset-password",
        "/api/v1/auth/token-info",
        "/api/v1/auth/reset-token-info"
    );

    private final AppUserRepository userRepository;
    private final ObjectMapper      objectMapper;

    public BlockedUserFilter(AppUserRepository userRepository, ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.objectMapper   = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return PUBLIC_PATHS.stream().anyMatch(path::startsWith);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String email = request.getHeader("X-User-Email");

        if (email != null && !email.isBlank()) {
            boolean blocked = userRepository.findByEmail(email.trim().toLowerCase())
                .map(u -> "BLOCKED".equalsIgnoreCase(u.getStatus()) || !u.isActive())
                .orElse(false);

            if (blocked) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                objectMapper.writeValue(response.getWriter(),
                    Map.of("error", "Compte bloqué ou désactivé. Contactez votre administrateur."));
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}
