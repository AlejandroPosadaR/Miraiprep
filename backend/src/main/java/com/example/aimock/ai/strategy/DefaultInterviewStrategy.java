package com.example.aimock.ai.strategy;

import org.springframework.stereotype.Component;

/**
 * Default strategy for unknown or generic interview types.
 */
@Component
public class DefaultInterviewStrategy implements InterviewStrategy {
    
    @Override
    public String getInterviewType() {
        return "DEFAULT";
    }
    
    @Override
    public String buildSystemPrompt(String levelGuidance, String jobContext) {
        return """
                You are an expert technical interviewer.
                %s%s
                
                TOPIC VARIETY: Change topics frequently. Do NOT ask more than 2 questions on the same topic.
                Cover different technical areas to assess breadth of knowledge. After 2 questions on a topic,
                move to a different area.
                
                Ask relevant questions and provide constructive feedback.
                """.formatted(levelGuidance, jobContext);
    }
}
