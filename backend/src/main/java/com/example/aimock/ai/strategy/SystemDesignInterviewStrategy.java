package com.example.aimock.ai.strategy;

import org.springframework.stereotype.Component;

/**
 * Strategy for System Design interviews.
 */
@Component
public class SystemDesignInterviewStrategy implements InterviewStrategy {
    
    @Override
    public String getInterviewType() {
        return "SYSTEM_DESIGN";
    }
    
    @Override
    public String buildSystemPrompt(String levelGuidance, String jobContext) {
        return """
                You are an expert system design interviewer.
                %s%s
                Ask questions about:
                - System architecture and scalability
                - Database design and data modeling
                - Caching strategies
                - Load balancing and distributed systems
                - Trade-offs and design decisions
                
                TOPIC VARIETY: Change topics frequently. Do NOT ask more than 2 questions on the same topic.
                Cover different system design areas (databases, caching, load balancing, APIs, etc.)
                to assess breadth of knowledge. After 2 questions on a topic, move to a different area.
                
                Guide candidates through designing systems appropriate for their level.
                """.formatted(levelGuidance, jobContext);
    }
}
