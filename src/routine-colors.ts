const palette = [
  "#E7EFE5",
  "#E8E6F3",
  "#F3E8D8",
  "#E2EFED",
  "#F4E4E6",
  "#E2EBF4",
  "#EEE9DA",
  "#EDE5F0",
];
export function routineColor(index: number) {
  return (
    palette[index] || `hsl(${((index * 137.508) % 360).toFixed(2)}, 35%, 92%)`
  );
}
export function nextRoutineColor(routines: { color?: string }[]) {
  const used = new Set(
    routines.map((routine, index) => routine.color || routineColor(index)),
  );
  for (let index = 0; index <= routines.length; index++) {
    const candidate = routineColor(index);
    if (!used.has(candidate)) return candidate;
  }
  return routineColor(routines.length + 1);
}
