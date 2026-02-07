export type SessionTopicEvent =
  | {
      type: "accepted";
      sessionId: string;
      userMessageId: string;
      interviewerMessageId: string;
    }
  | {
      type: "ai_delta";
      sessionId: string;
      interviewerMessageId: string;
      delta: string;
      messageStatus?: string;
    }
  | {
      type: "ai_complete";
      sessionId: string;
      interviewerMessageId: string;
      content: string;
      messageStatus?: string;
    }
  | {
      type: "ai_failed";
      sessionId: string;
      interviewerMessageId: string;
      error?: string;
      messageStatus?: string;
    }
  | {
      type: "message_limit_exceeded";
      sessionId: string;
      messageLimit: number;
      messageCount: number;
      tier: string;
      error?: string;
    };
