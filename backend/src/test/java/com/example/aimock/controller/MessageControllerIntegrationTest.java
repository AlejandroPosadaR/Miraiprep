package com.example.aimock.controller;

import com.example.aimock.messages.MessageRepository;
import com.example.aimock.messages.model.Message;
import com.example.aimock.messages.model.MessageRole;
import com.example.aimock.session.InterviewSession;
import com.example.aimock.session.InterviewSessionRepository;
import com.example.aimock.session.Status;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class MessageControllerIntegrationTest extends AbstractControllerIntegrationTest {

    @Autowired
    private InterviewSessionRepository sessionRepository;

    @Autowired
    private MessageRepository messageRepository;

    private String token;
    private InterviewSession ownedSession;

    @BeforeEach
    void setUpAuth() throws Exception {
        token = loginAndGetToken();
        ownedSession = sessionRepository.save(InterviewSession.builder()
                .userId(testUser.getId())
                .title("Session")
                .interviewType("TECHNICAL")
                .status(Status.STARTED)
                .build());
    }

    @Nested
    @DisplayName("GET /api/v1/sessions/{sessionId}/messages/")
    class GetMessages {
        @Test
        void returns200WithMessagesWhenOwner() throws Exception {
            Message m = Message.user("Hello", ownedSession.getId(), 1L);
            messageRepository.save(m);

            mockMvc.perform(get("/api/v1/sessions/" + ownedSession.getId() + "/messages/")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$[0].content").value("Hello"))
                    .andExpect(jsonPath("$[0].role").value(MessageRole.USER.name()));
        }

        @Test
        void returns200EmptyListWhenNoMessages() throws Exception {
            mockMvc.perform(get("/api/v1/sessions/" + ownedSession.getId() + "/messages/")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$").isEmpty());
        }

        @Test
        void returns404WhenSessionNotOwned() throws Exception {
            InterviewSession other = sessionRepository.save(InterviewSession.builder()
                    .userId(UUID.randomUUID())
                    .title("Other")
                    .interviewType("TECH")
                    .status(Status.STARTED)
                    .build());

            mockMvc.perform(get("/api/v1/sessions/" + other.getId() + "/messages/")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isNotFound());
        }

        @Test
        void returns401Or403WhenUnauthenticated() throws Exception {
            mockMvc.perform(get("/api/v1/sessions/" + ownedSession.getId() + "/messages/"))
                    .andExpect(status().is4xxClientError());
        }
    }

}
