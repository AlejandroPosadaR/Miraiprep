package com.example.aimock.controller;

import com.example.aimock.session.InterviewSession;
import com.example.aimock.session.InterviewSessionRepository;
import com.example.aimock.session.Status;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class InterviewSessionControllerIntegrationTest extends AbstractControllerIntegrationTest {

    @Autowired
    private InterviewSessionRepository sessionRepository;

    private String token;
    private InterviewSession ownedSession;

    @BeforeEach
    void setUpAuth() throws Exception {
        token = loginAndGetToken();
        ownedSession = sessionRepository.save(InterviewSession.builder()
                .userId(testUser.getId())
                .title("My Session")
                .interviewType("TECHNICAL")
                .status(Status.STARTED)
                .build());
    }

    @Nested
    @DisplayName("POST /api/v1/interview-sessions")
    class Create {
        @Test
        void returns200WhenValid() throws Exception {
            String body = objectMapper.writeValueAsString(Map.of(
                    "userId", testUser.getId().toString(),
                    "title", "New Interview",
                    "interviewType", "BEHAVIORAL"
            ));

            mockMvc.perform(post("/api/v1/interview-sessions")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.title").value("New Interview"))
                    .andExpect(jsonPath("$.interviewType").value("BEHAVIORAL"))
                    .andExpect(jsonPath("$.userId").value(testUser.getId().toString()))
                    .andExpect(jsonPath("$.status").value(Status.PENDING.name()));
        }

        @Test
        void returns401Or403WhenUnauthenticated() throws Exception {
            String body = objectMapper.writeValueAsString(Map.of(
                    "userId", testUser.getId().toString(),
                    "title", "T",
                    "interviewType", "TECH"
            ));
            mockMvc.perform(post("/api/v1/interview-sessions")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().is4xxClientError());
        }
    }

    @Nested
    @DisplayName("GET /api/v1/interview-sessions")
    class List {
        @Test
        void returns200WithUserSessions() throws Exception {
            mockMvc.perform(get("/api/v1/interview-sessions")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray())
                    .andExpect(jsonPath("$[0].id").value(ownedSession.getId().toString()))
                    .andExpect(jsonPath("$[0].title").value("My Session"));
        }

        @Test
        void returns401Or403WhenUnauthenticated() throws Exception {
            mockMvc.perform(get("/api/v1/interview-sessions"))
                    .andExpect(status().is4xxClientError());
        }
    }

    @Nested
    @DisplayName("PUT /api/v1/interview-sessions/{id}/complete")
    class Complete {
        @Test
        void returns200AndCompletedSession() throws Exception {
            mockMvc.perform(put("/api/v1/interview-sessions/" + ownedSession.getId() + "/complete")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value(Status.COMPLETED.name()))
                    .andExpect(jsonPath("$.endedAt").isNotEmpty());
        }

        @Test
        void returns404WhenSessionNotOwned() throws Exception {
            InterviewSession otherSession = sessionRepository.save(InterviewSession.builder()
                    .userId(UUID.randomUUID())
                    .title("Other")
                    .interviewType("TECH")
                    .status(Status.STARTED)
                    .build());

            mockMvc.perform(put("/api/v1/interview-sessions/" + otherSession.getId() + "/complete")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("PUT /api/v1/interview-sessions/{id}/abort")
    class Abort {
        @Test
        void returns200AndAbortedSession() throws Exception {
            mockMvc.perform(put("/api/v1/interview-sessions/" + ownedSession.getId() + "/abort")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value(Status.ABORTED.name()))
                    .andExpect(jsonPath("$.endedAt").isNotEmpty());
        }
    }

    @Nested
    @DisplayName("GET /api/v1/interview-sessions/paginated")
    class Paginated {
        @Test
        void returns200WithPaginatedSessions() throws Exception {
            mockMvc.perform(get("/api/v1/interview-sessions/paginated")
                            .header("Authorization", "Bearer " + token)
                            .param("limit", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.sessions").isArray())
                    .andExpect(jsonPath("$.sessions[0].id").value(ownedSession.getId().toString()))
                    .andExpect(jsonPath("$.totalCount").isNumber())
                    .andExpect(jsonPath("$.hasMore").isBoolean());
        }

        @Test
        void returns200WithLimitedResults() throws Exception {
            sessionRepository.save(InterviewSession.builder()
                    .userId(testUser.getId())
                    .title("Session 2")
                    .interviewType("BEHAVIORAL")
                    .status(Status.PENDING)
                    .build());
            sessionRepository.save(InterviewSession.builder()
                    .userId(testUser.getId())
                    .title("Session 3")
                    .interviewType("OOP")
                    .status(Status.PENDING)
                    .build());

            mockMvc.perform(get("/api/v1/interview-sessions/paginated")
                            .header("Authorization", "Bearer " + token)
                            .param("limit", "2"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.sessions").isArray())
                    .andExpect(jsonPath("$.sessions.length()").value(2))
                    .andExpect(jsonPath("$.hasMore").value(true))
                    .andExpect(jsonPath("$.nextCursor").isNotEmpty());
        }

        @Test
        void returns401WhenUnauthenticated() throws Exception {
            mockMvc.perform(get("/api/v1/interview-sessions/paginated"))
                    .andExpect(status().is4xxClientError());
        }
    }

    @Nested
    @DisplayName("GET /api/v1/interview-sessions/{id}")
    class GetById {
        @Test
        void returns200WhenOwned() throws Exception {
            mockMvc.perform(get("/api/v1/interview-sessions/" + ownedSession.getId())
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(ownedSession.getId().toString()))
                    .andExpect(jsonPath("$.title").value("My Session"));
        }

        @Test
        void returns404WhenNotOwned() throws Exception {
            InterviewSession otherSession = sessionRepository.save(InterviewSession.builder()
                    .userId(UUID.randomUUID())
                    .title("Other User Session")
                    .interviewType("TECH")
                    .status(Status.STARTED)
                    .build());

            mockMvc.perform(get("/api/v1/interview-sessions/" + otherSession.getId())
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("POST /api/v1/interview-sessions with job description")
    class CreateWithJobDescription {
        @Test
        void returns200AndSavesJobDescription() throws Exception {
            String body = objectMapper.writeValueAsString(Map.of(
                    "userId", testUser.getId().toString(),
                    "title", "Backend Developer Interview",
                    "interviewType", "TECHNICAL",
                    "experienceYears", 5,
                    "jobDescription", "We are looking for a senior Java developer with Spring Boot experience."
            ));

            mockMvc.perform(post("/api/v1/interview-sessions")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.title").value("Backend Developer Interview"))
                    .andExpect(jsonPath("$.jobDescription").value("We are looking for a senior Java developer with Spring Boot experience."))
                    .andExpect(jsonPath("$.experienceYears").value(5));
        }

        @Test
        void returns200WithNullJobDescription() throws Exception {
            String body = objectMapper.writeValueAsString(Map.of(
                    "userId", testUser.getId().toString(),
                    "title", "Quick Interview",
                    "interviewType", "BEHAVIORAL",
                    "experienceYears", 2
            ));

            mockMvc.perform(post("/api/v1/interview-sessions")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.title").value("Quick Interview"))
                    .andExpect(jsonPath("$.jobDescription").doesNotExist());
        }
    }

}
