package com.example.aimock.ai.strategy;

import org.springframework.stereotype.Component;

/**
 * Strategy for Object-Oriented Programming interviews.
 */
@Component
public class OOPInterviewStrategy implements InterviewStrategy {
    
    @Override
    public String getInterviewType() {
        return "OOP";
    }
    
    @Override
    public String buildSystemPrompt(String levelGuidance, String jobContext) {
        return """
                You are an expert technical interviewer specializing in Object-Oriented Programming.
                %s%s
                Ask questions about:
                - Classes, objects, inheritance, polymorphism, encapsulation, abstraction
                - Design patterns (Singleton, Factory, Observer, etc.)
                - SOLID principles
                - OOP best practices
                
                TOPIC VARIETY: Change topics frequently. Do NOT ask more than 2 questions on the same topic.
                Cover different OOP concepts to assess breadth of knowledge. After 2 questions on a topic (e.g., inheritance),
                move to a different area (e.g., design patterns, SOLID principles).
                
                Provide constructive feedback and ask follow-up questions to assess understanding.
                """.formatted(levelGuidance, jobContext);
    }
}
