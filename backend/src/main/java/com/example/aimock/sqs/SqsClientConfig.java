package com.example.aimock.sqs;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.SqsClientBuilder;

import java.net.URI;

@Configuration
@ConditionalOnProperty(name = "app.sqs.enabled", havingValue = "true")
public class SqsClientConfig {

    @Bean
    public SqsClient sqsClient(
            @Value("${app.sqs.region:ap-southeast-2}") String region,
            @Value("${app.sqs.endpoint:}") String endpointOverride) {

        SqsClientBuilder builder = SqsClient.builder()
                .credentialsProvider(DefaultCredentialsProvider.create())
                .region(Region.of(region));

        if (endpointOverride != null && !endpointOverride.isBlank()) {
            builder = builder.endpointOverride(URI.create(endpointOverride));
        }

        return builder.build();
    }
}

