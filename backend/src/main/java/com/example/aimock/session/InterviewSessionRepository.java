package com.example.aimock.session;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InterviewSessionRepository extends JpaRepository<InterviewSession, UUID> {
    List<InterviewSession> findByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<InterviewSession> findById(UUID id);
    Optional<InterviewSession> findByIdAndUserId(UUID id, UUID userId);
    void deleteByIdAndUserId(UUID id, UUID userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM InterviewSession s WHERE s.id = :id AND s.userId = :userId")
    Optional<InterviewSession> findByIdAndUserIdForUpdate(
            @Param("id") UUID id,
            @Param("userId") UUID userId);

    @Query("SELECT s FROM InterviewSession s WHERE s.userId = :userId AND s.createdAt < :cursor ORDER BY s.createdAt DESC")
    List<InterviewSession> findByUserIdWithCursor(
            @Param("userId") UUID userId,
            @Param("cursor") LocalDateTime cursor,
            Pageable pageable);

    @Query("SELECT s FROM InterviewSession s WHERE s.userId = :userId ORDER BY s.createdAt DESC")
    List<InterviewSession> findByUserIdPaginated(
            @Param("userId") UUID userId,
            Pageable pageable);

    @Query("SELECT COUNT(s) FROM InterviewSession s WHERE s.userId = :userId")
    int countByUserId(@Param("userId") UUID userId);
}
