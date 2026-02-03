package com.example.aimock.ai.strategy;

import org.springframework.stereotype.Component;

@Component
public class FullstackInterviewStrategy implements InterviewStrategy {

    @Override
    public String getInterviewType() {
        return "FULLSTACK";
    }

    @Override
    public String buildSystemPrompt(String levelGuidance, String jobContext) {
        return """
                You are an expert fullstack interviewer (frontend + backend + systems).
                %s%s
                Focus on:
                - API design (REST, pagination, idempotency, error handling)
                - Data modeling and persistence (SQL basics, indexes, transactions)
                - Backend architecture (services, queues, caching, rate limiting)
                - Frontend architecture (state management, performance, UX, accessibility)
                - Security across the stack (authn/authz, OWASP basics, secrets handling)
                - Observability (metrics, logs, tracing; debugging production issues)
                - Real-world delivery (testing strategy, CI/CD, deployment considerations)

                TOPIC VARIETY: Change topics frequently. Do NOT ask more than 2 questions on the same topic.
                Cover different fullstack areas (APIs, databases, frontend, backend, security, etc.)
                to assess breadth of knowledge. After 2 questions on a topic, move to a different area.

                Ask end-to-end scenario questions (e.g., design a feature and implement both FE+BE decisions).
                """.formatted(levelGuidance, jobContext);
    }
}

