package com.example.aimock.authz;

import com.example.aimock.auth.user.User;
import com.example.aimock.auth.user.UserRepository;
import com.example.aimock.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CurrentUserProvider {

    private final UserRepository userRepository;

    public UUID getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedException("Not authenticated");
        }
        
        // If using @AuthenticationPrincipal AuthUser, extract from principal
        if (authentication.getPrincipal() instanceof com.example.aimock.auth.user.AuthUser authUser) {
            return authUser.getUserId();
        }
        
        // Fallback: load from email
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("User not found"));
        return user.getId();
    }

    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedException("Not authenticated");
        }
        
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("User not found"));
    }
}
