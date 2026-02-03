package com.example.aimock.ai;

import com.example.aimock.messages.MessageRepository;
import com.example.aimock.messages.model.Message;
import com.example.aimock.session.InterviewSession;
import com.example.aimock.session.dto.EvaluationResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
public class AIEvaluationService {

    private final ChatClient chatClient;
    private final MessageRepository messageRepository;
    private final ObjectMapper objectMapper;

    public AIEvaluationService(ChatClient.Builder chatClientBuilder, MessageRepository messageRepository, ObjectMapper objectMapper) {
        this.chatClient = chatClientBuilder.build();
        this.messageRepository = messageRepository;
        this.objectMapper = objectMapper;
    }

    public EvaluationResult evaluateInterview(InterviewSession session) {
        List<Message> messages = messageRepository.findBySessionIdOrderBySeqAsc(session.getId());
        
        if (messages.isEmpty()) {
            return EvaluationResult.builder()
                    .overallScore(BigDecimal.ZERO)
                    .knowledge(0)
                    .communication(0)
                    .problemSolving(0)
                    .technicalDepth(0)
                    .feedback("No conversation to evaluate.")
                    .build();
        }

        String transcript = buildTranscript(messages);
        String systemPrompt = buildEvaluationPrompt(session);

        String userPrompt = """
                Please evaluate the following interview transcript and provide scores and feedback.
                
                Interview Type: %s
                Candidate Experience Level: %d years
                
                Transcript:
                %s
                
                Provide your evaluation in the following JSON format:
                {
                    "overallScore": <number 0-10 with one decimal>,
                    "knowledge": <integer 0-100>,
                    "communication": <integer 0-100>,
                    "problemSolving": <integer 0-100>,
                    "technicalDepth": <integer 0-100>,
                    "feedback": "<detailed feedback paragraph>",
                    "strengths": "<list of strengths>",
                    "areasForImprovement": "<list of areas to improve>"
                }
                
                Return ONLY the JSON, no other text.
                """.formatted(
                        session.getInterviewType(),
                        session.getExperienceYears() != null ? session.getExperienceYears() : 2,
                        transcript
                );

        try {
            String response = chatClient
                    .prompt()
                    .system(systemPrompt)
                    .user(userPrompt)
                    .call()
                    .content();

            return parseEvaluationResponse(response);
        } catch (Exception e) {
            log.error("Failed to evaluate interview", e);
            return EvaluationResult.builder()
                    .overallScore(BigDecimal.ZERO)
                    .feedback("Evaluation failed: " + e.getMessage())
                    .build();
        }
    }

    private String buildTranscript(List<Message> messages) {
        return messages.stream()
                .filter(m -> m.getContent() != null && !m.getContent().isBlank())
                .map(m -> {
                    String role = m.getRole() == com.example.aimock.messages.model.MessageRole.USER
                            ? "Candidate"
                            : "Interviewer";
                    return role + ": " + m.getContent();
                })
                .collect(Collectors.joining("\n\n"));
    }

    private String buildEvaluationPrompt(InterviewSession session) {
        int years = session.getExperienceYears() != null ? session.getExperienceYears() : 2;
        String level = years <= 1 ? "junior" : years <= 3 ? "mid-level" : years <= 6 ? "senior" : "staff/principal";
        
        return """
                You are an expert technical interviewer evaluating a %s interview.
                The candidate has %d years of experience (%s level).
                
                Evaluate their responses considering their experience level.
                Be fair but thorough. A junior should not be expected to answer like a senior.
                
                Scoring guidelines:
                - 0-30: Poor - Major gaps, incorrect answers
                - 31-50: Below Average - Some understanding but significant gaps
                - 51-70: Average - Adequate for experience level
                - 71-85: Good - Strong understanding
                - 86-100: Excellent - Exceptional performance
                
                Provide actionable, specific feedback.
                """.formatted(session.getInterviewType(), years, level);
    }

    private EvaluationResult parseEvaluationResponse(String response) {
        try {
            String jsonStr = response.trim();
            if (jsonStr.startsWith("```json")) {
                jsonStr = jsonStr.substring(7);
            }
            if (jsonStr.startsWith("```")) {
                jsonStr = jsonStr.substring(3);
            }
            if (jsonStr.endsWith("```")) {
                jsonStr = jsonStr.substring(0, jsonStr.length() - 3);
            }
            jsonStr = jsonStr.trim();

            JsonNode json = objectMapper.readTree(jsonStr);

            return EvaluationResult.builder()
                    .overallScore(json.has("overallScore") 
                            ? BigDecimal.valueOf(json.get("overallScore").asDouble()) 
                            : BigDecimal.ZERO)
                    .knowledge(json.has("knowledge") ? json.get("knowledge").asInt() : 0)
                    .communication(json.has("communication") ? json.get("communication").asInt() : 0)
                    .problemSolving(json.has("problemSolving") ? json.get("problemSolving").asInt() : 0)
                    .technicalDepth(json.has("technicalDepth") ? json.get("technicalDepth").asInt() : 0)
                    .feedback(json.has("feedback") ? json.get("feedback").asText() : "")
                    .strengths(json.has("strengths") ? json.get("strengths").asText() : "")
                    .areasForImprovement(json.has("areasForImprovement") ? json.get("areasForImprovement").asText() : "")
                    .build();
        } catch (Exception e) {
            log.error("Failed to parse evaluation response: {}", response, e);
            return EvaluationResult.builder()
                    .overallScore(BigDecimal.ZERO)
                    .feedback("Failed to parse evaluation: " + e.getMessage())
                    .build();
        }
    }
}
