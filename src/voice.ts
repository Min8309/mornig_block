import {
  loadCloudConfig,
  getCloudConfig,
  speakCloud,
  stopCloud,
} from "./cloud-voice";
import * as NativeSpeech from "expo-speech";
import AsyncStorage from "@react-native-async-storage/async-storage";
export type Voice = NativeSpeech.Voice;
export const getAvailableDeviceVoicesAsync = () =>
  NativeSpeech.getAvailableVoicesAsync();
export const getAvailableVoicesAsync = () =>
  getCloudConfig().enabled
    ? Promise.resolve([] as Voice[])
    : getAvailableDeviceVoicesAsync();
export const stop = () => {
  stopCloud();
  return NativeSpeech.stop();
};
const key = "morningblock.voices.v1";
let choices: Record<string, string> = {};
export async function loadVoiceChoices() {
  await loadCloudConfig();
  const value = await AsyncStorage.getItem(key);
  if (value) {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
      choices = Object.fromEntries(
        Object.entries(parsed).filter(([, v]) => typeof v === "string"),
      ) as Record<string, string>;
  }
  return { ...choices };
}
export async function selectVoice(locale: string, identifier: string) {
  const next = { ...choices, [locale]: identifier };
  await AsyncStorage.setItem(key, JSON.stringify(next));
  choices = next;
}
export function speak(text: string, options: NativeSpeech.SpeechOptions = {}) {
  if (getCloudConfig().enabled) {
    speakCloud(text, options);
    return;
  }
  NativeSpeech.speak(text, {
    ...options,
    voice: choices[options.language || "ko-KR"] || options.voice,
  });
}

export function previewDeviceVoice(
  text: string,
  options: NativeSpeech.SpeechOptions,
) {
  stop();
  NativeSpeech.speak(text, options);
}
