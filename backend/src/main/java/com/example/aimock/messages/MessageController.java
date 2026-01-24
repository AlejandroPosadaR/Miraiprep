package com.example.aimock.messages;

import com.example.aimock.auth.user.AuthUser;
import com.example.aimock.authz.SessionAuthorizer;
import com.example.aimock.messages.model.Message;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sessions/{sessionId}/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;
    private final SessionAuthorizer sessionAuthorizer;

    @GetMapping("/")
    public ResponseEntity<List<Message>> getMessages(
            @PathVariable UUID sessionId,
            @RequestParam(required = false) Long cursorSeq,
            @RequestParam(required = false) Integer limit,
            @AuthenticationPrincipal AuthUser user) {
        
        sessionAuthorizer.requireOwnerForCurrentUser(sessionId, user);
        List<Message> messages = messageService.getMessages(sessionId, cursorSeq, limit);
        return ResponseEntity.ok(messages);
    }
}
