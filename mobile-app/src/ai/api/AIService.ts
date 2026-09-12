import {
  fetch as expoFetch,
} from "expo/fetch";

import {
  supabase,
  supabasePublicKey,
  supabaseUrl,
} from "../../lib/supabase";

import type {
  AIBootstrapResponse,
  AIChatResponse,
  AIUsage,
} from "../types/ai";

/* =========================================================
   TYPES
========================================================= */

type StreamCallbacks = {
  onStart?: (
    conversationId: string
  ) => void;

  onDelta?: (
    delta: string
  ) => void;

  onDone?: (
    usage: AIUsage,
    conversationId: string
  ) => void;
};

type StreamResult = {
  conversationId: string;
  usage: AIUsage;
};

/* =========================================================
   CONFIG CHECK
========================================================= */

function ensureSupabaseConfig() {
  if (!supabaseUrl) {
    throw new Error(
      "Supabase URL is missing. Check your .env file and restart Expo."
    );
  }

  if (!supabasePublicKey) {
    throw new Error(
      "Supabase public key is missing. Check your .env file and restart Expo."
    );
  }
}

/* =========================================================
   CURRENT ACCESS TOKEN
========================================================= */

async function getAccessToken() {
  const {
    data,
    error,
  } =
    await supabase.auth
      .getSession();

  if (error) {
    throw error;
  }

  const accessToken =
    data.session
      ?.access_token;

  if (!accessToken) {
    throw new Error(
      "You need to be signed in to use Richfield AI."
    );
  }

  return accessToken;
}

/* =========================================================
   FUNCTION ERROR
========================================================= */

async function extractFunctionError(
  error: any
) {
  let body: any =
    null;

  try {
    if (
      error?.context?.json
    ) {
      body =
        await error.context
          .json();
    }
  } catch {
    body =
      null;
  }

  return (
    body?.message ||
    body?.error ||
    error?.message ||
    "Richfield AI request failed."
  );
}

/* =========================================================
   LOAD CONVERSATION
========================================================= */

export async function loadAIConversation():
  Promise<AIBootstrapResponse> {
  const {
    data,
    error,
  } =
    await supabase
      .functions
      .invoke(
        "ai-chat",
        {
          body: {
            action:
              "bootstrap",
          },
        }
      );

  if (error) {
    const message =
      await extractFunctionError(
        error
      );

    throw new Error(
      message
    );
  }

  if (data?.error) {
    throw new Error(
      data?.message ||
        data.error
    );
  }

  return (
    data as
      AIBootstrapResponse
  );
}

/* =========================================================
   NORMAL CHAT
========================================================= */

export async function sendAIMessage(
  message: string,
  conversationId:
    string | null
): Promise<AIChatResponse> {
  const cleanMessage =
    message.trim();

  if (!cleanMessage) {
    throw new Error(
      "Message is required."
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .functions
      .invoke(
        "ai-chat",
        {
          body: {
            action:
              "chat",

            message:
              cleanMessage,

            conversationId,

            stream:
              false,
          },
        }
      );

  if (error) {
    const errorMessage =
      await extractFunctionError(
        error
      );

    throw new Error(
      errorMessage
    );
  }

  if (data?.error) {
    throw new Error(
      data?.message ||
        data.error
    );
  }

  return (
    data as AIChatResponse
  );
}

/* =========================================================
   SSE EVENT
========================================================= */

function parseSSEEvent(
  event: string
) {
  const dataLines =
    event
      .split("\n")
      .filter(
        line =>
          line.startsWith(
            "data:"
          )
      );

  if (
    dataLines.length ===
    0
  ) {
    return null;
  }

  const combined =
    dataLines
      .map(
        line =>
          line
            .slice(5)
            .trim()
      )
      .join("");

  if (
    !combined ||
    combined ===
      "[DONE]"
  ) {
    return null;
  }

  try {
    return JSON.parse(
      combined
    );
  } catch (error) {
    console.log(
      "SSE parse error:",
      combined,
      error
    );

    return null;
  }
}

/* =========================================================
   STREAM AI MESSAGE
========================================================= */

export async function streamAIMessage(
  message: string,
  conversationId:
    string | null,
  callbacks:
    StreamCallbacks = {}
): Promise<StreamResult> {
  ensureSupabaseConfig();

  const cleanMessage =
    message.trim();

  if (!cleanMessage) {
    throw new Error(
      "Message is required."
    );
  }

  const accessToken =
    await getAccessToken();

  const functionUrl =
    `${supabaseUrl}/functions/v1/ai-chat`;

  console.log(
    "Starting Richfield AI stream..."
  );

  const response =
    await expoFetch(
      functionUrl,
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          apikey:
            supabasePublicKey,

          "Content-Type":
            "application/json",

          Accept:
            "text/event-stream",
        },

        body:
          JSON.stringify({
            action:
              "chat",

            message:
              cleanMessage,

            conversationId,

            stream:
              true,
          }),
      }
    );

  /* =======================================================
     HTTP ERROR
  ======================================================= */

  if (!response.ok) {
    let serverMessage =
      "";

    try {
      const body =
        await response.json();

      serverMessage =
        body?.message ||
        body?.error ||
        "";
    } catch {
      try {
        serverMessage =
          await response.text();
      } catch {
        serverMessage =
          "";
      }
    }

    console.log(
      "AI HTTP error:",
      response.status,
      serverMessage
    );

    throw new Error(
      serverMessage ||
        `Richfield AI request failed (${response.status}).`
    );
  }

  /* =======================================================
     STREAM BODY
  ======================================================= */

  if (!response.body) {
    throw new Error(
      "Streaming is not available on this device."
    );
  }

  const reader =
    response.body
      .getReader();

  const decoder =
    new TextDecoder();

  let buffer =
    "";

  let finalConversationId =
    conversationId ||
    "";

  let finalUsage:
    AIUsage = {
      used: 0,
      limit: 0,
      remaining: 0,
    };

  let receivedDone =
    false;

  /* =======================================================
     PROCESS EVENT
  ======================================================= */

  function processEvent(
    rawEvent: string
  ) {
    const payload =
      parseSSEEvent(
        rawEvent
      );

    if (!payload) {
      return;
    }

    /* START */

    if (
      payload.type ===
      "start"
    ) {
      finalConversationId =
        String(
          payload
            .conversationId ||
            finalConversationId
        );

      callbacks
        .onStart?.(
          finalConversationId
        );

      return;
    }

    /* TEXT CHUNK */

    if (
      payload.type ===
      "delta"
    ) {
      const delta =
        String(
          payload.delta ||
          ""
        );

      if (delta) {
        callbacks
          .onDelta?.(
            delta
          );
      }

      return;
    }

    /* FINISHED */

    if (
      payload.type ===
      "done"
    ) {
      receivedDone =
        true;

      finalConversationId =
        String(
          payload
            .conversationId ||
            finalConversationId
        );

      if (
        payload.usage
      ) {
        finalUsage =
          payload.usage;
      }

      callbacks
        .onDone?.(
          finalUsage,
          finalConversationId
        );

      return;
    }

    /* SERVER STREAM ERROR */

    if (
      payload.type ===
      "error"
    ) {
      throw new Error(
        payload.message ||
          "Richfield AI streaming failed."
      );
    }
  }

  /* =======================================================
     READ STREAM
  ======================================================= */

  while (true) {
    const {
      done,
      value,
    } =
      await reader.read();

    if (done) {
      break;
    }

    if (!value) {
      continue;
    }

    buffer +=
      decoder.decode(
        value,
        {
          stream: true,
        }
      );

    /*
     * Handles both:
     *
     * \n\n
     * \r\n\r\n
     */

    const events =
      buffer.split(
        /\r?\n\r?\n/
      );

    buffer =
      events.pop() ||
      "";

    for (
      const event of events
    ) {
      processEvent(
        event
      );
    }
  }

  /* Flush decoder */

  buffer +=
    decoder.decode();

  if (
    buffer.trim()
  ) {
    processEvent(
      buffer
    );
  }

  if (
    !finalConversationId
  ) {
    throw new Error(
      "Richfield AI stream ended without a conversation ID."
    );
  }

  if (!receivedDone) {
    throw new Error(
      "Richfield AI stream ended before completion."
    );
  }

  return {
    conversationId:
      finalConversationId,

    usage:
      finalUsage,
  };
}

/* =========================================================
   STREAM + SAFE FALLBACK
========================================================= */

export async function sendAIMessageWithStreaming(
  message: string,
  conversationId:
    string | null,
  callbacks:
    StreamCallbacks = {}
): Promise<StreamResult> {
  try {
    return await streamAIMessage(
      message,
      conversationId,
      callbacks
    );
  } catch (error: any) {
    const errorMessage =
      String(
        error?.message ||
        ""
      );

    /*
     * Only fallback when the DEVICE cannot
     * perform streaming.
     *
     * We do not fallback on normal server errors,
     * otherwise the same message could accidentally
     * be submitted twice.
     */

    const canFallback =
      errorMessage.includes(
        "Streaming is not available"
      ) ||
      errorMessage.includes(
        "ReadableStream"
      ) ||
      errorMessage.includes(
        "getReader"
      );

    if (!canFallback) {
      throw error;
    }

    console.log(
      "Streaming unsupported. Using normal Richfield AI request."
    );

    const result =
      await sendAIMessage(
        message,
        conversationId
      );

    callbacks
      .onStart?.(
        result
          .conversationId
      );

    callbacks
      .onDelta?.(
        result
          .message
          .content
      );

    callbacks
      .onDone?.(
        result.usage,
        result
          .conversationId
      );

    return {
      conversationId:
        result
          .conversationId,

      usage:
        result.usage,
    };
  }
}