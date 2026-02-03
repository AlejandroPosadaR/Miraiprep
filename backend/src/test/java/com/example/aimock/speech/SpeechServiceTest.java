package com.example.aimock.speech;

import com.example.aimock.speech.provider.TtsProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SpeechService")
class SpeechServiceTest {

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private TtsProvider ttsProvider;

    private ObjectMapper objectMapper;
    private SpeechService speechService;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        speechService = new SpeechService(restTemplate, objectMapper, ttsProvider);
        ReflectionTestUtils.setField(speechService, "apiKey", "test-api-key");
    }

    @Nested
    @DisplayName("transcribe")
    class Transcribe {

        @Test
        void transcribesAudioSuccessfully() throws IOException {
            String jsonResponse = "{\"text\": \"Hello, this is a test transcription\"}";
            ResponseEntity<String> response = new ResponseEntity<>(jsonResponse, HttpStatus.OK);
            
            when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                    .thenReturn(response);

            byte[] audioBytes = createWebMAudio();
            InputStream audioStream = new ByteArrayInputStream(audioBytes);
            
            String result = speechService.transcribe(audioStream, "audio/webm", "en");

            assertThat(result).isEqualTo("Hello, this is a test transcription");
            verify(restTemplate).exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class));
        }

        @Test
        void handlesNullLanguage() throws IOException {
            String jsonResponse = "{\"text\": \"Transcription without language\"}";
            ResponseEntity<String> response = new ResponseEntity<>(jsonResponse, HttpStatus.OK);
            
            when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                    .thenReturn(response);

            byte[] audioBytes = createWebMAudio();
            InputStream audioStream = new ByteArrayInputStream(audioBytes);
            
            String result = speechService.transcribe(audioStream, "audio/webm", null);

            assertThat(result).isEqualTo("Transcription without language");
        }

        @Test
        void handlesEmptyAudioFile() {
            InputStream emptyStream = new ByteArrayInputStream(new byte[0]);

            assertThatThrownBy(() -> speechService.transcribe(emptyStream, "audio/webm", "en"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Audio file is empty");
        }

        @Test
        void handlesNullContentType() throws IOException {
            String jsonResponse = "{\"text\": \"Default webm format\"}";
            ResponseEntity<String> response = new ResponseEntity<>(jsonResponse, HttpStatus.OK);
            
            when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                    .thenReturn(response);

            byte[] audioBytes = createWebMAudio();
            InputStream audioStream = new ByteArrayInputStream(audioBytes);
            
            String result = speechService.transcribe(audioStream, null, "en");

            assertThat(result).isEqualTo("Default webm format");
        }

        @Test
        void handlesTranscriptionFailure() {
            when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                    .thenThrow(new RuntimeException("API error"));

            byte[] audioBytes = createWebMAudio();
            InputStream audioStream = new ByteArrayInputStream(audioBytes);

            assertThatThrownBy(() -> speechService.transcribe(audioStream, "audio/webm", "en"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Transcription failed");
        }

        @Test
        void resolvesCorrectFilenameForDifferentFormats() throws IOException {
            String jsonResponse = "{\"text\": \"Test\"}";
            ResponseEntity<String> response = new ResponseEntity<>(jsonResponse, HttpStatus.OK);
            
            when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                    .thenReturn(response);

            byte[] audioBytes = createWebMAudio();
            InputStream audioStream = new ByteArrayInputStream(audioBytes);
            
            ArgumentCaptor<HttpEntity> captor = ArgumentCaptor.forClass(HttpEntity.class);
            
            speechService.transcribe(audioStream, "audio/mpeg", "en");
            
            verify(restTemplate).exchange(anyString(), eq(HttpMethod.POST), captor.capture(), eq(String.class));
            assertThat(captor.getValue()).isNotNull();
        }
    }

    @Nested
    @DisplayName("synthesize")
    class Synthesize {

        @Test
        void synthesizesTextToSpeech() {
            byte[] audioData = new byte[]{1, 2, 3, 4, 5};
            
            when(ttsProvider.synthesize("Hello world", "alloy", 1.0f))
                    .thenReturn(audioData);

            byte[] result = speechService.synthesize("Hello world", "alloy", 1.0f);

            assertThat(result).isEqualTo(audioData);
            verify(ttsProvider).synthesize("Hello world", "alloy", 1.0f);
        }

        @Test
        void handlesNullVoice() {
            byte[] audioData = new byte[]{1, 2, 3};
            
            when(ttsProvider.synthesize("Test", null, 1.0f))
                    .thenReturn(audioData);

            byte[] result = speechService.synthesize("Test", null, 1.0f);

            assertThat(result).isEqualTo(audioData);
            verify(ttsProvider).synthesize("Test", null, 1.0f);
        }

        @Test
        void passesSpeedToProvider() {
            byte[] audioData = new byte[]{1, 2, 3};
            
            when(ttsProvider.synthesize("Test", "alloy", 10.0f))
                    .thenReturn(audioData);
            
            speechService.synthesize("Test", "alloy", 10.0f);
            
            verify(ttsProvider).synthesize("Test", "alloy", 10.0f);
        }

        @Test
        void handlesSynthesisFailure() {
            when(ttsProvider.synthesize(anyString(), anyString(), anyFloat()))
                    .thenThrow(new RuntimeException("Speech synthesis failed: API error"));

            assertThatThrownBy(() -> speechService.synthesize("Test", "alloy", 1.0f))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Speech synthesis failed");
        }
    }

    private byte[] createWebMAudio() {
        byte[] webmHeader = new byte[]{
                (byte)0x1A, (byte)0x45, (byte)0xDF, (byte)0xA3, // WebM signature
                0x01, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00
        };
        return webmHeader;
    }
}
