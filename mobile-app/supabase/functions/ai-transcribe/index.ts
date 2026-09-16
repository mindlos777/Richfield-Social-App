import {
  createClient,
// @ts-ignore Deno resolves this remote module at runtime.
} from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  env: {
    get(
      name:
        string
    ):
      | string
      | undefined;
  };

  serve(
    handler:
      (
        request:
          Request
      ) =>
        | Response
        | Promise<Response>
  ): void;
};

type UserRole =
  | "student"
  | "alumni"
  | "business"
  | "admin";

type TranscriptionResult = {
  text:
    string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin":
    "*",

  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DAILY_VOICE_LIMITS:
  Record<
    UserRole,
    number
  > = {
  student: 10,
  alumni: 8,
  business: 8,
  admin: 10,
};

function jsonResponse(
  data:
    unknown,
  status =
    200
) {
  return new Response(
    JSON.stringify(
      data
    ),
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

async function transcribeWithOpenAI(
  audio:
    File
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

  const rawText =
    await response.text();

  let data:
    any = null;

  if (rawText) {
    try {
      data =
        JSON.parse(
          rawText
        );
    } catch {
      data = {
        message:
          rawText,
      };
    }
  }

  if (!response.ok) {
    console.error(
      "OpenAI transcription error:",
      response.status,
      data
    );

    throw new Error(
      data?.error
        ?.message ||
        data?.message ||
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

    if (
      request.method !==
      "POST"
    ) {
      return jsonResponse(
        {
          error:
            "Method not allowed.",
        },
        405
      );
    }

    try {
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
        profile.role as
          UserRole;

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
          "Voice usage read error:",
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

      let formData:
        Awaited<
          ReturnType<
            Request["formData"]
          >
        >;

      try {
        formData =
          await request
            .formData();
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
            name:
              string
          ): unknown;
        }).get(
          "audio"
        );

      if (
        !(
          audio instanceof
          File
        )
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
        audio.size ===
        0
      ) {
        return jsonResponse(
          {
            error:
              "Audio file is empty.",
          },
          400
        );
      }

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

      let result:
        TranscriptionResult;

      try {
        result =
          await transcribeWithOpenAI(
            audio
          );
      } catch (
        error
      ) {
        console.error(
          "OpenAI transcription error:",
          error
        );

        return jsonResponse(
          {
            error:
              "transcription_failed",

            message:
              error instanceof
              Error
                ? error.message
                : "Speech transcription failed.",
          },
          502
        );
      }

      if (usage) {
        const {
          error,
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

        if (error) {
          console.error(
            "Voice usage update error:",
            error
          );
        }
      } else {
        const {
          error,
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

        if (error) {
          console.error(
            "Voice usage insert error:",
            error
          );
        }
      }

      return jsonResponse({
        text:
          result.text,

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
      });
    } catch (
      error
    ) {
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