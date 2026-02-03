package com.example.aimock.websocket;

import io.micrometer.core.instrument.Counter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

import java.util.concurrent.atomic.AtomicInteger;

/**
 * Listens to WebSocket events and tracks metrics.
 * This enables monitoring of WebSocket connections and subscriptions.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketMetricsListener {

    private final AtomicInteger websocketConnectionsGauge;
    private final Counter websocketMessagesReceived;

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        
        int currentConnections = websocketConnectionsGauge.incrementAndGet();
        log.debug("WebSocket connection established: sessionId={}, totalConnections={}", 
                sessionId, currentConnections);
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        
        int currentConnections = websocketConnectionsGauge.decrementAndGet();
        log.debug("WebSocket connection closed: sessionId={}, totalConnections={}", 
                sessionId, currentConnections);
    }

    @EventListener
    public void handleWebSocketSubscribeListener(SessionSubscribeEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String destination = headerAccessor.getDestination();
        log.debug("WebSocket subscription: destination={}", destination);
    }
}
