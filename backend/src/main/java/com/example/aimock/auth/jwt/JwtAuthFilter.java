package com.example.aimock.auth.jwt;

import com.example.aimock.exception.UnauthorizedException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.ExpiredJwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";
    private static final String AUTH_HEADER = "Authorization";
    private static final String ERROR_CODE_TOKEN_EXPIRED = "TOKEN_EXPIRED";
    private static final String ERROR_CODE_TOKEN_INVALID = "TOKEN_INVALID";

    private final UserDetailsService userDetailsService;
    private final JwtService jwtService;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {
        
        String authHeader = request.getHeader(AUTH_HEADER);
        
        if (authHeader == null || !authHeader.startsWith(BEARER_PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }
        
        String token = authHeader.substring(BEARER_PREFIX.length());
        
        try {
            String username = jwtService.extractUsername(token);

            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                
                if (jwtService.validateToken(token, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities());
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
            filterChain.doFilter(request, response);
        } catch (ExpiredJwtException e) {
            log.warn("JWT token expired for request: {}", request.getRequestURI());
            sendErrorResponse(response, HttpStatus.UNAUTHORIZED, ERROR_CODE_TOKEN_EXPIRED, 
                    "Your session has expired. Please log in again.");
        } catch (UnauthorizedException e) {
            log.warn("JWT unauthorized: {}", e.getMessage());
            sendErrorResponse(response, HttpStatus.UNAUTHORIZED, ERROR_CODE_TOKEN_EXPIRED,
                    "Your session has expired. Please log in again.");
        } catch (UsernameNotFoundException e) {
            log.debug("User not found for token: {}", e.getMessage());
            sendErrorResponse(response, HttpStatus.UNAUTHORIZED, ERROR_CODE_TOKEN_INVALID,
                    "Invalid token. Please log in again.");
        } catch (Exception e) {
            log.warn("JWT authentication failed: {}", e.getMessage());
            sendErrorResponse(response, HttpStatus.UNAUTHORIZED, ERROR_CODE_TOKEN_INVALID,
                    "Invalid token. Please log in again.");
        }
    }
    
    private void sendErrorResponse(HttpServletResponse response, HttpStatus status, 
                                   String errorCode, String message) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        
        Map<String, Object> errorBody = new HashMap<>();
        errorBody.put("timestamp", LocalDateTime.now().toString());
        errorBody.put("status", status.value());
        errorBody.put("error", status.getReasonPhrase());
        errorBody.put("code", errorCode);
        errorBody.put("message", message);
        
        objectMapper.writeValue(response.getOutputStream(), errorBody);
    }
}