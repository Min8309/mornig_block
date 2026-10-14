export const dialModes = [
  "스트레칭",
  "뉴스",
  "영어",
  "명상",
  "팟캐스트",
] as const;
export type DialMode = (typeof dialModes)[number];
export const dialStep = 360 / dialModes.length;
export const modeIndex = (angle: number) =>
  ((Math.round(-angle / dialStep) % dialModes.length) + dialModes.length) %
  dialModes.length;
export const shortestDelta = (from: number, to: number) =>
  ((to - from + 540) % 360) - 180;
export const snapAngle = (angle: number) =>
  -Math.round(-angle / dialStep) * dialStep;
export function angleForIndex(angle: number, index: number) {
  const target = -index * dialStep;
  return target + Math.round((angle - target) / 360) * 360;
}
