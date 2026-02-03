package com.example.aimock.websocket;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Register WebSocket endpoint
        // WebSocket handshakes check the Origin header for security (prevents unauthorized sites from connecting)
        // We match the CORS configuration from SecurityConfig for consistency
        
        // Build allowed origins from environment variable or use defaults
        String allowedOriginsEnv = System.getenv("CORS_ALLOWED_ORIGINS");
        String[] allowedOriginPatterns;
        
        if (allowedOriginsEnv != null && !allowedOriginsEnv.isEmpty()) {
            // Parse comma-separated origins from environment variable
            allowedOriginPatterns = allowedOriginsEnv.split(",");
        } else {
            // Default: local development origins + production domains
            allowedOriginPatterns = new String[]{
                "http://localhost:*",
                "http://127.0.0.1:*",
                "https://miraiprep.com",
                "http://miraiprep.com",
                "https://dx4li3mzryciw.cloudfront.net"
            };
        }
        
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(allowedOriginPatterns);
    }
}
