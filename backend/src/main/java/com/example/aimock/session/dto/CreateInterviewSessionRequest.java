package com.example.aimock.session.dto;

import jakarta.persistence.Column;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.UUID;

@Data
@AllArgsConstructor
@Valid
public class CreateInterviewSessionRequest {
    @NotNull(message = "User ID is required")
    private UUID userId;

    @Size(max = 255, message = "Title must be less than 255 characters")
    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Interview type is required")
    @Size(max = 50, message = "Interview type must be less than 50 characters")
    private String interviewType;
    
}
