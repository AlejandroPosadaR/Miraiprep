package com.example.aimock.ai;

import com.example.aimock.messages.model.Message;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
public class AIChatService {

    private final ChatClient chatClient;

    public AIChatService(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    public String generateResponse(
            String interviewType,
            List<Message> conversationHistory,
            String latestUserMessage) {

        // Build conversation context
        String context = buildConversationContext(conversationHistory);
        
        // Build system prompt based on interview type
        String systemPrompt = buildSystemPrompt(interviewType);

        log.debug("Sending prompt to AI: interviewType={}, contextLength={}",
                interviewType, context.length());

        String userPrompt = """
                Conversation History:
                %s

                User's latest message: %s

                Please respond as an expert interviewer. Ask a follow-up question, provide feedback, or continue the conversation naturally.
                """.formatted(context, latestUserMessage);

        String aiResponse = chatClient
                .prompt()
                .system(systemPrompt)
                .user(userPrompt)
                .call()
                .content();

        log.debug("Received AI response: length={}", aiResponse != null ? aiResponse.length() : 0);
        return aiResponse == null ? "" : aiResponse;
    }

    public Flux<String> streamResponse(
            String interviewType,
            List<Message> conversationHistory,
            String latestUserMessage) {

        String context = buildConversationContext(conversationHistory);
        String systemPrompt = buildSystemPrompt(interviewType);

        String userPrompt = """
                Conversation History:
                %s

                User's latest message: %s

                Please respond as an expert interviewer. Ask a follow-up question, provide feedback, or continue the conversation naturally.
                """.formatted(context, latestUserMessage);

        return chatClient
                .prompt()
                .system(systemPrompt)
                .user(userPrompt)
                .stream()
                .content();
    }

    private String buildConversationContext(List<Message> messages) {
        if (messages.isEmpty()) {
            return "(No previous messages)";
        }

        return messages.stream()
                .map(msg -> {
                    String role = msg.getRole() == com.example.aimock.messages.model.MessageRole.USER 
                            ? "User" 
                            : "Interviewer";
                    return String.format("[%s]: %s", role, msg.getContent());
                })
                .collect(Collectors.joining("\n"));
    }

    private String buildSystemPrompt(String interviewType) {
        return switch (interviewType.toUpperCase()) {
            case "OOP" -> """
                    You are an expert technical interviewer specializing in Object-Oriented Programming.
                    Ask challenging questions about:
                    - Classes, objects, inheritance, polymorphism, encapsulation, abstraction
                    - Design patterns (Singleton, Factory, Observer, etc.)
                    - SOLID principles
                    - OOP best practices
                    
                    Provide constructive feedback and ask follow-up questions to assess deep understanding.
                    """;
            case "BEHAVIORAL" -> """
                    You are an expert behavioral interviewer.
                    Ask questions about:
                    - Past experiences and situations
                    - Problem-solving approaches
                    - Team collaboration
                    - Leadership and communication
                    
                    Use the STAR method (Situation, Task, Action, Result) to guide responses.
                    Provide feedback on clarity, specificity, and relevance.
                    """;
            case "SYSTEM_DESIGN" -> """
                    You are an expert system design interviewer.
                    Ask questions about:
                    - System architecture and scalability
                    - Database design and data modeling
                    - Caching strategies
                    - Load balancing and distributed systems
                    - Trade-offs and design decisions
                    
                    Guide candidates through designing scalable, reliable systems.
                    """;
            default -> """
                    You are an expert technical interviewer.
                    Ask relevant questions based on the interview type and provide constructive feedback.
                    """;
        };
    }
}
