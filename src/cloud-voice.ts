import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { SpeechOptions } from "expo-speech";
export type CloudVoiceConfig = {
  enabled: boolean;
  endpoint: string;
  token: string;
  voice: "nova" | "onyx";
};
const key = "morningblock.cloud.voice.v1";
let config: CloudVoiceConfig = {
    enabled: false,
    endpoint: "",
    token: "",
    voice: "nova",
  },
  generation = 0;
let active: ReturnType<typeof createAudioPlayer> | null = null;
let removeListener: (() => void) | null = null;
export const getCloudConfig = () => ({ ...config });
export async function loadCloudConfig() {
  const value = await AsyncStorage.getItem(key);
  if (value) {
    const d = JSON.parse(value);
    if (typeof d.endpoint === "string" && ["nova", "onyx"].includes(d.voice)) {
      const token =
        Platform.OS === "web"
          ? globalThis.sessionStorage?.getItem(key + ".token") || ""
          : (await SecureStore.getItemAsync(key + ".token")) || "";
      config = { ...d, token, enabled: d.enabled === true && !!token };
    }
  }
  return getCloudConfig();
}
export async function saveCloudConfig(value: CloudVoiceConfig) {
  if (value.enabled) {
    const url = new URL(value.endpoint);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      value.token.length < 32
    )
      throw Error(
        "HTTPS 서버 주소와 32자 이상의 서버 접속 토큰을 입력해 주세요.",
      );
  }
  if (Platform.OS === "web")
    globalThis.sessionStorage?.setItem(key + ".token", value.token);
  else await SecureStore.setItemAsync(key + ".token", value.token);
  const { token: _, ...publicSettings } = value;
  await AsyncStorage.setItem(key, JSON.stringify(publicSettings));
  config = { ...value };
}
export function stopCloud() {
  generation++;
  removeListener?.();
  removeListener = null;
  if (active) {
    try {
      active.pause();
      active.remove();
    } catch {}
    active = null;
  }
}
export function speakCloud(text: string, options: SpeechOptions) {
  const current = ++generation;
  void (async () => {
    try {
      const response = await fetch(
        config.endpoint.replace(/\/$/, "") + "/tts",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.token}`,
          },
          body: JSON.stringify({
            text,
            voice: config.voice,
            rate: options.rate || 1,
          }),
          signal: AbortSignal.timeout(50000),
        },
      );
      if (!response.ok)
        throw Error(
          "클라우드 음성을 생성하지 못했어요. 서버 설정과 연결을 확인해 주세요.",
        );
      const data = await response.json();
      if (current !== generation) return;
      const url = new URL(data.audioUrl);
      if (
        url.protocol !== "https:" ||
        url.origin !== new URL(config.endpoint).origin
      )
        throw Error("Invalid audio URL");
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: "doNotMix",
      });
      if (current !== generation) return;
      const player = createAudioPlayer({ uri: url.toString() });
      active = player;
      let ended = false;
      const subscription = player.addListener(
        "playbackStatusUpdate",
        (status) => {
          if (current !== generation || ended) return;
          if (status.error) {
            ended = true;
            subscription.remove();
            removeListener = null;
            active = null;
            player.remove();
            options.onError?.(Error("클라우드 음성을 재생하지 못했어요."));
            return;
          }
          if (status.didJustFinish) {
            ended = true;
            subscription.remove();
            removeListener = null;
            active = null;
            player.remove();
            options.onDone?.();
          }
        },
      );
      removeListener = () => subscription.remove();
      player.play();
      options.onStart?.();
    } catch (error) {
      if (current === generation)
        options.onError?.(
          error instanceof Error ? error : Error("Cloud speech failed"),
        );
    }
  })();
}
