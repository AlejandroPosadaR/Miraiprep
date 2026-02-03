package com.example.aimock.speech;

import com.example.aimock.controller.AbstractControllerIntegrationTest;
import com.example.aimock.speech.dto.SynthesisRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class SpeechControllerIntegrationTest extends AbstractControllerIntegrationTest {

    @Nested
    @DisplayName("POST /api/v1/speech/transcribe")
    class Transcribe {
        @Test
        @DisplayName("returns 401 when unauthenticated")
        void returns401WhenUnauthenticated() throws Exception {
            MockMultipartFile file = new MockMultipartFile(
                    "audio", "test.webm", "audio/webm", new byte[]{1, 2, 3, 4});

            mockMvc.perform(multipart("/api/v1/speech/transcribe")
                            .file(file))
                    .andExpect(status().is4xxClientError());
        }

        @Test
        @DisplayName("returns 400 when file is empty")
        void returns400WhenFileEmpty() throws Exception {
            String token = loginAndGetToken();
            MockMultipartFile emptyFile = new MockMultipartFile(
                    "audio", "empty.webm", "audio/webm", new byte[0]);

            mockMvc.perform(multipart("/api/v1/speech/transcribe")
                            .file(emptyFile)
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").exists());
        }
    }

    @Nested
    @DisplayName("POST /api/v1/speech/synthesize")
    class Synthesize {
        @Test
        @DisplayName("returns 401 when unauthenticated")
        void returns401WhenUnauthenticated() throws Exception {
            SynthesisRequest request = new SynthesisRequest("Hello", "alloy", 1.0f, null, null);

            mockMvc.perform(post("/api/v1/speech/synthesize")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().is4xxClientError());
        }

        @Test
        @DisplayName("returns 400 when text is empty")
        void returns400WhenTextEmpty() throws Exception {
            String token = loginAndGetToken();
            SynthesisRequest request = new SynthesisRequest("", "alloy", 1.0f, null, null);

            mockMvc.perform(post("/api/v1/speech/synthesize")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("returns 400 when text is null")
        void returns400WhenTextNull() throws Exception {
            String token = loginAndGetToken();
            SynthesisRequest request = new SynthesisRequest(null, "alloy", 1.0f, null, null);

            mockMvc.perform(post("/api/v1/speech/synthesize")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }
}
