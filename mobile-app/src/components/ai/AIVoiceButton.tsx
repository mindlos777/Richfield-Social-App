import React, {
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
} from "react-native";

import {
  Ionicons,
} from "@expo/vector-icons";

import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";

import {
  transcribeAudio,
} from "../../ai/voice/SpeechToText";

const PRIMARY =
  "#0300CF";

type Props = {
  disabled?: boolean;

  onTranscript:
    (
      transcript:
        string
    ) => void;

  onError?:
    (
      message:
        string
    ) => void;
};

export default function AIVoiceButton({
  disabled = false,
  onTranscript,
  onError,
}: Props) {
  const recorder =
    useAudioRecorder(
      RecordingPresets
        .HIGH_QUALITY
    );

  const [
    recording,
    setRecording,
  ] =
    useState(false);

  const [
    transcribing,
    setTranscribing,
  ] =
    useState(false);

  /* =======================================================
     CLEANUP
  ======================================================= */

  useEffect(
    () => {
      return () => {
        /*
         * Reset audio mode when leaving screen.
         */

        void setAudioModeAsync({
          allowsRecording:
            false,

          playsInSilentMode:
            true,
        });
      };
    },
    []
  );

  /* =======================================================
     ERROR
  ======================================================= */

  function reportError(
    error:
      unknown
  ) {
    const message =
      error instanceof
        Error
        ? error.message
        : "Something went wrong with voice input.";

    console.log(
      "Voice error:",
      error
    );

    onError?.(
      message
    );
  }

  /* =======================================================
     START RECORDING
  ======================================================= */

  async function startRecording() {
    if (
      disabled ||
      transcribing
    ) {
      return;
    }

    try {
      const permission =
        await AudioModule
          .requestRecordingPermissionsAsync();

      if (
        !permission.granted
      ) {
        onError?.(
          "Microphone permission is required to use voice input."
        );

        return;
      }

      await setAudioModeAsync({
        allowsRecording:
          true,

        playsInSilentMode:
          true,
      });

      await recorder
        .prepareToRecordAsync();

      recorder.record();

      setRecording(
        true
      );
    } catch (error) {
      setRecording(
        false
      );

      reportError(
        error
      );
    }
  }

  /* =======================================================
     STOP + TRANSCRIBE
  ======================================================= */

  async function stopRecording() {
    if (
      !recording
    ) {
      return;
    }

    try {
      setRecording(
        false
      );

      await recorder.stop();

      await setAudioModeAsync({
        allowsRecording:
          false,

        playsInSilentMode:
          true,
      });

      const uri =
        recorder.uri;

      console.log(
        "Recorded AI audio URI:",
        uri
      );

      if (!uri) {
        throw new Error(
          "The voice recording could not be saved."
        );
      }

      setTranscribing(
        true
      );

      const result =
        await transcribeAudio(
          uri
        );

      const transcript =
        result.text.trim();

      if (!transcript) {
        throw new Error(
          "No speech was detected."
        );
      }

      onTranscript(
        transcript
      );
    } catch (error) {
      reportError(
        error
      );
    } finally {
      setTranscribing(
        false
      );

      try {
        await setAudioModeAsync({
          allowsRecording:
            false,

          playsInSilentMode:
            true,
        });
      } catch {
        // Ignore audio mode reset error.
      }
    }
  }

  /* =======================================================
     PRESS
  ======================================================= */

  function handlePress() {
    if (
      disabled ||
      transcribing
    ) {
      return;
    }

    if (recording) {
      void stopRecording();
    } else {
      void startRecording();
    }
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <Pressable
      onPress={
        handlePress
      }
      disabled={
        disabled ||
        transcribing
      }
      style={[
        styles.button,

        recording &&
          styles.recordingButton,

        (
          disabled ||
          transcribing
        ) &&
          styles.disabledButton,
      ]}
    >
      {transcribing ? (
        <ActivityIndicator
          size="small"
          color={
            PRIMARY
          }
        />
      ) : (
        <Ionicons
          name={
            recording
              ? "stop"
              : "mic-outline"
          }
          size={
            recording
              ? 18
              : 21
          }
          color={
            recording
              ? "#FFFFFF"
              : "#5E6670"
          }
        />
      )}
    </Pressable>
  );
}

const styles =
  StyleSheet.create({
    button: {
      width: 38,
      height: 38,

      borderRadius:
        19,

      alignItems:
        "center",

      justifyContent:
        "center",

      marginBottom:
        4,

      marginRight:
        2,
    },

    recordingButton: {
      backgroundColor:
        "#D92D20",
    },

    disabledButton: {
      opacity:
        0.4,
    },
  });