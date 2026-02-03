package com.example.aimock.messages.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Represents a message in an interview session.
 * 
 * <h3>Idempotency & Ordering</h3>
 * Messages use a combination of pessimistic locking and idempotency keys
 * to ensure correct behavior under concurrent requests and retries:
 * <ul>
 *   <li><b>idempotencyKey</b>: Client-provided key to prevent duplicate message creation</li>
 *   <li><b>seq</b>: Monotonically increasing sequence number per session</li>
 *   <li>Unique constraint on (session_id, idempotency_key) prevents duplicates</li>
 * </ul>
 */
@Entity
@Table(name = "messages", indexes = {
    @Index(name = "idx_messages_session_seq", columnList = "session_id, sequence_number")
})
@NoArgsConstructor
@AllArgsConstructor
@Data
@Builder
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;
    
    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Column(name = "sequence_number", nullable = false)
    private Long seq;

    @Column(name = "role", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private MessageRole role;

    @Column(name = "message_status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private MessageStatus messageStatus;

    @Column(name = "content", nullable = false)
    private String content;

    @Column(name = "audio_url")
    private String audioUrl;
    
    /**
     * Client-provided idempotency key to prevent duplicate messages on retry.
     * Null for system-generated messages (e.g., AI placeholders).
     */
    @Column(name = "idempotency_key", length = 64)
    private String idempotencyKey;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /**
     * Creates a user message with idempotency key for deduplication.
     */
    public static Message user(String content, UUID sessionId, long seq, String idempotencyKey) {
        return Message.builder()
            .role(MessageRole.USER)
            .content(content)
            .sessionId(sessionId)
            .seq(seq)
            .idempotencyKey(idempotencyKey)
            .messageStatus(MessageStatus.COMPLETED) // User messages are complete immediately
            .build();
    }
    
    /**
     * Creates a user message without idempotency key (for backwards compatibility).
     */
    public static Message user(String content, UUID sessionId, long seq) {
        return user(content, sessionId, seq, null);
    }

    /**
     * Creates an interviewer placeholder message.
     * Note: Interviewer messages don't need idempotency keys as they're created
     * atomically with the user message under the same lock.
     */
    public static Message interviewer(String content, UUID sessionId, long seq) {
        return Message.builder()
            .role(MessageRole.INTERVIEWER)
            .content(content)
            .sessionId(sessionId)
            .seq(seq)
            .idempotencyKey(null) // System-generated, no idempotency needed
            .messageStatus(MessageStatus.PENDING)
            .build();
    }
    public void appendDelta(String delta) {
        if (delta == null || delta.isEmpty()) {
            return;
        }
        this.content = (this.content == null ? "" : this.content) + delta;
    }
    
    public void markComplete() {
        this.messageStatus = MessageStatus.COMPLETED;
    }
    
    public void markFailed() {
        this.messageStatus = MessageStatus.FAILED;
    }
    
    public boolean isCompleted() {
        return this.messageStatus == MessageStatus.COMPLETED;
    }
    
    public boolean isPending() {
        return this.messageStatus == MessageStatus.PENDING;
    }
    
    public boolean isStreaming() {
        return this.messageStatus == MessageStatus.STREAMING;
    }
}
