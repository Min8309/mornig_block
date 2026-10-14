import {
  getCloudConfig,
  loadCloudConfig,
  saveCloudConfig,
  CloudVoiceConfig,
} from "./cloud-voice";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as Voice from "./voice";
const locales = [
  ["ko-KR", "한국어 안내·뉴스"],
  ["en-US", "영어"],
  ["ja-JP", "일본어"],
  ["zh-CN", "중국어"],
  ["es-ES", "스페인어"],
];
export default function VoiceSettings() {
  const [cloud, setCloud] = useState<CloudVoiceConfig>(getCloudConfig());
  const [voices, setVoices] = useState<Voice.Voice[]>([]),
    [choices, setChoices] = useState<Record<string, string>>({}),
    [locale, setLocale] = useState("ko-KR"),
    [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    void loadCloudConfig()
      .then((c) => {
        if (alive) setCloud(c);
      })
      .catch(() => {});
    Promise.all([Voice.getAvailableVoicesAsync(), Voice.loadVoiceChoices()])
      .then(([v, c]) => {
        if (alive) {
          setVoices(v);
          setChoices(c);
        }
      })
      .catch(() => {
        if (alive) setError("기기의 음성 목록을 불러오지 못했어요.");
      });
    return () => {
      alive = false;
      Voice.stop();
    };
  }, []);
  const choose = async (id: string) => {
    try {
      await Voice.selectVoice(locale, id);
      setChoices((c) => ({ ...c, [locale]: id }));
      setError("");
    } catch {
      setError("음성 설정을 저장하지 못했어요.");
    }
  };
  const sample: Record<string, string> = {
    "ko-KR": "좋은 아침이에요. 오늘도 나만의 속도로 아침을 시작해 보세요.",
    "en-US": "Good morning. Take a moment to begin your day.",
    "ja-JP": "おはようございます。ゆっくり一日を始めましょう。",
    "zh-CN": "早上好。让我们开始美好的一天。",
    "es-ES": "Buenos días. Vamos a empezar el día con calma.",
  };
  const saveCloud = async (enabled: boolean) => {
    try {
      Voice.stop();
      const value = { ...cloud, enabled };
      await saveCloudConfig(value);
      setCloud(value);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "설정을 저장하지 못했어요.");
    }
  };
  return (
    <View style={s.card}>
      <Text style={s.title}>클라우드 자연 음성</Text>
      <Text style={s.note}>
        여성 톤 Nova · 남성 톤 Onyx. 생성된 AI 음성이며, 서버 연결 후 사용할 수
        있어요.
      </Text>
      <View style={s.wrap}>
        {(["nova", "onyx"] as const).map((id) => (
          <Pressable
            key={id}
            style={[s.chip, cloud.voice === id && s.selected]}
            onPress={() => {
              Voice.stop();
              const next = { ...cloud, voice: id };
              setCloud(next);
              if (cloud.enabled)
                void saveCloudConfig(next).catch(() =>
                  setError("음성 저장에 실패했어요."),
                );
            }}
          >
            <Text style={{ color: cloud.voice === id ? "white" : "#245C56" }}>
              {id === "nova" ? "여성 · Nova" : "남성 · Onyx"}
            </Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        accessibilityLabel="음성 서버 HTTPS 주소"
        placeholder="https://your-voice-server.example.com"
        autoCapitalize="none"
        value={cloud.endpoint}
        onChangeText={(endpoint) => setCloud((c) => ({ ...c, endpoint }))}
        style={s.chip}
      />
      <TextInput
        accessibilityLabel="개인 음성 서버 접속 토큰"
        placeholder="서버 접속 토큰 (OpenAI API 키 아님)"
        secureTextEntry
        autoCapitalize="none"
        value={cloud.token}
        onChangeText={(token) => setCloud((c) => ({ ...c, token }))}
        style={s.chip}
      />
      <View style={s.wrap}>
        <Pressable style={s.chip} onPress={() => saveCloud(true)}>
          <Text style={s.name}>클라우드 연결·저장</Text>
        </Pressable>
        <Pressable style={s.chip} onPress={() => saveCloud(false)}>
          <Text style={s.name}>기기 음성 사용</Text>
        </Pressable>
      </View>
      <Pressable
        style={s.chip}
        onPress={() => {
          Voice.stop();
          Voice.speak("좋은 아침이에요. 나만의 속도로 하루를 시작해 보세요.", {
            language: "ko-KR",
            onError: () =>
              setError(
                "음성 생성에 실패했어요. 서버 주소·토큰과 API 키 설정을 확인해 주세요.",
              ),
          });
        }}
      >
        <Text style={s.name}>현재 설정 음성 미리 듣기</Text>
      </Pressable>
      <Text style={s.note}>
        {cloud.enabled
          ? "클라우드 음성 사용 중"
          : "기기 음성 사용 중 · 클라우드 미연결"}
      </Text>
      <Text style={s.title}>아침 목소리 선택</Text>
      <Text style={s.note}>
        기기에 설치된 음성을 미리 듣고 골라요. 남성·여성 구분과 음질은 기기의
        음성 제공자에 따라 달라요. 팟캐스트 원본 음성은 변경되지 않아요.
      </Text>
      <View style={s.wrap}>
        {locales.map(([id, name]) => (
          <Pressable
            key={id}
            onPress={() => {
              Voice.stop();
              setLocale(id);
            }}
            style={[s.chip, locale === id && s.selected]}
          >
            <Text style={{ color: locale === id ? "white" : "#245C56" }}>
              {name}
            </Text>
          </Pressable>
        ))}
      </View>
      {[
        { identifier: "", name: "기기 기본 음성" },
        ...voices.filter((v) =>
          v.language
            .toLowerCase()
            .replace("_", "-")
            .startsWith(locale.split("-")[0]),
        ),
      ].map((v) => (
        <View key={v.identifier} style={s.row}>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{
              selected: (choices[locale] || "") === v.identifier,
            }}
            onPress={() => choose(v.identifier)}
            style={{ flex: 1, paddingVertical: 12 }}
          >
            <Text style={s.name}>
              {(choices[locale] || "") === v.identifier ? "● " : "○ "}
              {v.name}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Voice.stop();
              Voice.previewDeviceVoice(sample[locale], {
                language: locale,
                voice: v.identifier || undefined,
                rate: 0.95,
              });
            }}
            style={s.chip}
          >
            <Text style={s.name}>미리 듣기</Text>
          </Pressable>
        </View>
      ))}
      {error && <Text style={s.note}>{error}</Text>}
      <Pressable onPress={() => Voice.stop()} style={s.chip}>
        <Text style={s.name}>듣기 중지</Text>
      </Pressable>
    </View>
  );
}
const s = StyleSheet.create({
  card: { padding: 20, borderRadius: 24, backgroundColor: "white", gap: 12 },
  title: { fontSize: 20, fontWeight: "700", color: "#245C56" },
  note: { fontSize: 12, lineHeight: 20, color: "#65736D" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { padding: 12, borderRadius: 12, backgroundColor: "#E8EEE9" },
  selected: { backgroundColor: "#245C56" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { color: "#245C56", fontSize: 13 },
});
