package com.example.aimock.session.dto;

import com.example.aimock.session.InterviewSession;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaginatedSessionsResponse {
    private List<InterviewSession> sessions;
    private String nextCursor;
    private boolean hasMore;
    private int totalCount;
}
