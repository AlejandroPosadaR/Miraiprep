package com.example.aimock.ai;

import com.example.aimock.ai.strategy.DefaultInterviewStrategy;
import com.example.aimock.ai.strategy.InterviewStrategy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class AIChatService {

    private static final int MAX_HISTORY_MESSAGES = 20;
    private static final int CHARS_PER_TOKEN_ESTIMATE = 4;

    private final ChatClient chatClient;
    private final Map<String, InterviewStrategy> strategies;
    private final DefaultInterviewStrategy defaultStrategy;

    public AIChatService(ChatClient.Builder chatClientBuilder, 
                        Map<String, InterviewStrategy> strategies,
                        DefaultInterviewStrategy defaultStrategy) {
        this.chatClient = chatClientBuilder.build();
        this.strategies = strategies;
        this.defaultStrategy = defaultStrategy;
    }

    public String generateResponse(
            String interviewType,
            List<com.example.aimock.messages.model.Message> conversationHistory,
            String latestUserMessage) {
        return generateResponse(interviewType, conversationHistory, latestUserMessage, 2);
    }

    public String generateResponse(
            String interviewType,
            List<com.example.aimock.messages.model.Message> conversationHistory,
            String latestUserMessage,
            int experienceYears) {
        return generateResponse(interviewType, conversationHistory, latestUserMessage, experienceYears, null);
    }

    public String generateResponse(
            String interviewType,
            List<com.example.aimock.messages.model.Message> conversationHistory,
            String latestUserMessage,
            int experienceYears,
            String jobDescription) {

        String systemPrompt = buildSystemPrompt(interviewType, experienceYears, jobDescription);
        List<Message> messages = buildMessageHistory(conversationHistory, latestUserMessage);

        log.debug("Sending prompt to AI: interviewType={}, messageCount={}, totalTokens~={}",
                interviewType, messages.size(), estimateTokenCount(messages, systemPrompt));

        String aiResponse = chatClient
                .prompt()
                .system(systemPrompt)
                .messages(messages)
                .call()
                .content();

        log.debug("Received AI response: length={}", aiResponse != null ? aiResponse.length() : 0);
        return aiResponse == null ? "" : aiResponse;
    }

    public Flux<String> streamResponse(
            String interviewType,
            List<com.example.aimock.messages.model.Message> conversationHistory,
            String latestUserMessage) {
        return streamResponse(interviewType, conversationHistory, latestUserMessage, 2);
    }

    public Flux<String> streamResponse(
            String interviewType,
            List<com.example.aimock.messages.model.Message> conversationHistory,
            String latestUserMessage,
            int experienceYears) {
        return streamResponse(interviewType, conversationHistory, latestUserMessage, experienceYears, null);
    }

    public Flux<String> streamResponse(
            String interviewType,
            List<com.example.aimock.messages.model.Message> conversationHistory,
            String latestUserMessage,
            int experienceYears,
            String jobDescription) {

        String systemPrompt = buildSystemPrompt(interviewType, experienceYears, jobDescription);
        List<Message> messages = buildMessageHistory(conversationHistory, latestUserMessage);

        log.debug("Streaming AI response: interviewType={}, messageCount={}, totalTokens~={}",
                interviewType, messages.size(), estimateTokenCount(messages, systemPrompt));

        return chatClient
                .prompt()
                .system(systemPrompt)
                .messages(messages)
                .stream()
                .content();
    }

    /**
     * Builds Spring AI message history from database messages.
     * Uses native message format instead of string concatenation for better efficiency.
     * 
     * Benefits:
     * - More token-efficient (no formatting overhead)
     * - OpenAI can better understand conversation structure
     * - Faster processing (native message format)
     * - Limits to last 20 messages to reduce payload size
     */
    private List<Message> buildMessageHistory(List<com.example.aimock.messages.model.Message> messages, String latestUserMessage) {
        List<Message> springAIMessages = new ArrayList<>();
        
        List<com.example.aimock.messages.model.Message> recentMessages = messages.size() > MAX_HISTORY_MESSAGES
                ? messages.subList(messages.size() - MAX_HISTORY_MESSAGES, messages.size())
                : messages;

        // Convert database messages to Spring AI message format
        for (com.example.aimock.messages.model.Message msg : recentMessages) {
            if (msg.getRole() == com.example.aimock.messages.model.MessageRole.USER) {
                springAIMessages.add(new UserMessage(msg.getContent()));
            } else if (msg.getRole() == com.example.aimock.messages.model.MessageRole.INTERVIEWER) {
                springAIMessages.add(new AssistantMessage(msg.getContent()));
            }
        }
        
        // Add the latest user message
        springAIMessages.add(new UserMessage(latestUserMessage));
        
        return springAIMessages;
    }
    
    private int estimateTokenCount(List<Message> messages, String systemPrompt) {
        int totalChars = systemPrompt.length();
        for (Message msg : messages) {
            String content = msg.getText();
            if (content != null) {
                totalChars += content.length();
            }
        }
        return totalChars / CHARS_PER_TOKEN_ESTIMATE;
    }

    private String buildSystemPrompt(String interviewType, int experienceYears, String jobDescription) {
        String level = experienceYears <= 1 ? "junior (0-1 years)" 
                : experienceYears <= 3 ? "mid-level (2-3 years)"
                : experienceYears <= 6 ? "senior (4-6 years)"
                : "staff/principal (7+ years)";
        
        String levelGuidance = """
                
                IMPORTANT: The candidate has %d years of experience (%s).
                
                Your questions MUST align with this level. Calibrate difficulty continuously.
                
                Difficulty guidelines:
                - Junior: Fundamentals, definitions, small concrete examples, basic debugging
                - Mid-level: Practical scenarios, trade-offs, moderate complexity, some design decisions
                - Senior: Deep technical discussions, architecture, performance, reliability, trade-offs, mentorship
                - Staff+: System-wide thinking, cross-team impact, strategy, long-term architecture, org-level trade-offs
                
                Rules:
                - Ask ONE main question at a time.
                - Start at an appropriate difficulty for the level; do not jump to senior/staff questions for juniors.
                - Use follow-ups to go deeper ONLY if the candidate demonstrates readiness.
                - If the candidate struggles, simplify the question or give a small hint, then continue at the right level.
                
                """.formatted(experienceYears, level);
        
        String jobContext = "";
        if (jobDescription != null && !jobDescription.trim().isEmpty()) {
            jobContext = """
                    
                    JOB DESCRIPTION CONTEXT:
                    The candidate is preparing for a role with the following job description:
                    ---
                    %s
                    ---
                    Tailor your questions to be relevant to this specific role and its requirements.
                    Focus on skills and experiences mentioned in the job description.
                    
                    """.formatted(jobDescription.trim());
        }

        InterviewStrategy strategy = getStrategy(interviewType);
        return strategy.buildSystemPrompt(levelGuidance, jobContext);
    }

    private InterviewStrategy getStrategy(String interviewType) {
        if (interviewType == null || interviewType.isBlank()) {
            return defaultStrategy;
        }
        
        String normalizedType = interviewType.toUpperCase().trim();
        // Spring injects Map with bean names as keys - find by interview type
        InterviewStrategy strategy = strategies.values().stream()
                .filter(s -> s.getInterviewType().equals(normalizedType))
                .findFirst()
                .orElse(defaultStrategy);
        
        if (strategy == defaultStrategy && !normalizedType.equals("DEFAULT")) {
            log.debug("No strategy found for type: {}. Using default strategy.", interviewType);
        }
        
        return strategy;
    }
}
