import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { lessons, StudyConfig, studyTopic } from "./language-lessons";
export default function ListeningLesson({ config }: { config: StudyConfig }) {
  const lesson = lessons[config.language][config.level];
  const [showText, setShowText] = useState(false),
    [showMeaning, setShowMeaning] = useState(false),
    [answer, setAnswer] = useState<number | null>(null);
  return (
    <View style={s.card}>
      <Text style={s.eyebrow}>{studyTopic(config)}</Text>
      <Text style={s.title}>{lesson.title}</Text>
      <Text style={s.note}>
        먼저 듣기 → 내용 확인 → 다시 듣기 → 따라 말하기
      </Text>
      <View style={s.row}>
        <Pressable style={s.button} onPress={() => setShowText((v) => !v)}>
          <Text style={s.link}>{showText ? "대본 숨기기" : "대본 보기"}</Text>
        </Pressable>
        <Pressable style={s.button} onPress={() => setShowMeaning((v) => !v)}>
          <Text style={s.link}>
            {showMeaning ? "뜻 숨기기" : "한국어 뜻 보기"}
          </Text>
        </Pressable>
      </View>
      {(showText || showMeaning) &&
        lesson.lines.map((l, i) => (
          <View key={i} style={s.line}>
            {showText && (
              <Text selectable style={s.foreign}>
                {l.text}
              </Text>
            )}
            {showMeaning && <Text style={s.meaning}>{l.meaning}</Text>}
          </View>
        ))}
      <Text style={s.question}>{lesson.question}</Text>
      {lesson.choices.map((choice, i) => (
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ selected: answer === i }}
          key={i}
          onPress={() => setAnswer(i)}
          style={[s.choice, answer === i && s.chosen]}
        >
          <Text style={s.choiceText}>
            {i + 1}. {choice}
          </Text>
        </Pressable>
      ))}
      {answer !== null && (
        <Text accessibilityLiveRegion="polite" style={s.feedback}>
          {answer === lesson.answer ? "맞았어요!" : "다시 들어보세요."}{" "}
          {lesson.explanation}
        </Text>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  card: { padding: 18, borderRadius: 20, backgroundColor: "white", gap: 12 },
  eyebrow: { color: "#686096", fontSize: 12, fontWeight: "700" },
  title: { fontSize: 18, fontWeight: "800", color: "#252D2B" },
  note: { fontSize: 12, lineHeight: 20, color: "#626C67" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  button: { padding: 12, backgroundColor: "#E8E7F3", borderRadius: 12 },
  link: { fontSize: 12, color: "#686096", fontWeight: "600" },
  line: { gap: 6, paddingVertical: 6 },
  foreign: { fontSize: 16, lineHeight: 26, color: "#252D2B" },
  meaning: { fontSize: 13, lineHeight: 22, color: "#626C67" },
  question: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 22,
    color: "#252D2B",
  },
  choice: {
    padding: 14,
    borderWidth: 1,
    borderColor: "#E8E7F3",
    borderRadius: 12,
  },
  chosen: { backgroundColor: "#E8E7F3", borderColor: "#686096" },
  choiceText: { fontSize: 13, lineHeight: 20, color: "#252D2B" },
  feedback: { fontSize: 13, lineHeight: 22, color: "#245C56" },
});
