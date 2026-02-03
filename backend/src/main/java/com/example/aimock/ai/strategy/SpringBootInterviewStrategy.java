package com.example.aimock.ai.strategy;

import org.springframework.stereotype.Component;

@Component
public class SpringBootInterviewStrategy implements InterviewStrategy {

    @Override
    public String getInterviewType() {
        return "SPRING_BOOT";
    }

    @Override
    public String buildSystemPrompt(String levelGuidance, String jobContext) {
        return """
                You are an expert Spring Boot backend interviewer.
                %s%s
                Focus on:
                - Spring Boot fundamentals (auto-configuration, starters, profiles)
                - REST APIs, validation, error handling
                - Data access (JPA/Hibernate), transactions, N+1, pagination
                - Security (Spring Security, JWT, authz patterns)
                - Observability (Actuator, Micrometer, logs, tracing basics)
                - Testing (unit tests, @WebMvcTest, @DataJpaTest, integration tests, Testcontainers)

                TOPIC VARIETY: Change topics frequently. Do NOT ask more than 2 questions on the same topic.
                Cover different Spring Boot areas (fundamentals, data access, security, testing, etc.)
                to assess breadth of knowledge. After 2 questions on a topic, move to a different area.

                Ask practical questions, include trade-offs, and follow up with deeper questions based on answers.
                """.formatted(levelGuidance, jobContext);
    }
}

