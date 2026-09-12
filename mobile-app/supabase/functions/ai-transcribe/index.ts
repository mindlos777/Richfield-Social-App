// @ts-expect-error Supabase Edge Functions resolve URL imports at runtime.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",

  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

type TranscriptionResult = {
  text: string;
};

/* =========================================================
   VOICE LIMITS
========================================================= */

const DAILY_VOICE_LIMITS: Record<
  UserRole,
  number
> = {
  student: 10,
  alumni: 8,
  business: 8,
  admin: 10,
};

/* =========================================================
   JSON RESPONSE
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

/* =========================================================
   JOHANNESBURG DATE
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
      part =>
        part.type ===
        "year"
    )?.value;

  const month =
    parts.find(
      part =>
        part.type ===
        "month"
    )?.value;

  const day =
    parts.find(
      part =>
        part.type ===
        "day"
    )?.value;

  return `${year}-${month}-${day}`;
}

/* =========================================================
   ARRAY BUFFER -> BASE64
========================================================= */

function bytesToBase64(
  bytes: Uint8Array
) {
  let binary = "";

  const chunkSize =
    0x8000;

  for (
    let i = 0;
    i < bytes.length;
    i += chunkSize
  ) {
    const chunk =
      bytes.subarray(
        i,
        Math.min(
          i + chunkSize,
          bytes.length
        )
      );

    binary +=
      String.fromCharCode(
        ...chunk
      );
  }

  return btoa(binary);
}

/* =========================================================
   GEMINI TRANSCRIPTION
========================================================= */

async function transcribeWithGemini(
  audio: File
): Promise<TranscriptionResult> {
  const apiKey =
    Deno.env.get(
      "GEMINI_API_KEY"
    );

  const model =
    Deno.env.get(
      "GEMINI_TRANSCRIBE_MODEL"
    ) ||
    "gemini-3.8-flash";

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured."
    );
  }

  const arrayBuffer =
    await audio.arrayBuffer();

  const bytes =
    new Uint8Array(
      arrayBuffer
    );

  const base64 =
    bytesToBase64(
      bytes
    );

  const mimeType =
    audio.type ||
    "audio/mp4";

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
            contents: [
              {
                role:
                  "user",

                parts: [
                  {
                    text:
                      `Transcribe this audio accurately.

Return only the spoken words.

Do not summarize.
Do not answer the speaker.
Do not explain anything.
Do not add quotation marks.
Preserve the language spoken by the user.
If the audio contains no understandable speech, return an empty response.`,
                  },

                  {
                    inlineData: {
                      mimeType,

                      data:
                        base64,
                    },
                  },
                ],
              },
            ],

            generationConfig: {
              temperature:
                0,

              maxOutputTokens:
                1000,
            },
          }),
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    console.error(
      "Gemini transcription error:",
      data
    );

    throw new Error(
      data?.error
        ?.message ||
        "Gemini transcription failed."
    );
  }

  const parts =
    data
      ?.candidates?.[0]
      ?.content
      ?.parts ||
    [];

  const text =
    parts
      .map(
        (part: any) =>
          typeof part?.text ===
          "string"
            ? part.text
            : ""
      )
      .join("")
      .trim();

  if (!text) {
    throw new Error(
      "No speech was detected."
    );
  }

  return {
    text,
  };
}

/* =========================================================
   OPENAI TRANSCRIPTION
========================================================= */

async function transcribeWithOpenAI(
  audio: File
): Promise<TranscriptionResult> {
  const apiKey =
    Deno.env.get(
      "OPENAI_API_KEY"
    );

  const model =
    Deno.env.get(
      "OPENAI_TRANSCRIBE_MODEL"
    ) ||
    "gpt-4o-mini-transcribe";

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured."
    );
  }

  const formData =
    new FormData();

  formData.append(
    "file",
    audio,
    audio.name ||
      "voice.m4a"
  );

  formData.append(
    "model",
    model
  );

  const response =
    await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${apiKey}`,
        },

        body:
          formData,
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    console.error(
      "OpenAI transcription error:",
      data
    );

    throw new Error(
      data?.error
        ?.message ||
        "OpenAI transcription failed."
    );
  }

  const text =
    String(
      data?.text ||
      ""
    ).trim();

  if (!text) {
    throw new Error(
      "No speech was detected."
    );
  }

  return {
    text,
  };
}

/* =========================================================
   PROVIDER SWITCH
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

async function transcribeAudio(
  audio: File
): Promise<TranscriptionResult> {
  const provider =
    getAIProvider();

  console.log(
    `Richfield voice provider: ${provider}`
  );

  if (
    provider ===
    "gemini"
  ) {
    return transcribeWithGemini(
      audio
    );
  }

  return transcribeWithOpenAI(
    audio
  );
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
      /* ===================================================
         ENVIRONMENT
      =================================================== */

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

      /* ===================================================
         AUTHORIZATION
      =================================================== */

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

      /* ===================================================
         AUTH USER
      =================================================== */

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
        console.error(
          "Auth error:",
          userError
        );

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

      /* ===================================================
         PROFILE
      =================================================== */

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
        console.error(
          "Profile error:",
          profileError
        );

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

      const voiceLimit =
        DAILY_VOICE_LIMITS[
          role
        ];

      if (!voiceLimit) {
        return jsonResponse(
          {
            error:
              "Unsupported user role.",
          },
          403
        );
      }

      /* ===================================================
         DAILY USAGE
      =================================================== */

      const today =
        getJohannesburgDate();

      const {
        data:
          usage,

        error:
          usageError,
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

      if (
        usageError
      ) {
        console.error(
          "Usage error:",
          usageError
        );
      }

      const voiceUsed =
        usage
          ?.voice_request_count ||
        0;

      if (
        voiceUsed >=
        voiceLimit
      ) {
        return jsonResponse(
          {
            error:
              "voice_limit_reached",

            message:
              `You've used today's ${voiceLimit} Richfield AI voice messages.`,

            voiceUsage: {
              used:
                voiceUsed,

              limit:
                voiceLimit,

              remaining:
                0,
            },
          },
          429
        );
      }

      /* ===================================================
         AUDIO FILE
      =================================================== */

      let formData:
        Awaited<
          ReturnType<
            Request["formData"]
          >
        >;

      try {
        formData =
          await request.formData();
      } catch {
        return jsonResponse(
          {
            error:
              "Invalid audio request.",
          },
          400
        );
      }

      const audio =
        (formData as unknown as {
          get(
            name: string
          ): FormDataEntryValue | null;
        }).get(
          "audio"
        );

      if (
        !(audio instanceof File)
      ) {
        return jsonResponse(
          {
            error:
              "Audio file is required.",
          },
          400
        );
      }

      if (
        audio.size === 0
      ) {
        return jsonResponse(
          {
            error:
              "Audio file is empty.",
          },
          400
        );
      }

      /*
       * We intentionally keep voice clips small.
       *
       * Gemini inline audio has a total
       * request-size limit, so this also
       * protects the function from giant
       * uploads.
       */

      const maxAudioSize =
        10 *
        1024 *
        1024;

      if (
        audio.size >
        maxAudioSize
      ) {
        return jsonResponse(
          {
            error:
              "Recording is too large. Please record a shorter voice message.",
          },
          413
        );
      }

      /* ===================================================
         TRANSCRIBE
      =================================================== */

      let result:
        TranscriptionResult;

      try {
        result =
          await transcribeAudio(
            audio
          );
      } catch (
        transcriptionError
      ) {
        console.error(
          "Transcription provider error:",
          transcriptionError
        );

        const message =
          transcriptionError
            instanceof Error
            ? transcriptionError.message
            : "Speech transcription failed.";

        return jsonResponse(
          {
            error:
              "transcription_failed",

            message,
          },
          502
        );
      }

      const transcript =
        result.text.trim();

      if (
        !transcript
      ) {
        return jsonResponse(
          {
            error:
              "No speech was detected.",
          },
          422
        );
      }

      /* ===================================================
         UPDATE VOICE USAGE
      =================================================== */

      if (usage) {
        const {
          error:
            usageUpdateError,
        } =
          await adminClient
            .from(
              "ai_daily_usage"
            )
            .update({
              voice_request_count:
                voiceUsed +
                1,
            })
            .eq(
              "user_id",
              user.id
            )
            .eq(
              "usage_date",
              today
            );

        if (
          usageUpdateError
        ) {
          console.error(
            "Voice usage update error:",
            usageUpdateError
          );
        }
      } else {
        const {
          error:
            usageInsertError,
        } =
          await adminClient
            .from(
              "ai_daily_usage"
            )
            .insert({
              user_id:
                user.id,

              usage_date:
                today,

              request_count:
                0,

              voice_request_count:
                1,

              input_tokens:
                0,

              output_tokens:
                0,
            });

        if (
          usageInsertError
        ) {
          console.error(
            "Voice usage insert error:",
            usageInsertError
          );
        }
      }

      /* ===================================================
         RESPONSE
      =================================================== */

      return jsonResponse(
        {
          text:
            transcript,

          voiceUsage: {
            used:
              voiceUsed +
              1,

            limit:
              voiceLimit,

            remaining:
              Math.max(
                voiceLimit -
                  voiceUsed -
                  1,
                0
              ),
          },
        }
      );
    } catch (error) {
      console.error(
        "AI transcription function error:",
        error
      );

      return jsonResponse(
        {
          error:
            "Something went wrong while transcribing your voice.",
        },
        500
      );
    }
  }
);