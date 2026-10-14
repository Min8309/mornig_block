export type MorningCall = {
  enabled: boolean;
  time: string;
  days: number[];
  routineId: string;
  sound: boolean;
};
export const alarmKey = "morningblock.morning-call.v1";
export const weekdays = [
  { day: 2, label: "월" },
  { day: 3, label: "화" },
  { day: 4, label: "수" },
  { day: 5, label: "목" },
  { day: 6, label: "금" },
  { day: 7, label: "토" },
  { day: 1, label: "일" },
];
export function validateCall(call: MorningCall) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(call.time))
    throw new Error("기상 시간을 HH:MM 형식으로 입력해 주세요.");
  if (call.enabled && !call.days.length)
    throw new Error("반복할 요일을 하나 이상 선택해 주세요.");
  if (
    call.days.some((d) => !Number.isInteger(d) || d < 1 || d > 7) ||
    new Set(call.days).size !== call.days.length
  )
    throw new Error("요일 설정을 확인해 주세요.");
}
export function nextCall(call: MorningCall, now = new Date()): Date | null {
  if (!call.enabled || !call.days.length) return null;
  const [hour, minute] = call.time.split(":").map(Number);
  for (let offset = 0; offset < 8; offset++) {
    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    date.setHours(hour, minute, 0, 0);
    if (call.days.includes(date.getDay() + 1) && date > now) return date;
  }
  return null;
}
