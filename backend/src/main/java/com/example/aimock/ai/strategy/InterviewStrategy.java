package com.example.aimock.ai.strategy;

/**
 * Strategy interface for different interview types.
 * Each interview type has its own strategy for building system prompts.
 */
public interface InterviewStrategy {
    
    /**
     * Returns the interview type this strategy handles.
     * @return The interview type identifier (e.g., "OOP", "BEHAVIORAL", "SYSTEM_DESIGN")
     */
    String getInterviewType();
    
    /**
     * Builds the type-specific part of the system prompt.
     * 
     * @param levelGuidance The experience level guidance text
     * @param jobContext The job description context (may be empty)
     * @return The complete system prompt for this interview type
     */
    String buildSystemPrompt(String levelGuidance, String jobContext);
}
