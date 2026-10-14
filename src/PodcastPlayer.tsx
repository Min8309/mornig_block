import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { PodcastEpisode } from "./podcasts";

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
export default function PodcastPlayer({
  episode,
  program,
  minutes,
  autoPlay = false,
  paused = false,
  onTogglePause,
}: {
  episode: PodcastEpisode;
  program: string;
  minutes: number;
  autoPlay?: boolean;
  paused?: boolean;
  onTogglePause?: () => void;
}) {
  const player = useAudioPlayer(
    { uri: episode.audioUrl },
    { updateInterval: 500 },
  );
  const status = useAudioPlayerStatus(player);
  const [storedReady, setStoredReady] = useState(false);
  const [resumeReady, setResumeReady] = useState(false);
  const [modeReady, setModeReady] = useState(false);
  const [message, setMessage] = useState("");
  const position = useRef(0),
    listened = useRef(0),
    resume = useRef(0),
    sought = useRef(false),
    initialized = useRef(false);
  const key = `morningblock.podcast.position:${episode.id}`;
  const persist = () => {
    if (initialized.current)
      void AsyncStorage.setItem(key, String(position.current)).catch(() => {});
  };
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(key)
      .then((value) => {
        if (alive) resume.current = Math.max(0, Number(value) || 0);
      })
      .catch(() => {
        if (alive) setMessage("이어 듣기 위치를 불러오지 못했어요.");
      })
      .finally(() => {
        if (alive) setStoredReady(true);
      });
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    })
      .then(() => {
        if (alive) setModeReady(true);
      })
      .catch(() => {
        if (alive)
          setMessage(
            "오디오 설정에 실패했어요. 재생 버튼으로 다시 시도해 주세요.",
          );
      });
    return () => {
      alive = false;
      persist();
      try {
        player.pause();
        if (Platform.OS !== "web") player.setActiveForLockScreen(false);
      } catch {}
    };
  }, [key]);
  useEffect(() => {
    if (!storedReady || !status.isLoaded || sought.current) return;
    sought.current = true;
    let alive = true;
    const target =
      status.duration && resume.current >= status.duration - 2
        ? 0
        : resume.current;
    void player
      .seekTo(target)
      .then(() => {
        if (alive) {
          position.current = target;
          initialized.current = true;
          setResumeReady(true);
        }
      })
      .catch(() => {
        if (alive) {
          initialized.current = true;
          setResumeReady(true);
          setMessage(
            "처음 위치에서 재생해 주세요. 이어 듣기 위치를 불러오지 못했어요.",
          );
        }
      });
    return () => {
      alive = false;
      if (!initialized.current) sought.current = false;
    };
  }, [storedReady, status.isLoaded]);
  const play = () => {
    setMessage("");
    if (listened.current >= minutes * 60) listened.current = 0;
    try {
      if (Platform.OS !== "web")
        player.setActiveForLockScreen(true, {
          title: episode.title,
          artist: program,
        });
      if (status.duration && status.currentTime >= status.duration - 1) {
        void player
          .seekTo(0)
          .then(() => player.play())
          .catch(() => setMessage("처음부터 재생하지 못했어요."));
      } else player.play();
    } catch {
      setMessage("원본 오디오를 재생하지 못했어요. 다시 시도해 주세요.");
    }
  };
  useEffect(() => {
    if (!autoPlay || !resumeReady || !status.isLoaded || !modeReady) return;
    if (paused) player.pause();
    else play();
  }, [autoPlay, paused, resumeReady, status.isLoaded, modeReady]);
  useEffect(() => {
    if (resumeReady) position.current = status.currentTime;
    if (status.error)
      setMessage("원본 오디오를 재생하지 못했어요. 네트워크를 확인해 주세요.");
    if (status.didJustFinish) setMessage("에피소드를 끝까지 들었어요.");
  }, [status.currentTime, status.error, status.didJustFinish, resumeReady]);
  useEffect(() => {
    let previous = Date.now(),
      saveAt = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      if (player.playing) {
        listened.current += (now - previous) / 1000;
        if (listened.current >= minutes * 60) {
          player.pause();
          setMessage(
            `${minutes}분 듣기를 마쳤어요. 다음에 이어 들을 수 있어요.`,
          );
        }
      }
      previous = now;
      if (now - saveAt >= 5000) {
        saveAt = now;
        persist();
      }
    }, 500);
    return () => clearInterval(timer);
  }, [player, minutes, key]);
  const toggle = () => {
    if (autoPlay && onTogglePause) {
      if (paused) {
        onTogglePause();
        play();
      } else if (status.playing) onTogglePause();
      else play();
    } else if (status.playing) player.pause();
    else play();
  };
  const seek = (delta: number) => {
    void player
      .seekTo(
        Math.max(
          0,
          Math.min(status.duration || Infinity, status.currentTime + delta),
        ),
      )
      .catch(() => setMessage("재생 위치를 이동하지 못했어요."));
  };
  return (
    <View style={s.player}>
      <Text style={s.program}>{program}</Text>
      <Text style={s.title}>{episode.title}</Text>
      <Text style={s.note}>
        원본 오디오 · 설정한 {minutes}분만 듣기 · 이어 듣기 지원
      </Text>
      <Text style={s.position}>
        {clock(status.currentTime)} /{" "}
        {status.duration ? clock(status.duration) : "길이 확인 중"}
      </Text>
      <View style={s.row}>
        <Pressable
          accessibilityRole="button"
          disabled={!resumeReady}
          style={s.secondary}
          onPress={() => seek(-15)}
        >
          <Text style={s.link}>↶ 15초</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            status.playing ? "팟캐스트 일시정지" : "팟캐스트 재생"
          }
          disabled={!status.isLoaded || !resumeReady}
          style={[
            s.primary,
            (!status.isLoaded || !resumeReady) && { opacity: 0.5 },
          ]}
          onPress={toggle}
        >
          <Text style={s.primaryText}>
            {!status.isLoaded || !resumeReady
              ? "불러오는 중"
              : status.playing
                ? "Ⅱ 일시정지"
                : "▶ 재생"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={!resumeReady}
          style={s.secondary}
          onPress={() => seek(15)}
        >
          <Text style={s.link}>15초 ↷</Text>
        </Pressable>
      </View>
      {message && (
        <Text accessibilityLiveRegion="polite" style={s.note}>
          {message}
        </Text>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  player: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: "#E8E7F3",
    gap: 12,
  },
  program: { fontSize: 11, fontWeight: "700", color: "#686096" },
  title: { fontSize: 15, lineHeight: 23, fontWeight: "800", color: "#252D2B" },
  note: { fontSize: 11, lineHeight: 18, color: "#626C67" },
  position: { fontSize: 17, fontWeight: "700", color: "#686096" },
  row: { flexDirection: "row", gap: 8 },
  primary: {
    flex: 1,
    padding: 14,
    minHeight: 48,
    backgroundColor: "#686096",
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "white", fontSize: 12, fontWeight: "700" },
  secondary: {
    padding: 12,
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: "#FFFFFF90",
    justifyContent: "center",
  },
  link: { fontSize: 11, color: "#686096", fontWeight: "700" },
});
