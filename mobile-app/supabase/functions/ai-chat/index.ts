// @ts-expect-error Supabase Edge Functions resolve URL imports at runtime.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  executeAITool,
  GEMINI_AI_TOOLS,
} from "../_shared/aiTools";

declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };

  serve(
    handler: (
      request: Request
    ) => Response | Promise<Response>
  ): void;
};

declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const streamHeaders = {
  ...corsHeaders,
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
};

/* =========================================================
   TYPES
========================================================= */

type UserRole =
  | "student"
  | "alumni"
  | "business"
  | "admin";

type AIProvider =
  | "gemini"
  | "openai";

type StoredMessage = {
  id?: string;
  role: "user" | "assistant";
  content_ciphertext: string;
  iv: string;
  created_at: string;
};

type HistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

type AIResult = {
  text: string;
  inputTokens: number;
  outputTokens: number;
};

type StreamUsage = {
  inputTokens: number;
  outputTokens: number;
};

type UsageRow = {
  request_count?: number | null;
  voice_request_count?: number | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
};

/* =========================================================
   LIMITS
========================================================= */

const DAILY_LIMITS: Record<UserRole, number> = {
  student: 10,
  alumni: 10,
  business: 15,
  admin: 25,
};

/* =========================================================
   RESPONSE HELPERS
========================================================= */

function jsonResponse(
  data: unknown,
  status = 200
) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type":
          "application/json",
      },
    }
  );
}

function sseMessage(
  data: unknown
) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

/* =========================================================
   DATE
========================================================= */

function getJohannesburgDate() {
  const parts =
    new Intl.DateTimeFormat(
      "en-ZA",
      {
        timeZone:
          "Africa/Johannesburg",
        year:
          "numeric",
        month:
          "2-digit",
        day:
          "2-digit",
      }
    ).formatToParts(
      new Date()
    );

  const year =
    parts.find(
      item =>
        item.type ===
        "year"
    )?.value;

  const month =
    parts.find(
      item =>
        item.type ===
        "month"
    )?.value;

  const day =
    parts.find(
      item =>
        item.type ===
        "day"
    )?.value;

  return `${year}-${month}-${day}`;
}

/* =========================================================
   BASE64
========================================================= */

function bytesToBase64(
  bytes: Uint8Array
) {
  let binary = "";

  for (
    const byte of bytes
  ) {
    binary +=
      String.fromCharCode(
        byte
      );
  }

  return btoa(binary);
}

function base64ToBytes(
  value: string
) {
  const binary =
    atob(value);

  return Uint8Array.from(
    binary,
    character =>
      character.charCodeAt(0)
  );
}

/* =========================================================
   ENCRYPTION
========================================================= */

async function getEncryptionKey() {
  const secret =
    Deno.env.get(
      "AI_ENCRYPTION_KEY"
    );

  if (!secret) {
    throw new Error(
      "AI_ENCRYPTION_KEY is missing."
    );
  }

  const raw =
    base64ToBytes(
      secret
    );

  if (
    raw.length !== 32
  ) {
    throw new Error(
      "AI_ENCRYPTION_KEY must be 32 bytes."
    );
  }

  return crypto.subtle.importKey(
    "raw",
    raw,
    {
      name:
        "AES-GCM",
    },
    false,
    [
      "encrypt",
      "decrypt",
    ]
  );
}

async function encryptText(
  text: string
) {
  const key =
    await getEncryptionKey();

  const iv =
    crypto.getRandomValues(
      new Uint8Array(12)
    );

  const encoded =
    new TextEncoder()
      .encode(text);

  const encrypted =
    await crypto.subtle.encrypt(
      {
        name:
          "AES-GCM",
        iv,
      },
      key,
      encoded
    );

  return {
    ciphertext:
      bytesToBase64(
        new Uint8Array(
          encrypted
        )
      ),

    iv:
      bytesToBase64(
        iv
      ),
  };
}

async function decryptText(
  ciphertext: string,
  ivString: string
) {
  const key =
    await getEncryptionKey();

  const encrypted =
    base64ToBytes(
      ciphertext
    );

  const iv =
    base64ToBytes(
      ivString
    );

  const decrypted =
    await crypto.subtle.decrypt(
      {
        name:
          "AES-GCM",
        iv,
      },
      key,
      encrypted
    );

  return new TextDecoder()
    .decode(
      decrypted
    );
}

/* =========================================================
   ROLE PROMPTS
========================================================= */

function getRolePrompt(
  role: UserRole
) {
  switch (role) {
    case "student":
      return `
You are currently assisting a Richfield student.

You can help with:
- improving their professional profile
- professional headlines and summaries
- skills and portfolio guidance
- GitHub and CV advice
- career planning
- interview preparation
- professional networking
- approaching alumni professionally
- creating professional posts
- internships and graduate opportunities
- understanding career pathways
- Richfield platform guidance

Never claim to know live jobs, events, analytics or another person's information unless that information was actually provided by an approved platform tool.

Never expose information belonging to another user.
`;

    case "alumni":
      return `
You are currently assisting a verified Richfield alumni user.

You can help with:
- professional profile improvement
- career growth
- mentoring students
- networking
- creating professional posts
- portfolio and CV improvement
- interview preparation
- career stories
- professional recommendations

Do not expose private student information.
`;

    case "business":
      return `
You are currently assisting a verified business or recruiter.

You can help with:
- improving the company profile
- writing professional job listings
- internship and graduate programme descriptions
- identifying useful skills for vacancies
- recruitment strategy
- interpreting business analytics
- communicating professionally with candidates

You must never reveal private student information.

Business users may only access information that students have made available to business users.
`;

    case "admin":
      return `
You are currently assisting a Richfield administrator.

You can help with:
- drafting announcements
- event descriptions
- moderation guidance
- opportunity review
- understanding platform analytics
- platform administration guidance

Never reveal passwords, access tokens or authentication credentials.
`;

    default:
      return "";
  }
}

function createSystemPrompt(
  role: UserRole,
  name: string
) {
  return `
You are Richfield AI, the friendly AI assistant inside the Richfield Connect mobile application.

USER
Name: ${name || "User"}
Role: ${role}

PERSONALITY
- Speak naturally like a fun helpful human, not like a formal chatbot.
- Be friendly, warm and interesting to talk to.
- Keep responses fairly short and conversational.
- Match the user's tone and communication style.
- If the user is casual, you can be casual.
- If the user is professional, respond professionally.
- Adapt to the language the user is currently using.
- If the user switches languages, follow their language when you can communicate accurately in it.
- Do not unnecessarily greet the user again during an ongoing conversation.
- Remember the previous conversation messages provided to you and treat follow-up questions as part of the same discussion.
- Do not repeatedly introduce yourself.
- You may occasionally use an emoji when it naturally fits, but do not overuse emojis.
- Prefer direct answers and practical next steps.

RESPONSE STYLE

Write responses as clean mobile chat messages.
Do not use Markdown syntax.

Never output:
# headings
## headings
### headings
**bold markers**
* markdown bullets
--- horizontal dividers
backticks
markdown tables

- Use normal readable text instead.
- For a short answer, respond naturally in one or two paragraphs.
- For advice with several points, use a clean structure such as:

Improving your portfolio

1. Quality over quantity
Choose 3 to 4 strong projects that show what you can actually build.

2. Explain each project
Briefly explain the problem, what you built, your role and the result.

3. Make it easy to explore
- Include working links to GitHub, live projects or screenshots.
- Do not over-structure simple questions.
- Keep normal responses concise, usually around 60 to 150 words.
- Only give a longer answer when the user clearly asks for detail.
- Match the user's language, tone and style.
- Do not greet the user again during an ongoing conversation.
- Use emojis occasionally when they naturally improve the conversation, but normally use no more than one or two.

RESPONSE LENGTH

Keep fun and normal answers concise.
Aim for about 80 to 180 words for most replies. Don't exceed 500 tokens.
You may use more words when necessary to complete the explanation properly.
Never stop halfway through a sentence, list or explanation.
If the answer would be too long, shorten it while still finishing the main point.
Prioritize completing the response over adding extra detail.

ACADEMIC AND CODING RESTRICTIONS
- Do not write programming code for the user.
- Do not solve programming exercises.
- Do not complete assignments, tests, exams, homework or assessed coursework for the user.
- Do not generate ready-to-submit academic answers.
- If asked for code, politely explain that Richfield AI focuses on career development and the Richfield Connect platform.
- You may give high-level career guidance about technology roles, skills, portfolios, GitHub and professional development without writing code.
- You may explain how a Richfield Connect feature works, but do not produce source code.
- If asked to complete an assignment, offer general study direction only and redirect toward allowed career or platform support.

CONVERSATION CONTINUITY
- Treat the supplied chat history as the same ongoing conversation.
- Use previous messages when interpreting short follow-up questions.
- If the user already greeted you, do not greet them again on every message.
- Never behave as if each message starts a new conversation.
- Do not repeat information unless it helps answer the new question.
- Understand references such as "it", "that", "what about that one", "and then?", or similar follow-ups using the conversation history.

IMPORTANT RULES
- Never invent platform data.
- Never invent job listings.
- Never invent profile statistics.
- Never invent events.
- Never pretend an app action happened unless the platform confirms it.
- Never reveal another user's private information.
- Never reveal secrets, passwords or authentication tokens.
- Respect the user's role.
- Do not provide access to functionality belonging to another role.

${getRolePrompt(role)}
`;
}

/* =========================================================
   PROVIDER
========================================================= */

function getAIProvider():
  AIProvider {
  const provider =
    (
      Deno.env.get(
        "AI_PROVIDER"
      ) ||
      "gemini"
    )
      .toLowerCase()
      .trim();

  if (
    provider ===
      "gemini" ||
    provider ===
      "openai"
  ) {
    return provider;
  }

  throw new Error(
    `Unsupported AI provider: ${provider}`
  );
}

/* =========================================================
   GEMINI NORMAL RESPONSE
========================================================= */
type VerifiedToolContext = {
  tool:
    string;

  result:
    any;
};

async function
getGeminiToolContext(
  adminClient:
    any,
  userId:
    string,
  role:
    UserRole,
  systemPrompt:
    string,
  history:
    HistoryMessage[],
  message:
    string
): Promise<
  VerifiedToolContext[]
> {
  const apiKey =
    Deno.env.get(
      "GEMINI_API_KEY"
    );

  const model =
    Deno.env.get(
      "GEMINI_MODEL"
    ) ||
    "gemini-3.8-flash";

  if (!apiKey) {
    return [];
  }

  const contents = [
    ...history.map(
      item => ({
        role:
          item.role ===
          "assistant"
            ? "model"
            : "user",

        parts: [
          {
            text:
              item.content,
          },
        ],
      })
    ),

    {
      role:
        "user",

      parts: [
        {
          text:
            message,
        },
      ],
    },
  ];

  try {
    const response =
      await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            "x-goog-api-key":
              apiKey,
          },

          body:
            JSON.stringify({
              systemInstruction: {
                parts: [
                  {
                    text:
                      `${systemPrompt}

TOOL RULES

Use an approved tool whenever the user asks about live or personal Richfield Connect data.

Use get_my_profile for questions about their actual profile.

Use get_my_profile_strength for profile completeness, missing sections or profile score.

Use find_matching_opportunities for real internships, jobs, learnerships or graduate opportunities.

Use get_upcoming_events for real Richfield events.

Do not invent live data if no tool provides it.

Do not request another user's ID.

Only call tools that are genuinely relevant to the user's request.`,
                  },
                ],
              },

              contents,

              tools: [
                {
                  functionDeclarations:
                    GEMINI_AI_TOOLS,
                },
              ],

              toolConfig: {
                functionCallingConfig: {
                  mode:
                    "AUTO",
                },
              },

              generationConfig: {
                maxOutputTokens:
                  200,
              },
            }),
        }
      );

    const data =
      await response.json();

    if (
      !response.ok
    ) {
      console.error(
        "Tool planner error:",
        data
      );

      return [];
    }

    const parts =
      data
        ?.candidates?.[0]
        ?.content
        ?.parts ||
      [];

    const functionCalls =
      parts
        .map(
          (
            part:
              any
          ) =>
            part
              ?.functionCall
        )
        .filter(
          Boolean
        );

    if (
      functionCalls.length ===
      0
    ) {
      return [];
    }

    const results:
      VerifiedToolContext[] =
      [];

    /*
     * Cap the number of tools per request.
     *
     * Prevents one prompt from creating a large
     * number of database operations.
     */

    const allowedCalls =
      functionCalls.slice(
        0,
        3
      );

    for (
      const call of
      allowedCalls
    ) {
      const name =
        String(
          call?.name ||
          ""
        );

      const args =
        call?.args &&
        typeof call.args ===
          "object"
          ? call.args
          : {};

      console.log(
        `Richfield AI tool: ${name}`
      );

      const result =
        await executeAITool(
          adminClient,
          userId,
          role,
          name,
          args
        );

      results.push({
        tool:
          name,

        result,
      });
    }

    return results;
  } catch (
    error
  ) {
    console.error(
      "Gemini tool planning error:",
      error
    );

    /*
     * AI chat should still work if the
     * planner temporarily fails.
     */
    return [];
  }
}

async function callGemini(
  systemPrompt: string,
  history: HistoryMessage[],
  message: string
): Promise<AIResult> {
  const apiKey =
    Deno.env.get(
      "GEMINI_API_KEY"
    );

  const model =
    Deno.env.get(
      "GEMINI_MODEL"
    ) ||
    "gemini-3.8-flash";

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured."
    );
  }

  const contents = [
    ...history.map(
      item => ({
        role:
          item.role ===
          "assistant"
            ? "model"
            : "user",

        parts: [
          {
            text:
              item.content,
          },
        ],
      })
    ),

    {
      role:
        "user",

      parts: [
        {
          text:
            message,
        },
      ],
    },
  ];

  const response =
    await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",

          "x-goog-api-key":
            apiKey,
        },

        body:
          JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text:
                    systemPrompt,
                },
              ],
            },

            contents,

            generationConfig: {
              maxOutputTokens:
                300,
            },
          }),
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    console.error(
      "Gemini error:",
      data
    );

    throw new Error(
      data?.error
        ?.message ||
        "Gemini request failed."
    );
  }

  const text =
    (
      data
        ?.candidates?.[0]
        ?.content
        ?.parts ||
      []
    )
      .map(
        (part: any) =>
          part?.text ||
          ""
      )
      .join("")
      .trim();

  if (!text) {
    throw new Error(
      "Gemini returned an empty response."
    );
  }

  return {
    text,

    inputTokens:
      data
        ?.usageMetadata
        ?.promptTokenCount ||
      0,

    outputTokens:
      data
        ?.usageMetadata
        ?.candidatesTokenCount ||
      0,
  };
}

/* =========================================================
   OPENAI NORMAL RESPONSE
========================================================= */

async function callOpenAI(
  systemPrompt: string,
  history: HistoryMessage[],
  message: string
): Promise<AIResult> {
  const apiKey =
    Deno.env.get(
      "OPENAI_API_KEY"
    );

  const model =
    Deno.env.get(
      "OPENAI_MODEL"
    ) ||
    "gpt-4o-mini";

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured."
    );
  }

  const input = [
    ...history.map(
      item => ({
        role:
          item.role,
        content:
          item.content,
      })
    ),

    {
      role:
        "user",
      content:
        message,
    },
  ];

  const response =
    await fetch(
      "https://api.openai.com/v1/responses",
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${apiKey}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            model,
            instructions:
              systemPrompt,
            input,
            max_output_tokens:
              500,
          }),
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    console.error(
      "OpenAI error:",
      data
    );

    throw new Error(
      data?.error
        ?.message ||
        "OpenAI request failed."
    );
  }

  let text =
    typeof data
      ?.output_text ===
      "string"
      ? data.output_text.trim()
      : "";

  if (!text) {
    const pieces:
      string[] = [];

    for (
      const item of
      data?.output || []
    ) {
      for (
        const content of
        item?.content || []
      ) {
        if (
          content?.type ===
            "output_text" &&
          typeof content
            ?.text ===
            "string"
        ) {
          pieces.push(
            content.text
          );
        }
      }
    }

    text =
      pieces
        .join("")
        .trim();
  }

  if (!text) {
    throw new Error(
      "OpenAI returned an empty response."
    );
  }

  return {
    text,

    inputTokens:
      data
        ?.usage
        ?.input_tokens ||
      0,

    outputTokens:
      data
        ?.usage
        ?.output_tokens ||
      0,
  };
}

async function generateAIResponse(
  systemPrompt: string,
  history: HistoryMessage[],
  message: string
) {
  const provider =
    getAIProvider();

  if (
    provider ===
    "gemini"
  ) {
    return callGemini(
      systemPrompt,
      history,
      message
    );
  }

  return callOpenAI(
    systemPrompt,
    history,
    message
  );
}

/* =========================================================
   GEMINI STREAMING
========================================================= */

async function streamGemini(
  systemPrompt: string,
  history: HistoryMessage[],
  message: string,
  onDelta: (
    value: string
  ) => void
): Promise<StreamUsage> {
  const apiKey =
    Deno.env.get(
      "GEMINI_API_KEY"
    );

  const model =
    Deno.env.get(
      "GEMINI_MODEL"
    ) ||
    "gemini-3.8-flash";

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured."
    );
  }

  /* =======================================================
     CONTENT
  ======================================================= */

  const contents = [
    ...history.map(
      item => ({
        role:
          item.role ===
          "assistant"
            ? "model"
            : "user",

        parts: [
          {
            text:
              item.content,
          },
        ],
      })
    ),

    {
      role:
        "user",

      parts: [
        {
          text:
            message,
        },
      ],
    },
  ];

  /* =======================================================
     REQUEST
  ======================================================= */

  const response =
    await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",

          "x-goog-api-key":
            apiKey,
        },

        body:
          JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text:
                    systemPrompt,
                },
              ],
            },

            contents,

            generationConfig: {
              maxOutputTokens:
                500,
            },
          }),
      }
    );

  /* =======================================================
     HTTP ERROR
  ======================================================= */

  if (!response.ok) {
    const errorText =
      await response.text();

    console.error(
      "Gemini stream HTTP error:",
      response.status,
      errorText
    );

    throw new Error(
      `Gemini streaming request failed (${response.status}).`
    );
  }

  if (!response.body) {
    throw new Error(
      "Gemini stream body is missing."
    );
  }

  /* =======================================================
     STREAM
  ======================================================= */

  const reader =
    response.body
      .getReader();

  const decoder =
    new TextDecoder();

  let buffer =
    "";

  let inputTokens =
    0;

  let outputTokens =
    0;

  let totalText =
    "";

  let eventCount =
    0;

  /* =======================================================
     PROCESS ONE SSE EVENT
  ======================================================= */

  function processGeminiEvent(
    rawEvent: string
  ) {
    if (
      !rawEvent.trim()
    ) {
      return;
    }

    const lines =
      rawEvent
        .split(/\r?\n/);

    const dataLines =
      lines.filter(
        line =>
          line.startsWith(
            "data:"
          )
      );

    if (
      dataLines.length ===
      0
    ) {
      return;
    }

    const jsonText =
      dataLines
        .map(
          line =>
            line
              .slice(5)
              .trim()
        )
        .join("");

    if (
      !jsonText ||
      jsonText ===
        "[DONE]"
    ) {
      return;
    }

    let chunk: any;

    try {
      chunk =
        JSON.parse(
          jsonText
        );
    } catch (
      parseError
    ) {
      console.log(
        "Gemini SSE parse error:",
        jsonText
      );

      return;
    }

    eventCount +=
      1;

    /* =====================================================
       GEMINI API ERROR INSIDE STREAM
    ===================================================== */

    if (
      chunk?.error
    ) {
      console.error(
        "Gemini stream chunk error:",
        chunk.error
      );

      throw new Error(
        chunk.error
          ?.message ||
          "Gemini stream returned an error."
      );
    }

    /* =====================================================
       TEXT
    ===================================================== */

    const candidates =
      chunk?.candidates ||
      [];

    for (
      const candidate of
      candidates
    ) {
      const parts =
        candidate
          ?.content
          ?.parts ||
        [];

      for (
        const part of parts
      ) {
        /*
         * Gemini may return other part types,
         * such as thought metadata.
         *
         * Only visible text gets streamed.
         */

        if (
          typeof part
            ?.text ===
            "string" &&
          part.text
        ) {
          totalText +=
            part.text;

          onDelta(
            part.text
          );
        }
      }

      /*
       * Helpful debugging if Gemini ends
       * without visible text.
       */

      if (
        candidate
          ?.finishReason
      ) {
        console.log(
          "Gemini finish reason:",
          candidate
            .finishReason
        );
      }
    }

    /* =====================================================
       TOKEN USAGE
    ===================================================== */

    if (
      chunk
        ?.usageMetadata
    ) {
      inputTokens =
        chunk
          .usageMetadata
          .promptTokenCount ||
        inputTokens;

      outputTokens =
        chunk
          .usageMetadata
          .candidatesTokenCount ||
        outputTokens;
    }
  }

  /* =======================================================
     READ CHUNKS
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
          stream:
            true,
        }
      );

    /*
     * IMPORTANT FIX:
     *
     * Handles both:
     *
     * \n\n
     *
     * and:
     *
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
      const event of
      events
    ) {
      processGeminiEvent(
        event
      );
    }
  }

  /* =======================================================
     FLUSH DECODER
  ======================================================= */

  buffer +=
    decoder.decode();

  /*
   * Gemini may leave a final event
   * without another blank line.
   */

  if (
    buffer.trim()
  ) {
    processGeminiEvent(
      buffer
    );
  }

  console.log(
    "Gemini stream completed:",
    {
      events:
        eventCount,

      characters:
        totalText.length,

      inputTokens,

      outputTokens,
    }
  );

  /* =======================================================
     EMPTY RESPONSE
  ======================================================= */

  if (
    !totalText.trim()
  ) {
    throw new Error(
      "Gemini completed the request but returned no visible text."
    );
  }

  return {
    inputTokens,
    outputTokens,
  };
}

function buildVerifiedContextPrompt(
  systemPrompt:
    string,
  contexts:
    VerifiedToolContext[]
) {
  if (
    contexts.length ===
    0
  ) {
    return systemPrompt;
  }

  return `
${systemPrompt}

VERIFIED RICHFIELD CONNECT DATA

The following information was retrieved directly from approved Richfield Connect server tools.

${JSON.stringify(
  contexts,
  null,
  2
)}

CRITICAL LIVE DATA RULES

- Treat the verified data above as authoritative for this response.
- Do not invent additional profile information.
- Do not invent additional opportunities.
- Do not invent additional events.
- If a result is empty, say that no matching data was found.
- Never claim to have database access beyond these tool results.
- Never reveal internal IDs unless absolutely necessary.
- Give the user a natural answer rather than dumping raw JSON.
`;
}

/* =========================================================
   OPENAI STREAMING
========================================================= */

async function streamOpenAI(
  systemPrompt: string,
  history: HistoryMessage[],
  message: string,
  onDelta:
    (
      value: string
    ) => void
): Promise<StreamUsage> {
  const apiKey =
    Deno.env.get(
      "OPENAI_API_KEY"
    );

  const model =
    Deno.env.get(
      "OPENAI_MODEL"
    ) ||
    "gpt-4o-mini";

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured."
    );
  }

  const input = [
    ...history.map(
      item => ({
        role:
          item.role,
        content:
          item.content,
      })
    ),

    {
      role:
        "user",
      content:
        message,
    },
  ];

  const response =
    await fetch(
      "https://api.openai.com/v1/responses",
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${apiKey}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            model,
            instructions:
              systemPrompt,
            input,
            max_output_tokens:
              700,
            stream:
              true,
          }),
      }
    );

  if (!response.ok) {
    const errorText =
      await response.text();

    console.error(
      "OpenAI stream error:",
      errorText
    );

    throw new Error(
      "OpenAI streaming request failed."
    );
  }

  if (!response.body) {
    throw new Error(
      "OpenAI stream body is missing."
    );
  }

  const reader =
    response.body
      .getReader();

  const decoder =
    new TextDecoder();

  let buffer = "";

  let inputTokens = 0;
  let outputTokens = 0;

  while (true) {
    const {
      done,
      value,
    } =
      await reader.read();

    if (done) {
      break;
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
        "\n\n"
      );

    buffer =
      events.pop() ||
      "";

    for (
      const event of events
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

      for (
        const line of
        dataLines
      ) {
        const json =
          line
            .slice(5)
            .trim();

        if (
          !json ||
          json ===
            "[DONE]"
        ) {
          continue;
        }

        let eventData:
          any;

        try {
          eventData =
            JSON.parse(
              json
            );
        } catch {
          continue;
        }

        if (
          eventData
            ?.type ===
          "response.output_text.delta"
        ) {
          const delta =
            eventData
              ?.delta;

          if (
            typeof delta ===
              "string" &&
            delta
          ) {
            onDelta(
              delta
            );
          }
        }

        if (
          eventData
            ?.type ===
          "response.completed"
        ) {
          inputTokens =
            eventData
              ?.response
              ?.usage
              ?.input_tokens ||
            inputTokens;

          outputTokens =
            eventData
              ?.response
              ?.usage
              ?.output_tokens ||
            outputTokens;
        }
      }
    }
  }

  return {
    inputTokens,
    outputTokens,
  };
}

async function streamProvider(
  systemPrompt: string,
  history: HistoryMessage[],
  message: string,
  onDelta:
    (
      value: string
    ) => void
) {
  const provider =
    getAIProvider();

  console.log(
    `Streaming provider: ${provider}`
  );

  if (
    provider ===
    "gemini"
  ) {
    return streamGemini(
      systemPrompt,
      history,
      message,
      onDelta
    );
  }

  return streamOpenAI(
    systemPrompt,
    history,
    message,
    onDelta
  );
}

/* =========================================================
   SAVE TURN + USAGE
========================================================= */

async function saveCompletedTurn(
  adminClient: any,
  {
    conversationId,
    userId,
    userMessage,
    assistantMessage,
    today,
    used,
    usage,
    inputTokens,
    outputTokens,
  }: {
    conversationId: string;
    userId: string;
    userMessage: string;
    assistantMessage: string;
    today: string;
    used: number;
    usage:
      | UsageRow
      | null;
    inputTokens: number;
    outputTokens: number;
  }
) {
  const encryptedUser =
    await encryptText(
      userMessage
    );

  const encryptedAssistant =
    await encryptText(
      assistantMessage
    );

  const turnTime =
    Date.now();

  const userCreatedAt =
    new Date(
      turnTime
    ).toISOString();

  const assistantCreatedAt =
    new Date(
      turnTime + 1
    ).toISOString();

  const {
    error:
      insertError,
  } =
    await adminClient
      .from(
        "ai_messages"
      )
      .insert([
        {
          conversation_id:
            conversationId,

          user_id:
            userId,

          role:
            "user",

          content_ciphertext:
            encryptedUser
              .ciphertext,

          iv:
            encryptedUser.iv,

          created_at:
            userCreatedAt,
        },

        {
          conversation_id:
            conversationId,

          user_id:
            userId,

          role:
            "assistant",

          content_ciphertext:
            encryptedAssistant
              .ciphertext,

          iv:
            encryptedAssistant.iv,

          created_at:
            assistantCreatedAt,
        },
      ]);

  if (insertError) {
    console.error(
      "AI save error:",
      insertError
    );
  }

  await adminClient
    .from(
      "ai_conversations"
    )
    .update({
      updated_at:
        new Date()
          .toISOString(),
    })
    .eq(
      "id",
      conversationId
    )
    .eq(
      "user_id",
      userId
    );

  if (usage) {
    await adminClient
      .from(
        "ai_daily_usage"
      )
      .update({
        request_count:
          used + 1,

        input_tokens:
          (
            usage
              .input_tokens ||
            0
          ) +
          inputTokens,

        output_tokens:
          (
            usage
              .output_tokens ||
            0
          ) +
          outputTokens,
      })
      .eq(
        "user_id",
        userId
      )
      .eq(
        "usage_date",
        today
      );
  } else {
    await adminClient
      .from(
        "ai_daily_usage"
      )
      .insert({
        user_id:
          userId,

        usage_date:
          today,

        request_count:
          1,

        voice_request_count:
          0,

        input_tokens:
          inputTokens,

        output_tokens:
          outputTokens,
      });
  }
}

/* =========================================================
   EDGE FUNCTION
========================================================= */

Deno.serve(
  async request => {
    if (
      request.method ===
      "OPTIONS"
    ) {
      return new Response(
        "ok",
        {
          headers:
            corsHeaders,
        }
      );
    }

    try {
      /* ---------------- ENV ---------------- */

      const supabaseUrl =
        Deno.env.get(
          "SUPABASE_URL"
        );

      const anonKey =
        Deno.env.get(
          "SUPABASE_ANON_KEY"
        );

      const serviceRoleKey =
        Deno.env.get(
          "SUPABASE_SERVICE_ROLE_KEY"
        );

      if (
        !supabaseUrl ||
        !anonKey ||
        !serviceRoleKey
      ) {
        return jsonResponse(
          {
            error:
              "Server configuration error.",
          },
          500
        );
      }

      /* ---------------- AUTH ---------------- */

      const authorization =
        request.headers.get(
          "Authorization"
        );

      if (
        !authorization
      ) {
        return jsonResponse(
          {
            error:
              "Not authenticated.",
          },
          401
        );
      }

      const userClient =
        createClient(
          supabaseUrl,
          anonKey,
          {
            global: {
              headers: {
                Authorization:
                  authorization,
              },
            },
          }
        );

      const adminClient =
        createClient(
          supabaseUrl,
          serviceRoleKey
        );

      const {
        data:
          userData,

        error:
          userError,
      } =
        await userClient
          .auth
          .getUser();

      if (
        userError ||
        !userData.user
      ) {
        return jsonResponse(
          {
            error:
              "Invalid session.",
          },
          401
        );
      }

      const user =
        userData.user;

      /* ---------------- PROFILE ---------------- */

      const {
        data:
          profile,

        error:
          profileError,
      } =
        await adminClient
          .from(
            "profiles"
          )
          .select(`
            id,
            full_name,
            role,
            status
          `)
          .eq(
            "id",
            user.id
          )
          .single();

      if (
        profileError ||
        !profile
      ) {
        return jsonResponse(
          {
            error:
              "Profile not found.",
          },
          404
        );
      }

      if (
        profile.status !==
        "active"
      ) {
        return jsonResponse(
          {
            error:
              "Your account is not active.",
          },
          403
        );
      }

      const role =
        profile.role as UserRole;

      const limit =
        DAILY_LIMITS[
          role
        ];

      if (!limit) {
        return jsonResponse(
          {
            error:
              "Unsupported user role.",
          },
          403
        );
      }

      /* ---------------- BODY ---------------- */

      let body:
        any;

      try {
        body =
          await request.json();
      } catch {
        return jsonResponse(
          {
            error:
              "Invalid request body.",
          },
          400
        );
      }

      const action =
        body?.action ||
        "chat";

      const today =
        getJohannesburgDate();

      /* ---------------- USAGE ---------------- */

      const {
        data:
          usage,
      } =
        await adminClient
          .from(
            "ai_daily_usage"
          )
          .select("*")
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "usage_date",
            today
          )
          .maybeSingle();

      const used =
        usage
          ?.request_count ||
        0;

      /* ===================================================
         BOOTSTRAP
      =================================================== */

      if (
        action ===
        "bootstrap"
      ) {
        const {
          data:
            latestConversation,
        } =
          await adminClient
            .from(
              "ai_conversations"
            )
            .select(
              "id, title, created_at, updated_at"
            )
            .eq(
              "user_id",
              user.id
            )
            .order(
              "updated_at",
              {
                ascending:
                  false,
              }
            )
            .limit(1)
            .maybeSingle();

        let messages:
          any[] = [];

        if (
          latestConversation
        ) {
          const {
            data:
              storedMessages,
          } =
            await adminClient
              .from(
                "ai_messages"
              )
              .select(`
                id,
                role,
                content_ciphertext,
                iv,
                created_at
              `)
              .eq(
                "conversation_id",
                latestConversation.id
              )
              .eq(
                "user_id",
                user.id
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              )
              .order(
                "role",
                {
                  ascending:
                    true,
                }
              )
              .limit(30);

          const ordered =
            (
              storedMessages ||
              []
            ).reverse();

          messages =
            await Promise.all(
              ordered.map(
                async (
                  item:
                    StoredMessage
                ) => ({
                  id:
                    item.id,

                  role:
                    item.role,

                  content:
                    await decryptText(
                      item.content_ciphertext,
                      item.iv
                    ),

                  created_at:
                    item.created_at,
                })
              )
            );
        }

        return jsonResponse(
          {
            role,

            firstName:
              profile
                .full_name
                ?.split(
                  " "
                )[0] ||
              "User",

            conversationId:
              latestConversation
                ?.id ||
              null,

            messages,

            usage: {
              used,
              limit,

              remaining:
                Math.max(
                  limit -
                    used,
                  0
                ),
            },
          }
        );
      }

      /* ===================================================
         CHAT
      =================================================== */

      if (
        action !==
        "chat"
      ) {
        return jsonResponse(
          {
            error:
              "Unknown action.",
          },
          400
        );
      }

      if (
        used >= limit
      ) {
        return jsonResponse(
          {
            error:
              "daily_limit_reached",

            message:
              `You've used today's ${limit} Richfield AI messages. Your allowance resets tomorrow.`,

            usage: {
              used,
              limit,
              remaining:
                0,
            },
          },
          429
        );
      }

      const message =
        String(
          body?.message ||
          ""
        ).trim();

      if (!message) {
        return jsonResponse(
          {
            error:
              "Message is required.",
          },
          400
        );
      }

      if (
        message.length >
        4000
      ) {
        return jsonResponse(
          {
            error:
              "Message is too long.",
          },
          400
        );
      }

      /* ---------------- CONVERSATION ---------------- */

      let conversationId:
        string | null =
        body
          ?.conversationId ||
        null;

      if (
        conversationId
      ) {
        const {
          data:
            existing,
        } =
          await adminClient
            .from(
              "ai_conversations"
            )
            .select("id")
            .eq(
              "id",
              conversationId
            )
            .eq(
              "user_id",
              user.id
            )
            .maybeSingle();

        if (!existing) {
          conversationId =
            null;
        }
      }

      if (
        !conversationId
      ) {
        const {
          data:
            created,

          error:
            createError,
        } =
          await adminClient
            .from(
              "ai_conversations"
            )
            .insert({
              user_id:
                user.id,

              title:
                "Richfield AI",
            })
            .select("id")
            .single();

        if (
          createError ||
          !created
        ) {
          return jsonResponse(
            {
              error:
                "Could not create AI conversation.",
            },
            500
          );
        }

        conversationId =
          created.id;
      }

      if (!conversationId) {
        return jsonResponse(
          {
            error:
              "Could not resolve AI conversation.",
          },
          500
        );
      }

      /* ---------------- HISTORY ---------------- */

      const {
        data:
          previousMessages,
      } =
        await adminClient
          .from(
            "ai_messages"
          )
          .select(`
            role,
            content_ciphertext,
            iv,
            created_at
          `)
          .eq(
            "conversation_id",
            conversationId
          )
          .eq(
            "user_id",
            user.id
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          )
          .limit(20);

      const history:
        HistoryMessage[] =
        await Promise.all(
          (
            previousMessages ||
            []
          )
            .reverse()
            .map(
              async (
                item:
                  StoredMessage
              ) => ({
                role:
                  item.role,

                content:
                  await decryptText(
                    item.content_ciphertext,
                    item.iv
                  ),
              })
            )
        );

      const systemPrompt =
        createSystemPrompt(
          role,
          profile.full_name ||
            "User"
        );

      /* =========================================================
        APPROVED APP TOOLS
      ========================================================= */

      let verifiedContexts:
        VerifiedToolContext[] =
        [];

      if (
        getAIProvider() ===
        "gemini"
      ) {
        try {
          verifiedContexts =
            await getGeminiToolContext(
              adminClient,
              user.id,
              role,
              systemPrompt,
              history,
              message
            );
        } catch (
          toolError
        ) {
          console.error(
            "AI tool context error:",
            toolError
          );

          /*
          * Normal chat should still work
          * if a tool temporarily fails.
          */
          verifiedContexts =
            [];
        }
      }

      const enrichedSystemPrompt =
        buildVerifiedContextPrompt(
          systemPrompt,
          verifiedContexts
        );

      const wantsStreaming =
        body?.stream ===
        true;

      /* ===================================================
         NON STREAM FALLBACK
      =================================================== */

      if (
        !wantsStreaming
      ) {
        let aiResult:
          AIResult;

        try {
          aiResult =
            await generateAIResponse(
              enrichedSystemPrompt,
              history,
              message
            );
        } catch (
          error
        ) {
          console.error(
            "AI error:",
            error
          );

          return jsonResponse(
            {
              error:
                "AI service unavailable.",

              message:
                error instanceof
                  Error
                  ? error.message
                  : "AI request failed.",
            },
            502
          );
        }

        await saveCompletedTurn(
          adminClient,
          {
            conversationId,
            userId:
              user.id,

            userMessage:
              message,

            assistantMessage:
              aiResult.text,

            today,
            used,
            usage,

            inputTokens:
              aiResult
                .inputTokens,

            outputTokens:
              aiResult
                .outputTokens,
          }
        );

        return jsonResponse(
          {
            conversationId,

            message: {
              role:
                "assistant",

              content:
                aiResult.text,
            },

            usage: {
              used:
                used + 1,

              limit,

              remaining:
                Math.max(
                  limit -
                    used -
                    1,
                  0
                ),
            },
          }
        );
      }

      /* ===================================================
         STREAM RESPONSE
      =================================================== */

      const encoder =
        new TextEncoder();

      const {
        readable,
        writable,
      } =
        new TransformStream<
          Uint8Array,
          Uint8Array
        >();

      const writer =
        writable
          .getWriter();

      const runStream =
        async () => {
          let assistantText =
            "";

          try {
            await writer.write(
              encoder.encode(
                sseMessage({
                  type:
                    "start",

                  conversationId,
                })
              )
            );

            const streamUsage =
              await streamProvider(
                enrichedSystemPrompt,
                history,
                message,
                delta => {
                  assistantText +=
                    delta;

                  void writer.write(
                    encoder.encode(
                      sseMessage({
                        type:
                          "delta",

                        delta,
                      })
                    )
                  );
                }
              );

            if (
              !assistantText
                .trim()
            ) {
              throw new Error(
                "AI returned an empty response."
              );
            }

            await saveCompletedTurn(
              adminClient,
              {
                conversationId,
                userId:
                  user.id,

                userMessage:
                  message,

                assistantMessage:
                  assistantText,

                today,
                used,
                usage,

                inputTokens:
                  streamUsage
                    .inputTokens,

                outputTokens:
                  streamUsage
                    .outputTokens,
              }
            );

            await writer.write(
              encoder.encode(
                sseMessage({
                  type:
                    "done",

                  conversationId,

                  usage: {
                    used:
                      used + 1,

                    limit,

                    remaining:
                      Math.max(
                        limit -
                          used -
                          1,
                        0
                      ),
                  },
                })
              )
            );
          } catch (
            error
          ) {
            console.error(
              "Streaming error:",
              error
            );

            try {
              await writer.write(
                encoder.encode(
                  sseMessage({
                    type:
                      "error",

                    message:
                      error instanceof
                        Error
                        ? error.message
                        : "Streaming failed.",
                  })
                )
              );
            } catch {
              // Stream may already be closed.
            }
          } finally {
            try {
              await writer.close();
            } catch {
              // Ignore close errors.
            }
          }
        };

      EdgeRuntime.waitUntil(
        runStream()
      );

      return new Response(
        readable,
        {
          headers:
            streamHeaders,
        }
      );
    } catch (error) {
      console.error(
        "AI function error:",
        error
      );

      return jsonResponse(
        {
          error:
            "Something went wrong while contacting Richfield AI.",
        },
        500
      );
    }
  }
);