package com.example.aimock.auth.jwt;

import com.example.aimock.auth.user.AuthUser;
import com.example.aimock.auth.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@ExtendWith(MockitoExtension.class)
class JwtServiceTest {

    private static final String SECRET = "5367566859703373367639792F423F452848284D6251655468576D5A71347437";
    private static final long EXPIRATION = 86400000L;

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secret", SECRET);
        ReflectionTestUtils.setField(jwtService, "expiration", EXPIRATION);
    }

    @Nested
    @DisplayName("generateToken")
    class GenerateToken {
        @Test
        void generatesValidToken() {
            UUID userId = UUID.randomUUID();
            String email = "test@example.com";

            String token = jwtService.generateToken(userId, email);

            assertThat(token).isNotBlank();
            assertThat(jwtService.extractUsername(token)).isEqualTo(email);
        }
    }

    @Nested
    @DisplayName("extractUsername")
    class ExtractUsername {
        @Test
        void extractsEmailFromToken() {
            String email = "user@test.com";
            String token = jwtService.generateToken(UUID.randomUUID(), email);

            assertThat(jwtService.extractUsername(token)).isEqualTo(email);
        }
    }

    @Nested
    @DisplayName("validateToken")
    class ValidateToken {
        @Test
        void returnsTrueWhenTokenValidAndUserMatches() {
            User user = User.builder()
                    .id(UUID.randomUUID())
                    .email("valid@test.com")
                    .password("encoded")
                    .username("validuser")
                    .firstName("John")
                    .lastName("Doe")
                    .enabled(true)
                    .emailVerified(false)
                    .build();
            AuthUser authUser = new AuthUser(user);
            String token = jwtService.generateToken(user.getId(), user.getEmail());

            assertThat(jwtService.validateToken(token, authUser)).isTrue();
        }

        @Test
        void returnsFalseWhenUserMismatch() {
            User user = User.builder()
                    .id(UUID.randomUUID())
                    .email("a@test.com")
                    .password("encoded")
                    .username("usera")
                    .firstName("A")
                    .lastName("B")
                    .enabled(true)
                    .emailVerified(false)
                    .build();
            AuthUser authUser = new AuthUser(user);
            String token = jwtService.generateToken(UUID.randomUUID(), "other@test.com");

            assertThat(jwtService.validateToken(token, authUser)).isFalse();
        }
    }
}
