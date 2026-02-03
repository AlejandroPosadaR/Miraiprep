package com.example.aimock.ai;

import com.example.aimock.messages.MessageRepository;
import com.example.aimock.messages.model.Message;
import com.example.aimock.session.InterviewSession;
import com.example.aimock.session.Status;
import com.example.aimock.session.dto.EvaluationResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.client.ChatClient;

import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AIEvaluationService")
class AIEvaluationServiceTest {

    @Mock
    private ChatClient.Builder chatClientBuilder;

    @Mock
    private ChatClient chatClient;

    @Mock
    private MessageRepository messageRepository;

    private ObjectMapper objectMapper;
    private AIEvaluationService evaluationService;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        when(chatClientBuilder.build()).thenReturn(chatClient);
        evaluationService = new AIEvaluationService(chatClientBuilder, messageRepository, objectMapper);
    }

    private InterviewSession createTestSession() {
        return InterviewSession.builder()
                .id(UUID.randomUUID())
                .userId(UUID.randomUUID())
                .title("Test Interview")
                .interviewType("TECHNICAL")
                .experienceYears(3)
                .status(Status.COMPLETED)
                .build();
    }

    @Nested
    @DisplayName("evaluateInterview with empty messages")
    class EvaluateEmptyMessages {

        @Test
        void returnsZeroScoresWhenNoMessages() {
            InterviewSession session = createTestSession();
            when(messageRepository.findBySessionIdOrderBySeqAsc(session.getId()))
                    .thenReturn(Collections.emptyList());

            EvaluationResult result = evaluationService.evaluateInterview(session);

            assertThat(result.getOverallScore()).isEqualByComparingTo(BigDecimal.ZERO);
            assertThat(result.getKnowledge()).isZero();
            assertThat(result.getCommunication()).isZero();
            assertThat(result.getProblemSolving()).isZero();
            assertThat(result.getTechnicalDepth()).isZero();
            assertThat(result.getFeedback()).contains("No conversation to evaluate");
        }
    }

    @Nested
    @DisplayName("parseEvaluationResponse")
    class ParseEvaluationResponse {

        private EvaluationResult invokeParseMethod(String response) throws Exception {
            Method method = AIEvaluationService.class.getDeclaredMethod("parseEvaluationResponse", String.class);
            method.setAccessible(true);
            return (EvaluationResult) method.invoke(evaluationService, response);
        }

        @Test
        void parsesValidJson() throws Exception {
            String json = """
                {
                    "overallScore": 7.5,
                    "knowledge": 75,
                    "communication": 80,
                    "problemSolving": 70,
                    "technicalDepth": 65,
                    "feedback": "Good performance overall",
                    "strengths": "Strong communication skills",
                    "areasForImprovement": "Could improve problem solving"
                }
                """;

            EvaluationResult result = invokeParseMethod(json);

            assertThat(result.getOverallScore()).isEqualByComparingTo(new BigDecimal("7.5"));
            assertThat(result.getKnowledge()).isEqualTo(75);
            assertThat(result.getCommunication()).isEqualTo(80);
            assertThat(result.getProblemSolving()).isEqualTo(70);
            assertThat(result.getTechnicalDepth()).isEqualTo(65);
            assertThat(result.getFeedback()).isEqualTo("Good performance overall");
            assertThat(result.getStrengths()).isEqualTo("Strong communication skills");
            assertThat(result.getAreasForImprovement()).isEqualTo("Could improve problem solving");
        }

        @Test
        void parsesJsonWithCodeFences() throws Exception {
            String json = """
                ```json
                {
                    "overallScore": 8.0,
                    "knowledge": 85,
                    "communication": 90,
                    "problemSolving": 80,
                    "technicalDepth": 75,
                    "feedback": "Excellent"
                }
                ```
                """;

            EvaluationResult result = invokeParseMethod(json);

            assertThat(result.getOverallScore()).isEqualByComparingTo(new BigDecimal("8.0"));
            assertThat(result.getKnowledge()).isEqualTo(85);
        }

        @Test
        void handlesPartialJson() throws Exception {
            String json = """
                {
                    "overallScore": 6.0,
                    "feedback": "Needs improvement"
                }
                """;

            EvaluationResult result = invokeParseMethod(json);

            assertThat(result.getOverallScore()).isEqualByComparingTo(new BigDecimal("6.0"));
            assertThat(result.getKnowledge()).isZero();
            assertThat(result.getCommunication()).isZero();
            assertThat(result.getFeedback()).isEqualTo("Needs improvement");
        }

        @Test
        void handlesInvalidJson() throws Exception {
            String invalidJson = "not a valid json at all";

            EvaluationResult result = invokeParseMethod(invalidJson);

            assertThat(result.getOverallScore()).isEqualByComparingTo(BigDecimal.ZERO);
            assertThat(result.getFeedback()).contains("Failed to parse");
        }

        @Test
        void handlesJsonWithOnlyCodeFenceMarkers() throws Exception {
            String json = """
                ```
                {
                    "overallScore": 5.5,
                    "knowledge": 55
                }
                ```
                """;

            EvaluationResult result = invokeParseMethod(json);

            assertThat(result.getOverallScore()).isEqualByComparingTo(new BigDecimal("5.5"));
            assertThat(result.getKnowledge()).isEqualTo(55);
        }
    }

    @Nested
    @DisplayName("buildTranscript")
    class BuildTranscript {

        private String invokeTranscriptMethod(List<Message> messages) throws Exception {
            Method method = AIEvaluationService.class.getDeclaredMethod("buildTranscript", List.class);
            method.setAccessible(true);
            return (String) method.invoke(evaluationService, messages);
        }

        @Test
        void buildsTranscriptFromMessages() throws Exception {
            UUID sessionId = UUID.randomUUID();
            List<Message> messages = List.of(
                    Message.user("Hello, I'm ready for the interview", sessionId, 1L),
                    Message.interviewer("Great! Tell me about yourself", sessionId, 2L),
                    Message.user("I have 3 years of experience...", sessionId, 3L)
            );

            String transcript = invokeTranscriptMethod(messages);

            assertThat(transcript).contains("Candidate: Hello, I'm ready for the interview");
            assertThat(transcript).contains("Interviewer: Great! Tell me about yourself");
            assertThat(transcript).contains("Candidate: I have 3 years of experience...");
        }

        @Test
        void filtersEmptyMessages() throws Exception {
            UUID sessionId = UUID.randomUUID();
            List<Message> messages = List.of(
                    Message.user("Hello", sessionId, 1L),
                    Message.interviewer("", sessionId, 2L),
                    Message.user("Goodbye", sessionId, 3L)
            );

            String transcript = invokeTranscriptMethod(messages);

            assertThat(transcript).contains("Candidate: Hello");
            assertThat(transcript).contains("Candidate: Goodbye");
            assertThat(transcript).doesNotContain("Interviewer: \n");
        }
    }

    @Nested
    @DisplayName("buildEvaluationPrompt")
    class BuildEvaluationPrompt {

        private String invokePromptMethod(InterviewSession session) throws Exception {
            Method method = AIEvaluationService.class.getDeclaredMethod("buildEvaluationPrompt", InterviewSession.class);
            method.setAccessible(true);
            return (String) method.invoke(evaluationService, session);
        }

        @Test
        void includesInterviewType() throws Exception {
            InterviewSession session = createTestSession();

            String prompt = invokePromptMethod(session);

            assertThat(prompt).contains("TECHNICAL");
        }

        @Test
        void includesExperienceLevel() throws Exception {
            InterviewSession session = InterviewSession.builder()
                    .id(UUID.randomUUID())
                    .userId(UUID.randomUUID())
                    .title("Test")
                    .interviewType("BEHAVIORAL")
                    .experienceYears(1)
                    .status(Status.COMPLETED)
                    .build();

            String prompt = invokePromptMethod(session);

            assertThat(prompt).contains("1 years");
            assertThat(prompt).contains("junior");
        }

        @Test
        void handlesNullExperienceYears() throws Exception {
            InterviewSession session = InterviewSession.builder()
                    .id(UUID.randomUUID())
                    .userId(UUID.randomUUID())
                    .title("Test")
                    .interviewType("TECHNICAL")
                    .experienceYears(null)
                    .status(Status.COMPLETED)
                    .build();

            String prompt = invokePromptMethod(session);

            assertThat(prompt).contains("2 years");
            assertThat(prompt).contains("mid-level");
        }

        @Test
        void detectsSeniorLevel() throws Exception {
            InterviewSession session = InterviewSession.builder()
                    .id(UUID.randomUUID())
                    .userId(UUID.randomUUID())
                    .title("Test")
                    .interviewType("SYSTEM_DESIGN")
                    .experienceYears(5)
                    .status(Status.COMPLETED)
                    .build();

            String prompt = invokePromptMethod(session);

            assertThat(prompt).contains("senior");
        }

        @Test
        void detectsStaffLevel() throws Exception {
            InterviewSession session = InterviewSession.builder()
                    .id(UUID.randomUUID())
                    .userId(UUID.randomUUID())
                    .title("Test")
                    .interviewType("OOP")
                    .experienceYears(10)
                    .status(Status.COMPLETED)
                    .build();

            String prompt = invokePromptMethod(session);

            assertThat(prompt).contains("staff/principal");
        }
    }
}
