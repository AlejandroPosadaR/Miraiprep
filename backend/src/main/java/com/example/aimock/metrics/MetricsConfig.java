package com.example.aimock.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.atomic.AtomicInteger;

/**
 * Configuration for custom application metrics.
 * These metrics track WebSocket connections, AI processing, and message handling.
 */
@Configuration
@RequiredArgsConstructor
public class MetricsConfig {

    private final MeterRegistry meterRegistry;

    /**
     * Gauge for active WebSocket connections
     */
    @Bean
    public AtomicInteger websocketConnectionsGauge() {
        AtomicInteger gauge = new AtomicInteger(0);
        meterRegistry.gauge("websocket.connections.active", gauge);
        return gauge;
    }

    /**
     * Counter for total WebSocket messages sent
     */
    @Bean
    public Counter websocketMessagesSent() {
        return Counter.builder("websocket.messages.sent")
                .description("Total number of WebSocket messages sent")
                .register(meterRegistry);
    }

    /**
     * Counter for total WebSocket messages received
     */
    @Bean
    public Counter websocketMessagesReceived() {
        return Counter.builder("websocket.messages.received")
                .description("Total number of WebSocket messages received")
                .register(meterRegistry);
    }

    /**
     * Timer for AI response generation
     */
    @Bean
    public Timer aiResponseTimer() {
        return Timer.builder("ai.response.duration")
                .description("Time taken to generate AI responses")
                .register(meterRegistry);
    }

    /**
     * Timer for time-to-first-token (TTFT)
     * Measures latency from when a message is received until the first AI token is streamed
     */
    @Bean
    public Timer aiTimeToFirstToken() {
        return Timer.builder("ai.time_to_first_token")
                .description("Time from message receipt to first AI token (TTFT)")
                .publishPercentiles(0.5, 0.75, 0.95, 0.99) // Enable percentiles
                .publishPercentileHistogram(true) // Enable histogram buckets for Prometheus
                .register(meterRegistry);
    }

    /**
     * Counter for AI processing success/failure
     */
    @Bean
    public Counter aiProcessingSuccess() {
        return Counter.builder("ai.processing.success")
                .description("Number of successful AI processing jobs")
                .register(meterRegistry);
    }

    @Bean
    public Counter aiProcessingFailure() {
        return Counter.builder("ai.processing.failure")
                .description("Number of failed AI processing jobs")
                .register(meterRegistry);
    }

    /**
     * Counter for messages created
     */
    @Bean
    public Counter messagesCreated() {
        return Counter.builder("messages.created")
                .description("Total number of messages created")
                .tag("type", "total")
                .register(meterRegistry);
    }
}
