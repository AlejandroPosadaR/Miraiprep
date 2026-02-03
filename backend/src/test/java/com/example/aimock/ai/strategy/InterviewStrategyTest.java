package com.example.aimock.ai.strategy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("InterviewStrategy implementations")
class InterviewStrategyTest {

    private static final String LEVEL_GUIDANCE = "Candidate has 3 years of experience (mid-level).";
    private static final String JOB_CONTEXT = "Job: Backend Developer at TechCorp.";

    @Nested
    @DisplayName("BehavioralInterviewStrategy")
    class BehavioralStrategyTests {
        
        private final BehavioralInterviewStrategy strategy = new BehavioralInterviewStrategy();

        @Test
        void returnsCorrectInterviewType() {
            assertThat(strategy.getInterviewType()).isEqualTo("BEHAVIORAL");
        }

        @Test
        void buildSystemPromptIncludesLevelGuidance() {
            String prompt = strategy.buildSystemPrompt(LEVEL_GUIDANCE, "");
            
            assertThat(prompt).contains(LEVEL_GUIDANCE);
            assertThat(prompt).contains("behavioral interviewer");
        }

        @Test
        void buildSystemPromptIncludesJobContext() {
            String prompt = strategy.buildSystemPrompt("", JOB_CONTEXT);
            
            assertThat(prompt).contains(JOB_CONTEXT);
        }

        @Test
        void buildSystemPromptContainsBehavioralKeywords() {
            String prompt = strategy.buildSystemPrompt(LEVEL_GUIDANCE, JOB_CONTEXT);
            
            assertThat(prompt).contains("STAR");
            assertThat(prompt).contains("experiences");
            assertThat(prompt).contains("Team collaboration");
        }
    }

    @Nested
    @DisplayName("OOPInterviewStrategy")
    class OOPStrategyTests {
        
        private final OOPInterviewStrategy strategy = new OOPInterviewStrategy();

        @Test
        void returnsCorrectInterviewType() {
            assertThat(strategy.getInterviewType()).isEqualTo("OOP");
        }

        @Test
        void buildSystemPromptIncludesLevelGuidance() {
            String prompt = strategy.buildSystemPrompt(LEVEL_GUIDANCE, "");
            
            assertThat(prompt).contains(LEVEL_GUIDANCE);
        }

        @Test
        void buildSystemPromptIncludesJobContext() {
            String prompt = strategy.buildSystemPrompt("", JOB_CONTEXT);
            
            assertThat(prompt).contains(JOB_CONTEXT);
        }

        @Test
        void buildSystemPromptContainsOOPKeywords() {
            String prompt = strategy.buildSystemPrompt(LEVEL_GUIDANCE, JOB_CONTEXT);
            
            assertThat(prompt).containsIgnoringCase("object-oriented");
        }
    }

    @Nested
    @DisplayName("SystemDesignInterviewStrategy")
    class SystemDesignStrategyTests {
        
        private final SystemDesignInterviewStrategy strategy = new SystemDesignInterviewStrategy();

        @Test
        void returnsCorrectInterviewType() {
            assertThat(strategy.getInterviewType()).isEqualTo("SYSTEM_DESIGN");
        }

        @Test
        void buildSystemPromptIncludesLevelGuidance() {
            String prompt = strategy.buildSystemPrompt(LEVEL_GUIDANCE, "");
            
            assertThat(prompt).contains(LEVEL_GUIDANCE);
        }

        @Test
        void buildSystemPromptIncludesJobContext() {
            String prompt = strategy.buildSystemPrompt("", JOB_CONTEXT);
            
            assertThat(prompt).contains(JOB_CONTEXT);
        }

        @Test
        void buildSystemPromptContainsSystemDesignKeywords() {
            String prompt = strategy.buildSystemPrompt(LEVEL_GUIDANCE, JOB_CONTEXT);
            
            assertThat(prompt).containsIgnoringCase("system design");
        }
    }

    @Nested
    @DisplayName("DefaultInterviewStrategy")
    class DefaultStrategyTests {
        
        private final DefaultInterviewStrategy strategy = new DefaultInterviewStrategy();

        @Test
        void returnsCorrectInterviewType() {
            assertThat(strategy.getInterviewType()).isEqualTo("DEFAULT");
        }

        @Test
        void buildSystemPromptIncludesLevelGuidance() {
            String prompt = strategy.buildSystemPrompt(LEVEL_GUIDANCE, "");
            
            assertThat(prompt).contains(LEVEL_GUIDANCE);
        }

        @Test
        void buildSystemPromptIncludesJobContext() {
            String prompt = strategy.buildSystemPrompt("", JOB_CONTEXT);
            
            assertThat(prompt).contains(JOB_CONTEXT);
        }

        @Test
        void buildSystemPromptIsGeneric() {
            String prompt = strategy.buildSystemPrompt(LEVEL_GUIDANCE, JOB_CONTEXT);
            
            assertThat(prompt).contains("technical interviewer");
            assertThat(prompt).contains("constructive feedback");
        }
    }

    @Nested
    @DisplayName("Edge cases")
    class EdgeCases {
        
        @Test
        void handlesEmptyLevelGuidance() {
            DefaultInterviewStrategy strategy = new DefaultInterviewStrategy();
            String prompt = strategy.buildSystemPrompt("", JOB_CONTEXT);
            
            assertThat(prompt).isNotBlank();
            assertThat(prompt).contains(JOB_CONTEXT);
        }

        @Test
        void handlesEmptyJobContext() {
            DefaultInterviewStrategy strategy = new DefaultInterviewStrategy();
            String prompt = strategy.buildSystemPrompt(LEVEL_GUIDANCE, "");
            
            assertThat(prompt).isNotBlank();
            assertThat(prompt).contains(LEVEL_GUIDANCE);
        }

        @Test
        void handlesBothEmpty() {
            DefaultInterviewStrategy strategy = new DefaultInterviewStrategy();
            String prompt = strategy.buildSystemPrompt("", "");
            
            assertThat(prompt).isNotBlank();
            assertThat(prompt).contains("interviewer");
        }
    }
}
