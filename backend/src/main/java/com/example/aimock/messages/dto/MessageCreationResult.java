package com.example.aimock.messages.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class MessageCreationResult {

    private UUID userMessageId;
    private UUID interviewerMessageId;
}
