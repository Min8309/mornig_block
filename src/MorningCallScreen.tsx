import { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { MorningCall, nextCall, weekdays } from "./alarm-model";
import TimeStepper from "./TimeStepper";
import { formatTime } from "./time-model";
import { saveCall, testCall } from "./alarm";
type Props = {
  call: MorningCall;
  routines: { id: string; name: string }[];
  onSave: (call: MorningCall) => void;
  onClose: () => void;
};
export default function MorningCallScreen({
  call,
  routines,
  onSave,
  onClose,
}: Props) {
  const [draft, setDraft] = useState(call),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const next = nextCall(draft);
  const save = async () => {
    setBusy(true);
    setMessage("");
    try {
      const r = routines.find((r) => r.id === draft.routineId);
      if (!r) throw new Error("연결할 루틴을 선택해 주세요.");
      const normalized = { ...draft, time: formatTime(draft.time) };
      const warning = await saveCall(normalized, r.name);
      setDraft(normalized);
      onSave(normalized);
      setMessage(
        warning ||
          (Platform.OS === "web"
            ? "설정을 저장했어요. 실제 알림은 휴대폰 앱에서 설정해 주세요."
            : draft.enabled
              ? "모닝콜을 예약했어요."
              : "모닝콜을 껐어요."),
      );
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "저장하지 못했어요. 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Text style={s.eyebrow}>하루를 여는 첫 신호</Text>
      <Text style={s.title}>아침 모닝콜</Text>
      <Text style={s.description}>
        원하는 시간에 알림을 받고,{"\n"}내 루틴으로 아침을 시작하세요.
      </Text>
      <View style={s.card}>
        <View style={s.row}>
          <View>
            <Text style={s.heading}>모닝콜 사용</Text>
            <Text style={s.small}>
              {draft.enabled
                ? "선택한 요일마다 알려드려요"
                : "필요할 때 켜 주세요"}
            </Text>
          </View>
          <Switch
            accessibilityLabel="모닝콜 사용"
            value={draft.enabled}
            disabled={busy}
            onValueChange={(enabled) => setDraft({ ...draft, enabled })}
            trackColor={{ false: "#D8DED9", true: "#245C56" }}
          />
        </View>
        <Text style={s.label}>기상 시간 · 24시간 형식</Text>
        <TimeStepper
          value={draft.time}
          disabled={busy}
          onChange={(time) => setDraft({ ...draft, time })}
        />
        <Text style={s.small}>현재 기기의 현지 시간 기준</Text>
      </View>
      <View style={s.card}>
        <Text style={s.heading}>반복 요일</Text>
        <View style={s.days}>
          {weekdays.map(({ day, label }) => (
            <Pressable
              key={day}
              disabled={busy}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: draft.days.includes(day) }}
              accessibilityLabel={`${label}요일`}
              style={[s.day, draft.days.includes(day) && s.chosen]}
              onPress={() =>
                setDraft({
                  ...draft,
                  days: draft.days.includes(day)
                    ? draft.days.filter((d) => d !== day)
                    : [...draft.days, day],
                })
              }
            >
              <Text
                style={{
                  color: draft.days.includes(day) ? "white" : "#245C56",
                  fontWeight: "700",
                }}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={s.days}>
          {[
            { label: "평일", days: [2, 3, 4, 5, 6] },
            { label: "매일", days: [1, 2, 3, 4, 5, 6, 7] },
            { label: "주말", days: [1, 7] },
          ].map((x) => (
            <Pressable
              disabled={busy}
              key={x.label}
              style={s.preset}
              onPress={() => setDraft({ ...draft, days: x.days })}
            >
              <Text style={s.eyebrow}>{x.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={s.card}>
        <Text style={s.heading}>연결할 모닝 루틴</Text>
        {routines.map((r) => (
          <Pressable
            disabled={busy}
            key={r.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: draft.routineId === r.id }}
            style={[s.routine, draft.routineId === r.id && s.selectedRoutine]}
            onPress={() => setDraft({ ...draft, routineId: r.id })}
          >
            <Text style={s.heading}>
              {draft.routineId === r.id ? "●" : "○"} {r.name}
            </Text>
          </Pressable>
        ))}
        <View style={s.row}>
          <Text style={s.heading}>알림 소리</Text>
          <Switch
            accessibilityLabel="알림 소리"
            disabled={busy}
            value={draft.sound}
            onValueChange={(sound) => setDraft({ ...draft, sound })}
            trackColor={{ false: "#D8DED9", true: "#245C56" }}
          />
        </View>
        <Text style={s.small}>휴대폰 기본 알림음을 사용해요.</Text>
      </View>
      {next && /^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time) && (
        <View style={s.summary}>
          <Text style={s.eyebrow}>
            {Platform.OS === "web"
              ? "설정 기준 다음 모닝콜"
              : "다음 모닝콜 예정"}
          </Text>
          <Text style={s.heading}>
            {next.toLocaleDateString("ko-KR", {
              month: "long",
              day: "numeric",
              weekday: "short",
            })}{" "}
            · {draft.time}
          </Text>
        </View>
      )}
      <Text style={s.small}>
        {Platform.OS === "web"
          ? "웹에서는 설정만 저장해요. 브라우저를 닫으면 모닝콜이 울리지 않아요."
          : "모닝콜은 예약 알림 방식이에요. 무음·집중 모드·배터리 설정에 따라 소리나 전달 시간이 달라질 수 있어요. 알림을 한 번 누르면 연결한 루틴이 바로 시작돼요."}
      </Text>
      {message && (
        <Text accessibilityLiveRegion="polite" style={s.message}>
          {message}
        </Text>
      )}
      <Pressable
        disabled={busy}
        accessibilityRole="button"
        style={[s.button, busy && { opacity: 0.5 }]}
        onPress={save}
      >
        <Text style={s.buttonText}>
          {busy ? "저장 중…" : "모닝콜 설정 저장"}
        </Text>
      </Pressable>
      <Pressable
        disabled={busy}
        style={s.secondary}
        onPress={async () => {
          setBusy(true);
          try {
            await testCall(draft.sound);
            setMessage("5초 뒤 테스트 알림이 도착해요.");
          } catch (e) {
            setMessage(
              e instanceof Error
                ? e.message
                : "테스트 알림을 예약하지 못했어요.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <Text style={s.eyebrow}>모닝콜 테스트 · 5초 뒤</Text>
      </Pressable>
      <Pressable disabled={busy} style={s.secondary} onPress={onClose}>
        <Text style={s.eyebrow}>오늘 화면으로</Text>
      </Pressable>
    </>
  );
}
const s = StyleSheet.create({
  eyebrow: { color: "#245C56", fontSize: 13, fontWeight: "700" },
  title: { fontSize: 32, fontWeight: "800", color: "#252D2B" },
  description: { fontSize: 16, lineHeight: 25, color: "#626C67" },
  card: { backgroundColor: "white", borderRadius: 22, padding: 20, gap: 16 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  heading: { fontSize: 16, fontWeight: "700", color: "#252D2B" },
  small: { fontSize: 12, lineHeight: 20, color: "#626C67" },
  label: { fontSize: 13, fontWeight: "600", color: "#626C67" },
  days: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  day: {
    flexGrow: 1,
    minWidth: 36,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#EDF3EF",
    justifyContent: "center",
    alignItems: "center",
  },
  chosen: { backgroundColor: "#245C56" },
  preset: { padding: 12, backgroundColor: "#EDF3EF", borderRadius: 10 },
  routine: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E4E3DA",
  },
  selectedRoutine: { borderColor: "#245C56", backgroundColor: "#EDF3EF" },
  summary: {
    padding: 20,
    gap: 8,
    backgroundColor: "#EEE9DF",
    borderRadius: 20,
  },
  button: {
    minHeight: 52,
    padding: 18,
    backgroundColor: "#245C56",
    borderRadius: 16,
    alignItems: "center",
  },
  buttonText: { fontSize: 16, fontWeight: "700", color: "white" },
  secondary: {
    minHeight: 48,
    padding: 15,
    backgroundColor: "#E8EEE9",
    borderRadius: 16,
    alignItems: "center",
  },
  message: {
    fontSize: 14,
    lineHeight: 22,
    color: "#245C56",
    backgroundColor: "#E8EEE9",
    padding: 16,
    borderRadius: 14,
  },
});
