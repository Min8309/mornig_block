export type RoutineRecord = {
  date: string;
  minutes: number;
  name: string;
  actualSeconds?: number;
};
export function recordDay(date: string | Date) {
  const d = new Date(date);
  if (!Number.isFinite(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function progressMinutes(record: RoutineRecord) {
  return typeof record.actualSeconds === "number"
    ? Math.max(0, record.actualSeconds) / 60
    : Math.max(0, record.minutes);
}
export function recordStats(
  records: RoutineRecord[],
  today = recordDay(new Date()),
) {
  const valid = records.filter((r) => recordDay(r.date));
  const days = new Set(valid.map((r) => recordDay(r.date)));
  const month = today.slice(0, 7);
  let streak = 0;
  const cursor = new Date(`${today}T00:00:00Z`);
  let day = today;
  if (!days.has(day)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    day = cursor.toISOString().slice(0, 10);
  }
  while (days.has(day)) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    day = cursor.toISOString().slice(0, 10);
  }
  return {
    completed: valid.length,
    minutes: valid.reduce((sum, r) => sum + progressMinutes(r), 0),
    activeDays: days.size,
    monthDays: [...days].filter((d) => d.startsWith(month)).length,
    streak,
    legacyCount: valid.filter((r) => typeof r.actualSeconds !== "number")
      .length,
  };
}
export function monthCells(year: number, month: number) {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(),
    days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const result: (string | null)[] = Array(first).fill(null);
  for (let d = 1; d <= days; d++)
    result.push(
      `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    );
  while (result.length % 7) result.push(null);
  return result;
}
export const minutesLabel = (value: number) =>
  value < 1 && value > 0
    ? `${Math.round(value * 60)}초`
    : `${Math.round(value)}분`;
