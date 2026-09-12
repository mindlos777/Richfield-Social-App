import * as Speech from "expo-speech";

let speechEnabled = true;

export function setSpeechEnabled(
  value: boolean
) {
  speechEnabled =
    value;

  if (!value) {
    Speech.stop();
  }
}

export function getSpeechEnabled() {
  return speechEnabled;
}

export async function speakText(
  text: string
) {
  if (
    !speechEnabled ||
    !text.trim()
  ) {
    return;
  }

  await Speech.stop();

  Speech.speak(
    text.trim(),
    {
      language:
        "en-ZA",

      rate:
        0.95,

      pitch:
        1,
    }
  );
}

export async function stopSpeaking() {
  await Speech.stop();
}