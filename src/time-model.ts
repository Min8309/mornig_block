export function adjustTime(
  time: string,
  part: "hour" | "minute",
  delta: number,
) {
  const [h, m] = time.split(":").map((v) => parseInt(v, 10) || 0);
  const total =
    (((h * 60 + m + delta * (part === "hour" ? 60 : 1)) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
export function inputTime(time: string, part: "hour" | "minute", text: string) {
  const values = time.split(":");
  const clean = text.replace(/\D/g, "").slice(0, 2);
  values[part === "hour" ? 0 : 1] =
    clean === ""
      ? ""
      : String(Math.min(part === "hour" ? 23 : 59, parseInt(clean, 10)));
  return values.join(":");
}
export function formatTime(time: string) {
  const [h, m] = time.split(":").map((v) => parseInt(v, 10) || 0);
  return `${String(Math.min(23, h)).padStart(2, "0")}:${String(Math.min(59, m)).padStart(2, "0")}`;
}
