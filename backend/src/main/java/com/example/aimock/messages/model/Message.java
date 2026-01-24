package com.example.aimock.messages.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "messages")
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

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public static Message user(String content, UUID sessionId, long seq) {
        return Message.builder()
            .role(MessageRole.USER)
            .content(content)
            .sessionId(sessionId)
            .seq(seq)
            .messageStatus(MessageStatus.STREAMING)
            .build();
    }

    public static Message interviewer(String content, UUID sessionId, long seq) {
        return Message.builder()
            .role(MessageRole.INTERVIEWER)
            .content(content)
            .sessionId(sessionId)
            .seq(seq)
            .messageStatus(MessageStatus.STREAMING)
            .build();
    }
    public void appendDelta(String delta) {
        if (this.content == null) this.content = "";
        this.content += delta;
      }
    
      public void markComplete() {
        this.messageStatus = MessageStatus.COMPLETED;
      }
    
      public void markFailed(String code, String message) {
        this.messageStatus = MessageStatus.FAILED;
      }
}
