package com.example.aimock.controller;

import com.example.aimock.auth.user.User;
import com.example.aimock.auth.user.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import java.util.Map;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@org.springframework.transaction.annotation.Transactional
public abstract class AbstractControllerIntegrationTest {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected UserRepository userRepository;

    @Autowired
    protected PasswordEncoder passwordEncoder;

    @Autowired
    protected ObjectMapper objectMapper;

    @PersistenceContext
    protected EntityManager entityManager;

    protected static final String TEST_EMAIL = "test@example.com";
    protected static final String TEST_PASSWORD = "password123";
    protected static final String TEST_USERNAME = "testuser";
    protected User testUser;

    @BeforeEach
    void createTestUser() {
        testUser = User.builder()
                .email(TEST_EMAIL)
                .password(passwordEncoder.encode(TEST_PASSWORD))
                .username(TEST_USERNAME)
                .firstName("Test")
                .lastName("User")
                .enabled(true)
                .emailVerified(false)
                .build();
        testUser = userRepository.save(testUser);
        entityManager.flush();
        entityManager.clear();
    }

    protected String loginAndGetToken() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "email", TEST_EMAIL,
                "password", TEST_PASSWORD
        ));
        ResultActions result = mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
        String json = result.andReturn().getResponse().getContentAsString();
        JsonNode node = objectMapper.readTree(json);
        JsonNode tokenNode = node.get("token");
        if (tokenNode == null) {
            throw new AssertionError("Login failed, no token in response: " + json);
        }
        return tokenNode.asText();
    }
}
