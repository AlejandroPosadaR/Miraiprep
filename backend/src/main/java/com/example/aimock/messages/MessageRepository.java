package com.example.aimock.messages;

import com.example.aimock.messages.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MessageRepository extends JpaRepository<Message, UUID> {

    List<Message> findBySessionIdOrderBySeqAsc(UUID sessionId);
    
    /**
     * Find a message by session and idempotency key.
     * Used to detect duplicate requests and return the existing message.
     */
    @Query("SELECT m FROM Message m WHERE m.sessionId = :sessionId AND m.idempotencyKey = :idempotencyKey")
    Optional<Message> findBySessionIdAndIdempotencyKey(
            @Param("sessionId") UUID sessionId,
            @Param("idempotencyKey") String idempotencyKey);
    
    /**
     * Find the interviewer message that follows a user message (by sequence).
     * Used to retrieve the AI response placeholder for a duplicate request.
     */
    @Query("SELECT m FROM Message m WHERE m.sessionId = :sessionId AND m.seq = :seq + 1 AND m.role = 'INTERVIEWER'")
    Optional<Message> findInterviewerMessageAfterSeq(
            @Param("sessionId") UUID sessionId,
            @Param("seq") long seq);
}
