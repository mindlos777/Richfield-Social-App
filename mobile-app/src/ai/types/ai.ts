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