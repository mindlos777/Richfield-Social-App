export type AIRole =
  | "student"
  | "alumni"
  | "business"
  | "admin";

export type AIMessageRole =
  | "user"
  | "assistant";

export type AIMessage = {
  id: string;

  role:
    AIMessageRole;

  content:
    string;

  created_at?:
    string;
};

export type AIUsage = {
  used:
    number;

  limit:
    number;

  remaining:
    number;
};

export type AIBootstrapResponse = {
  role:
    AIRole;

  firstName:
    string;

  conversationId:
    string | null;

  messages:
    AIMessage[];

  usage:
    AIUsage;
};

export type AIChatResponse = {
  conversationId:
    string;

  message: {
    role:
      "assistant";

    content:
      string;
  };

  usage:
    AIUsage;
};

export type AIStreamStartEvent = {
  type:
    "start";

  conversationId:
    string;
};

export type AIStreamDeltaEvent = {
  type:
    "delta";

  delta:
    string;
};

export type AIStreamDoneEvent = {
  type:
    "done";

  conversationId:
    string;

  usage:
    AIUsage;
};

export type AIStreamErrorEvent = {
  type:
    "error";

  message:
    string;
};

export type AIStreamEvent =
  | AIStreamStartEvent
  | AIStreamDeltaEvent
  | AIStreamDoneEvent
  | AIStreamErrorEvent;