import {
  fetch as expoFetch,
} from "expo/fetch";

import {
  File,
} from "expo-file-system";

import {
  supabase,
  supabasePublicKey,
  supabaseUrl,
} from "../../lib/supabase";

/* =========================================================
   TYPES
========================================================= */

export type VoiceUsage = {
  used: number;
  limit: number;
  remaining: number;
};

export type TranscriptionResult = {
  text: string;

  voiceUsage: VoiceUsage;
};

/* =========================================================
   CONFIG
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
   SESSION
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
      "You need to be signed in to use voice input."
    );
  }

  return accessToken;
}

/* =========================================================
   TRANSCRIBE
========================================================= */

export async function transcribeAudio(
  uri: string
): Promise<TranscriptionResult> {
  ensureSupabaseConfig();

  if (!uri) {
    throw new Error(
      "No voice recording was found."
    );
  }

  const accessToken =
    await getAccessToken();

  /* =======================================================
     REAL EXPO FILE
  ======================================================= */

  const audioFile =
    new File(uri);

  if (!audioFile.exists) {
    throw new Error(
      "The recorded audio file no longer exists."
    );
  }

  if (
    audioFile.size !==
      null &&
    audioFile.size <= 0
  ) {
    throw new Error(
      "The recorded audio file is empty."
    );
  }

  console.log(
    "Voice file:",
    {
      name:
        audioFile.name,

      type:
        audioFile.type,

      size:
        audioFile.size,

      exists:
        audioFile.exists,
    }
  );

  /* =======================================================
     FORM DATA
  ======================================================= */

  const formData =
    new FormData();

  /*
   * This is the important fix.
   *
   * expo/fetch supports an Expo File object
   * as a FormData part.
   */

  formData.append(
    "audio",
    audioFile
  );

  const functionUrl =
    `${supabaseUrl}/functions/v1/ai-transcribe`;

  console.log(
    "Sending voice recording to AI transcription..."
  );

  try {
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

            Accept:
              "application/json",

            /*
             * Do not manually set Content-Type.
             *
             * expo/fetch will generate:
             *
             * multipart/form-data;
             * boundary=...
             */
          },

          body:
            formData,
        }
      );

    /* =====================================================
       READ RESPONSE
    ===================================================== */

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

    console.log(
      "Voice function response:",
      {
        status:
          response.status,

        ok:
          response.ok,
      }
    );

    /* =====================================================
       SERVER ERROR
    ===================================================== */

    if (!response.ok) {
      console.log(
        "Voice Edge Function error:",
        response.status,
        body
      );

      throw new Error(
        body?.message ||
          body?.error ||
          `Voice transcription failed (${response.status}).`
      );
    }

    if (
      body?.error
    ) {
      throw new Error(
        body?.message ||
          body.error
      );
    }

    /* =====================================================
       TRANSCRIPT
    ===================================================== */

    const text =
      String(
        body?.text ||
        ""
      ).trim();

    if (!text) {
      throw new Error(
        "No speech was detected."
      );
    }

    return {
      text,

      voiceUsage:
        body
          ?.voiceUsage || {
          used: 0,
          limit: 0,
          remaining: 0,
        },
    };
  } catch (
    error: any
  ) {
    console.log(
      "Voice transcription error:",
      error
    );

    if (
      error instanceof
        Error
    ) {
      throw error;
    }

    throw new Error(
      "Could not connect to Richfield AI voice transcription."
    );
  }
}