import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { dropIndex, moveItem } from "./reorder-model";
type Item = { id: string; kind: string };
type Props<T extends Item> = {
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (item: T, handle: React.ReactNode) => React.ReactNode;
  onDragState: (active: boolean) => void;
  scrollRef: React.RefObject<ScrollView | null>;
  scrollOffset: React.RefObject<number>;
  onAutoScroll: (delta: number) => number;
};
function Handle({
  label,
  onStart,
  onMove,
  onEnd,
  onCancel,
  onAccessibleMove,
}: {
  label: string;
  onStart: (pageY: number) => void;
  onMove: (dy: number, pageY: number) => void;
  onEnd: () => void;
  onCancel: () => void;
  onAccessibleMove: (delta: number) => void;
}) {
  const callbacks = useRef({ onStart, onMove, onEnd, onCancel });
  callbacks.current = { onStart, onMove, onEnd, onCancel };
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) =>
        callbacks.current.onStart(e.nativeEvent.pageY),
      onPanResponderMove: (_, g) => callbacks.current.onMove(g.dy, g.moveY),
      onPanResponderRelease: () => callbacks.current.onEnd(),
      onPanResponderTerminate: () => callbacks.current.onCancel(),
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;
  return (
    <View
      {...pan.panHandlers}
      accessibilityRole="adjustable"
      accessibilityLabel={`${label} 순서 이동`}
      accessibilityHint="핸들을 잡아 위아래로 끌어 순서를 바꾸세요."
      accessibilityActions={[
        { name: "increment", label: "뒤로 이동" },
        { name: "decrement", label: "앞으로 이동" },
      ]}
      onAccessibilityAction={(e) =>
        onAccessibleMove(e.nativeEvent.actionName === "increment" ? 1 : -1)
      }
      style={[
        s.handle,
        Platform.OS === "web" &&
          ({ cursor: "grab", touchAction: "none" } as any),
      ]}
    >
      <Svg width={16} height={22} viewBox="0 0 16 22">
        {[5, 11, 17].flatMap((y) =>
          [4, 12].map((x) => (
            <Circle key={`${x}-${y}`} cx={x} cy={y} r={1.5} fill="#626C67" />
          )),
        )}
      </Svg>
    </View>
  );
}
function MovingItem({
  active,
  offset,
  drag,
  children,
  onLayout,
}: {
  active: boolean;
  offset: number;
  drag: Animated.Value;
  children: React.ReactNode;
  onLayout: (y: number, height: number) => void;
}) {
  const shift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(shift, {
      toValue: offset,
      damping: 25,
      stiffness: 220,
      mass: 0.7,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [offset]);
  return (
    <Animated.View
      onLayout={(e) =>
        onLayout(e.nativeEvent.layout.y, e.nativeEvent.layout.height)
      }
      style={[
        s.item,
        active && s.lifted,
        {
          transform: [
            { translateY: active ? drag : shift },
            { scale: active ? 1.015 : 1 },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
export default function ReorderableModules<T extends Item>({
  items,
  onChange,
  renderItem,
  onDragState,
  scrollRef,
  scrollOffset,
  onAutoScroll,
}: Props<T>) {
  const [active, setActive] = useState<string | null>(null),
    [target, setTarget] = useState(0);
  const layouts = useRef<Record<string, { y: number; height: number }>>({}),
    drag = useRef(new Animated.Value(0)).current,
    current = useRef<{
      id: string;
      from: number;
      startScroll: number;
      dy: number;
      pageY: number;
      top: number;
      bottom: number;
      positions: { y: number; height: number }[];
    } | null>(null),
    timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const latest = useRef({ items, onChange, onDragState, onAutoScroll });
  latest.current = { items, onChange, onDragState, onAutoScroll };
  const clear = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    current.current = null;
    setActive(null);
    drag.setValue(0);
    latest.current.onDragState(false);
  };
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      latest.current.onDragState(false);
    },
    [],
  );
  const update = () => {
    const c = current.current;
    if (!c) return;
    const dy = c.dy + scrollOffset.current - c.startScroll;
    drag.setValue(dy);
    setTarget(dropIndex(c.positions, c.from, dy));
  };
  const begin = (id: string, pageY: number) => {
    const list = latest.current.items;
    const from = list.findIndex((x) => x.id === id);
    if (from < 0 || list.some((x) => !layouts.current[x.id])) return;
    current.current = {
      id,
      from,
      startScroll: scrollOffset.current,
      dy: 0,
      pageY,
      top: 0,
      bottom: 0,
      positions: list.map((x) => layouts.current[x.id]),
    };
    setActive(id);
    setTarget(from);
    drag.setValue(0);
    latest.current.onDragState(true);
    const viewport = scrollRef.current?.getNativeScrollRef();
    if (Platform.OS === "web" && viewport?.getBoundingClientRect) {
      const bounds = viewport.getBoundingClientRect();
      if (current.current) {
        current.current.top = bounds.top;
        current.current.bottom = bounds.bottom;
      }
    } else
      viewport?.measureInWindow?.(
        (_x: number, y: number, _w: number, h: number) => {
          if (current.current) {
            current.current.top = y;
            current.current.bottom = y + h;
          }
        },
      );
    timer.current = setInterval(() => {
      const c = current.current;
      if (!c || !c.bottom) return;
      const delta =
        c.pageY < c.top + 72 ? -12 : c.pageY > c.bottom - 72 ? 12 : 0;
      if (delta) {
        latest.current.onAutoScroll(delta);
        update();
      }
    }, 32);
  };
  const finish = () => {
    const c = current.current;
    if (!c) return;
    const from = latest.current.items.findIndex((x) => x.id === c.id);
    const to = dropIndex(
      c.positions,
      c.from,
      c.dy + scrollOffset.current - c.startScroll,
    );
    const next = moveItem(latest.current.items, from, to);
    clear();
    latest.current.onChange(next);
  };
  const from = active ? items.findIndex((x) => x.id === active) : -1;
  const step = active ? (layouts.current[active]?.height || 0) + 12 : 0;
  return (
    <View>
      <Text style={s.hint}>⋮⋮ 핸들을 잡아 모듈 순서를 바꿔보세요</Text>
      {items.map((item, i) => {
        const offset =
          active && i !== from
            ? from < target && i > from && i <= target
              ? -step
              : from > target && i >= target && i < from
                ? step
                : 0
            : 0;
        const handle = (
          <Handle
            label={item.kind}
            onStart={(y) => begin(item.id, y)}
            onMove={(dy, pageY) => {
              if (current.current) {
                current.current.dy = dy;
                current.current.pageY = pageY;
                update();
              }
            }}
            onEnd={finish}
            onCancel={clear}
            onAccessibleMove={(delta) =>
              onChange(moveItem(items, i, i + delta))
            }
          />
        );
        return (
          <MovingItem
            key={item.id}
            active={active === item.id}
            offset={offset}
            drag={drag}
            onLayout={(y, height) => {
              layouts.current[item.id] = { y, height };
            }}
          >
            {renderItem(item, handle)}
          </MovingItem>
        );
      })}
    </View>
  );
}
const s = StyleSheet.create({
  hint: { fontSize: 12, lineHeight: 20, color: "#626C67", marginBottom: 14 },
  item: { marginBottom: 12 },
  lifted: {
    zIndex: 20,
    opacity: 0.96,
    shadowColor: "#245C56",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    shadowOpacity: 0.15,
    elevation: 10,
  },
  handle: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#EDF3EF",
    alignItems: "center",
    justifyContent: "center",
  },
});
