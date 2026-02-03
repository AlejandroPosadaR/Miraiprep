package com.example.aimock.session;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Column;
import jakarta.persistence.Table;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import jakarta.validation.constraints.Size;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigInteger;
import java.time.LocalDateTime;
import java.util.UUID;

import com.example.aimock.session.Status;


@Entity
@Table(name = "interview_sessions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InterviewSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Size(max = 255)
    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "next_seq", nullable = false)
    @Builder.Default
    private long nextSeq = 1;

    @Column(name = "interview_type", nullable = false)
    private String interviewType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private Status status = Status.STARTED;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "experience_years")
    @Builder.Default
    private Integer experienceYears = 2;

    @Column(name = "job_description", columnDefinition = "TEXT")
    private String jobDescription;

    @Column(name = "evaluation_score")
    private java.math.BigDecimal evaluationScore;

    @Column(name = "evaluation_knowledge")
    private Integer evaluationKnowledge;

    @Column(name = "evaluation_communication")
    private Integer evaluationCommunication;

    @Column(name = "evaluation_problem_solving")
    private Integer evaluationProblemSolving;

    @Column(name = "evaluation_technical_depth")
    private Integer evaluationTechnicalDepth;

    @Column(name = "evaluation_feedback", columnDefinition = "TEXT")
    private String evaluationFeedback;

    @Column(name = "evaluated_at")
    private LocalDateTime evaluatedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public long allocateSeq() {
        return nextSeq++;
    }
}