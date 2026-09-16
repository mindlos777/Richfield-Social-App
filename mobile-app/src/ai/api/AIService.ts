import {
  supabase,
  supabasePublicKey,
  supabaseUrl,
} from "../../lib/supabase";

import type {
  AIBootstrapResponse,
  AIChatResponse,
  AIStreamEvent,
} from "../types/ai";

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

async function parseResponse(
  response: Response
) {
  const rawText =
    await response.text();

  let body: any =
    null;

  if (rawText) {
    try {
      body =
        JSON.parse(
          rawText
        );
    } catch {
      body = {
        message:
          rawText,
      };
    }
  }

  if (!response.ok) {
    throw new Error(
      body?.message ||
        body?.error ||
        `Richfield AI request failed (${response.status}).`
    );
  }

  if (body?.error) {
    throw new Error(
      body?.message ||
        body.error
    );
  }

  return body;
}

export async function bootstrapAI():
Promise<AIBootstrapResponse> {
  ensureSupabaseConfig();

  const accessToken =
    await getAccessToken();

  const response =
    await fetch(
      `${supabaseUrl}/functions/v1/ai-chat`,
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
            "application/json",
        },

        body:
          JSON.stringify({
            action:
              "bootstrap",
          }),
      }
    );

  return await parseResponse(
    response
  );
}

export async function sendAIMessage(
  message: string,
  conversationId:
    string | null
): Promise<AIChatResponse> {
  ensureSupabaseConfig();

  const cleanMessage =
    message.trim();

  if (!cleanMessage) {
    throw new Error(
      "Please enter a message."
    );
  }

  const accessToken =
    await getAccessToken();

  const response =
    await fetch(
      `${supabaseUrl}/functions/v1/ai-chat`,
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
            "application/json",
        },

        body:
          JSON.stringify({
            action:
              "chat",

            message:
              cleanMessage,

            conversationId,

            stream:
              false,
          }),
      }
    );

  return await parseResponse(
    response
  );
}

export async function streamAIMessage({
  message,
  conversationId,
  onStart,
  onDelta,
  onDone,
}: {
  message:
    string;

  conversationId:
    string | null;

  onStart?:
    (
      conversationId:
        string
    ) => void;

  onDelta?:
    (
      delta:
        string
    ) => void;

  onDone?:
    (
      event:
        Extract<
          AIStreamEvent,
          {
            type:
              "done";
          }
        >
    ) => void;
}) {
  ensureSupabaseConfig();

  const cleanMessage =
    message.trim();

  if (!cleanMessage) {
    throw new Error(
      "Please enter a message."
    );
  }

  const accessToken =
    await getAccessToken();

  const response =
    await fetch(
      `${supabaseUrl}/functions/v1/ai-chat`,
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

  if (!response.ok) {
    const rawText =
      await response.text();

    let body: any =
      null;

    try {
      body =
        JSON.parse(
          rawText
        );
    } catch {
      body = {
        message:
          rawText,
      };
    }

    throw new Error(
      body?.message ||
        body?.error ||
        `Richfield AI request failed (${response.status}).`
    );
  }

  if (!response.body) {
    throw new Error(
      "Richfield AI streaming is unavailable."
    );
  }

  const reader =
    response.body
      .getReader();

  const decoder =
    new TextDecoder();

  let buffer =
    "";

  function processEvent(
    rawEvent:
      string
  ) {
    const dataLines =
      rawEvent
        .split(
          /\r?\n/
        )
        .filter(
          line =>
            line.startsWith(
              "data:"
            )
        );

    for (
      const line of
      dataLines
    ) {
      const jsonText =
        line
          .slice(5)
          .trim();

      if (
        !jsonText ||
        jsonText ===
          "[DONE]"
      ) {
        continue;
      }

      let event:
        AIStreamEvent;

      try {
        event =
          JSON.parse(
            jsonText
          );
      } catch {
        continue;
      }

      if (
        event.type ===
        "start"
      ) {
        onStart?.(
          event.conversationId
        );

        continue;
      }

      if (
        event.type ===
        "delta"
      ) {
        onDelta?.(
          event.delta
        );

        continue;
      }

      if (
        event.type ===
        "done"
      ) {
        onDone?.(
          event
        );

        continue;
      }

      if (
        event.type ===
        "error"
      ) {
        throw new Error(
          event.message ||
            "Richfield AI failed to respond."
        );
      }
    }
  }

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
          stream:
            true,
        }
      );

    const events =
      buffer.split(
        /\r?\n\r?\n/
      );

    buffer =
      events.pop() ||
      "";

    for (
      const event of
      events
    ) {
      processEvent(
        event
      );
    }
  }

  buffer +=
    decoder.decode();

  if (
    buffer.trim()
  ) {
    processEvent(
      buffer
    );
  }
}