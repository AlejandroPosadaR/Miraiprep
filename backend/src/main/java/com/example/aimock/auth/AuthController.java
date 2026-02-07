package com.example.aimock.auth;

import com.example.aimock.auth.dto.AuthResponse;
import com.example.aimock.auth.dto.LoginRequest;
import com.example.aimock.auth.dto.RegisterRequest;
import com.example.aimock.auth.jwt.JwtService;
import com.example.aimock.auth.user.AuthUser;
import com.example.aimock.auth.user.User;
import com.example.aimock.auth.user.UserRepository;
import com.example.aimock.exception.ConflictException;
import com.example.aimock.exception.UnauthorizedException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );

            if (authentication.isAuthenticated()) {
                User user = userRepository.findByEmail(request.getEmail())
                        .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));
                
                String token = jwtService.generateToken(user.getId(), request.getEmail());
                
                return ResponseEntity.ok(AuthResponse.builder()
                        .token(token)
                        .userId(user.getId())
                        .email(user.getEmail())
                        .username(user.getUsername())
                        .firstName(user.getFirstName())
                        .lastName(user.getLastName())
                        .message("Login successful")
                        .tier(user.getTier())
                        .messageCount(user.getMessageCount())
                        .messageLimit(user.getMessageLimit())
                        .remainingMessages(user.getRemainingMessages())
                        .build());
            }
            
            throw new UnauthorizedException("Authentication failed");
                    
        } catch (BadCredentialsException e) {
            throw new UnauthorizedException("Invalid email or password");
        }
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        // Check if email already exists
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ConflictException("User", "email", request.getEmail());
        }

        // Check if username already exists
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new ConflictException("User", "username", request.getUsername());
        }

        // Create new user
        User user = User.builder()
                .email(request.getEmail())
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .enabled(true)
                .emailVerified(false)
                .build();

        userRepository.save(user);

        // Generate token
        String token = jwtService.generateToken(user.getId(), user.getEmail());

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(AuthResponse.builder()
                        .userId(user.getId())
                        .token(token)
                        .email(user.getEmail())
                        .username(user.getUsername())
                        .firstName(user.getFirstName())
                        .lastName(user.getLastName())
                        .message("Registration successful")
                        .tier(user.getTier())
                        .messageCount(user.getMessageCount())
                        .messageLimit(user.getMessageLimit())
                        .remainingMessages(user.getRemainingMessages())
                        .build());
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse> getCurrentUser(@AuthenticationPrincipal AuthUser authUser) {
        User user = userRepository.findById(authUser.getUserId())
                .orElseThrow(() -> new UnauthorizedException("User not found"));
        
        return ResponseEntity.ok(AuthResponse.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .username(user.getUsername())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .tier(user.getTier())
                .messageCount(user.getMessageCount())
                .messageLimit(user.getMessageLimit())
                .remainingMessages(user.getRemainingMessages())
                .build());
    }
}

