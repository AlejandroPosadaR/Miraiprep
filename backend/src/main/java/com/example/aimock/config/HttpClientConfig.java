package com.example.aimock.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.support.AllEncompassingFormHttpMessageConverter;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

/**
 * Configuration for HTTP clients used for external API calls.
 */
@Configuration
public class HttpClientConfig {

    @Bean
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10000); // 10 seconds
        factory.setReadTimeout(30000);    // 30 seconds
        
        RestTemplate restTemplate = new RestTemplate(factory);
        
        // Ensure multipart form data converter is available for file uploads
        List<HttpMessageConverter<?>> messageConverters = new ArrayList<>(restTemplate.getMessageConverters());
        messageConverters.add(new AllEncompassingFormHttpMessageConverter());
        restTemplate.setMessageConverters(messageConverters);
        
        return restTemplate;
    }
}
