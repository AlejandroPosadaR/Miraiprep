package com.example.aimock.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AuthControllerIntegrationTest extends AbstractControllerIntegrationTest {

    @Nested
    @DisplayName("POST /api/auth/register")
    class Register {
        @Test
        void returns201AndTokenWhenValid() throws Exception {
            String body = objectMapper.writeValueAsString(Map.of(
                    "email", "new@example.com",
                    "username", "newuser",
                    "password", "pass1234",
                    "firstName", "New",
                    "lastName", "User"
            ));

            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.token").isNotEmpty())
                    .andExpect(jsonPath("$.userId").isNotEmpty())
                    .andExpect(jsonPath("$.email").value("new@example.com"))
                    .andExpect(jsonPath("$.username").value("newuser"))
                    .andExpect(jsonPath("$.message").value("Registration successful"));
        }

        @Test
        void returns409WhenEmailExists() throws Exception {
            String body = objectMapper.writeValueAsString(Map.of(
                    "email", TEST_EMAIL,
                    "username", "otheruser",
                    "password", "pass1234",
                    "firstName", "Other",
                    "lastName", "User"
            ));

            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.error").value("Conflict"))
                    .andExpect(jsonPath("$.message", containsString("email")));
        }

        @Test
        void returns409WhenUsernameExists() throws Exception {
            String body = objectMapper.writeValueAsString(Map.of(
                    "email", "other@example.com",
                    "username", TEST_USERNAME,
                    "password", "pass1234",
                    "firstName", "Other",
                    "lastName", "User"
            ));

            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.error").value("Conflict"))
                    .andExpect(jsonPath("$.message", containsString("username")));
        }

        @Test
        void returns400WhenValidationFails() throws Exception {
            String body = objectMapper.writeValueAsString(Map.of(
                    "email", "invalid",
                    "username", "ab",
                    "password", "short",
                    "firstName", "",
                    "lastName", ""
            ));

            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Validation Failed"));
        }
    }

    @Nested
    @DisplayName("POST /api/auth/login")
    class Login {
        @Test
        void returns200AndTokenWhenValid() throws Exception {
            String body = objectMapper.writeValueAsString(Map.of(
                    "email", TEST_EMAIL,
                    "password", TEST_PASSWORD
            ));

            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.token").isNotEmpty())
                    .andExpect(jsonPath("$.email").value(TEST_EMAIL))
                    .andExpect(jsonPath("$.username").value(TEST_USERNAME))
                    .andExpect(jsonPath("$.message").value("Login successful"));
        }

        @Test
        void returns401WhenWrongPassword() throws Exception {
            String body = objectMapper.writeValueAsString(Map.of(
                    "email", TEST_EMAIL,
                    "password", "wrongpassword"
            ));

            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.message").value("Invalid email or password"));
        }

        @Test
        void returns401WhenUserNotFound() throws Exception {
            String body = objectMapper.writeValueAsString(Map.of(
                    "email", "nonexistent@example.com",
                    "password", "any"
            ));

            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("GET /api/auth/me")
    class Me {
        @Test
        void returns200AndUserWhenAuthenticated() throws Exception {
            String token = loginAndGetToken();

            mockMvc.perform(get("/api/auth/me")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.userId").value(testUser.getId().toString()))
                    .andExpect(jsonPath("$.email").value(TEST_EMAIL))
                    .andExpect(jsonPath("$.username").value(TEST_USERNAME))
                    .andExpect(jsonPath("$.firstName").value("Test"))
                    .andExpect(jsonPath("$.lastName").value("User"));
        }

        @Test
        void returns401Or403WhenNoToken() throws Exception {
            mockMvc.perform(get("/api/auth/me"))
                    .andExpect(status().is4xxClientError());
        }
    }

}
