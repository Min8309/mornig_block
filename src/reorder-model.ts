export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (
    from < 0 ||
    from >= items.length ||
    to < 0 ||
    to >= items.length ||
    from === to
  )
    return items;
  const result = [...items];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}
export function dropIndex(
  positions: { y: number; height: number }[],
  from: number,
  dy: number,
) {
  const current = positions[from];
  if (!current) return from;
  const center = current.y + current.height / 2 + dy;
  return positions.filter((p, i) => i !== from && p.y + p.height / 2 < center)
    .length;
}
