# AI Processing Package

This package contains all logic for processing AI interview messages.

## 📁 Structure

```
ai/
├── AIMessageProcessor.java      # Main orchestrator - handles complete processing flow
├── AIChatService.java            # Spring AI integration - generates responses
├── consumer/
│   └── SQSMessageConsumer.java   # Consumes SQS messages and triggers processing
└── dto/
    ├── AIProcessingRequest.java  # Input DTO for processing jobs
    └── AIProcessingResult.java  # Output DTO with status and results
```

## ✅ Spring AI Setup (current)

- **No `AIConfig` class**: we rely on **Spring AI auto-configuration** from `spring-ai-starter-model-openai`.
- `AIChatService` injects **`ChatClient.Builder`** (Spring AI provides this bean) and calls `build()`.
- **No fallback mode**: if the API key / model is not configured correctly, the app should fail fast.

## 🔄 Flow

1. **User sends message** → WebSocket → `InterviewStompController`
2. **Controller** → `MessageService.createUserMessageAndEnqueue()`
3. **MessageService** → Creates USER message + INTERVIEWER placeholder → `SQSService.enqueueMessageJob()`
4. **SQS** → `SQSMessageConsumer.processMessage()` (async)
5. **Consumer** → `AIMessageProcessor.processMessage()`
6. **Processor** → `AIChatService.generateResponse()` → Updates placeholder with AI response
7. **Optional:** Send WebSocket notification to frontend when complete

### Production (Real SQS)

1. **Configure AWS:**
   ```properties
   app.sqs.enabled=true
   app.sqs.queue-url=https://sqs.region.amazonaws.com/account/queue-name
   ```

2. **Set up SQS listener** (Spring Cloud AWS or manual polling)

3. **Note:** `RealSQSService` is currently a **stub** (it throws `UnsupportedOperationException`)
   until you add AWS SDK dependencies and implement actual queue publishing.

## 🔧 Configuration

### OpenAI API Key

Set via environment variable (recommended) or properties:
```bash
export SPRING_AI_OPENAI_API_KEY="sk-..."
```

In `application.properties` we use:
```properties
spring.ai.openai.api-key=${SPRING_AI_OPENAI_API_KEY}
```

### AI Model Settings

```properties
spring.ai.openai.chat.options.model=gpt-4o-mini
spring.ai.openai.chat.options.temperature=0.7
```

## 📝 Next Steps

- [ ] Add Redis Pub/Sub for streaming AI responses
- [ ] Add retry logic with exponential backoff
- [ ] Add dead-letter queue handling
- [ ] Add WebSocket notifications when AI response is ready
- [ ] Add streaming responses (token-by-token)
