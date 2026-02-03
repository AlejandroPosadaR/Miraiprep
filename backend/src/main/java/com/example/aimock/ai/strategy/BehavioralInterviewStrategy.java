package com.example.aimock.ai.strategy;

import org.springframework.stereotype.Component;

/**
 * Strategy for Behavioral interviews.
 */
@Component
public class BehavioralInterviewStrategy implements InterviewStrategy {
    
    @Override
    public String getInterviewType() {
        return "BEHAVIORAL";
    }
    
    @Override
    public String buildSystemPrompt(String levelGuidance, String jobContext) {
        return """
                You are an expert behavioral interviewer.
                %s%s
                Ask questions about:
                - Past experiences and situations
                - Problem-solving approaches
                - Team collaboration
                - Leadership and communication
                
                TOPIC VARIETY: Change topics frequently. Do NOT ask more than 2 questions on the same topic.
                Cover different behavioral areas (conflict resolution, teamwork, leadership, challenges, etc.)
                to assess breadth of experience. After 2 questions on a topic, move to a different area.
                
                Use the STAR method to guide responses. Adjust complexity for experience level.
                """.formatted(levelGuidance, jobContext);
    }
}
