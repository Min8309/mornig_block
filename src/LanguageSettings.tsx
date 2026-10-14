import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { playListening } from "./language-audio";
import { languages, levels, StudyConfig } from "./language-lessons";
export default function LanguageSettings({
  config,
  onChange,
}: {
  config: StudyConfig;
  onChange: (config: StudyConfig) => void;
}) {
  const [preview, setPreview] = useState(false),
    [error, setError] = useState("");
  const stop = useRef<(() => void) | null>(null);
  useEffect(() => {
    stop.current?.();
    setPreview(false);
    setError("");
    return () => {
      stop.current?.();
    };
  }, [config.language, config.level]);
  const toggle = () => {
    if (preview) {
      stop.current?.();
      setPreview(false);
      return;
    }
    setError("");
    setPreview(true);
    stop.current = playListening(
      config,
      (message) => {
        setError(message);
        setPreview(false);
      },
      () => setPreview(false),
    );
  };
  return (
    <View style={s.root}>
      <Text style={s.label}>학습 언어</Text>
      <View style={s.chips}>
        {languages.map((l) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: config.language === l.id }}
            key={l.id}
            style={[s.chip, config.language === l.id && s.selected]}
            onPress={() => onChange({ ...config, language: l.id })}
          >
            <Text style={[s.text, config.language === l.id && s.selectedText]}>
              {l.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.label}>리스닝 단계</Text>
      <View style={s.chips}>
        {levels.map((l) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: config.level === l.id }}
            key={l.id}
            style={[s.chip, config.level === l.id && s.selected]}
            onPress={() => onChange({ ...config, level: l.id })}
          >
            <Text style={[s.text, config.level === l.id && s.selectedText]}>
              {l.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.note}>
        {levels.find((l) => l.id === config.level)?.description}
      </Text>
      <Pressable accessibilityRole="button" style={s.chip} onPress={toggle}>
        <Text style={s.text}>
          {preview ? "미리 듣기 중지" : "▶ 리스닝 미리 듣기"}
        </Text>
      </Pressable>
      {error && (
        <Text accessibilityLiveRegion="polite" style={s.note}>
          {error}
        </Text>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  root: { gap: 10 },
  label: { fontSize: 12, fontWeight: "700", color: "#626C67" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    minHeight: 44,
    borderRadius: 13,
    backgroundColor: "#E8EEE9",
  },
  selected: { backgroundColor: "#245C56" },
  text: { fontSize: 13, color: "#245C56", fontWeight: "600" },
  selectedText: { color: "white" },
  note: { fontSize: 12, lineHeight: 19, color: "#626C67" },
});
