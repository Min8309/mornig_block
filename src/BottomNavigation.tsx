import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
export type MainMenu = "오늘" | "내 루틴" | "기록" | "모닝콜" | "설정";
function Icon({ menu, active }: { menu: MainMenu; active: boolean }) {
  const color = active ? "#245C56" : "#7D8782";
  return (
    <Svg
      width={23}
      height={23}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {menu === "오늘" ? (
        <>
          <Path d="M3 10.5 12 3l9 7.5M5.5 9v11h13V9" />
          <Path d="M9.5 20v-7h5v7" />
        </>
      ) : menu === "내 루틴" ? (
        <>
          <Rect x={4} y={4} width={6} height={6} rx={1.6} />
          <Rect x={14} y={4} width={6} height={6} rx={1.6} />
          <Rect x={4} y={14} width={6} height={6} rx={1.6} />
          <Rect x={14} y={14} width={6} height={6} rx={1.6} />
        </>
      ) : menu === "기록" ? (
        <>
          <Path d="M5 4h14v17l-7-4-7 4V4Z" />
          <Path d="m9 10 2 2 4-4" />
        </>
      ) : menu === "설정" ? (
        <>
          <Path
            d="M9 3h6l.7 3 2.6 1.5 2.9-.9 3 5.2-2.2 2.1v3l2.2 2.1-3 5.2-2.9-.9L15.7 22l-.7 3H9l-.7-3-2.6-1.5-2.9.9-3-5.2L2 16.1v-3L-.2 11l3-5.2 2.9.9L8.3 5.2 9 3Z"
            transform="translate(3 0) scale(.75)"
          />
          <Path d="M15.5 12a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" />
        </>
      ) : (
        <>
          <Path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4M4 3 2 5M20 3l2 2" />
        </>
      )}
    </Svg>
  );
}
export default function BottomNavigation({
  active,
  onSelect,
  onCreate,
}: {
  active: MainMenu;
  onSelect: (menu: MainMenu) => void;
  onCreate: () => void;
}) {
  const item = (menu: MainMenu) => (
    <Pressable
      key={menu}
      accessibilityRole="tab"
      accessibilityLabel={menu}
      accessibilityState={{ selected: active === menu }}
      onPress={() => onSelect(menu)}
      style={({ pressed }) => [
        s.item,
        active === menu && s.selected,
        pressed && s.pressed,
      ]}
    >
      <Icon menu={menu} active={active === menu} />
      <Text style={[s.label, active === menu && s.activeLabel]}>{menu}</Text>
    </Pressable>
  );
  return (
    <View style={s.container}>
      <View style={s.bar} accessibilityRole="tablist">
        {item("오늘")}
        {item("내 루틴")}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="새 모닝 루틴 만들기"
          onPress={onCreate}
          style={({ pressed }) => [
            s.create,
            pressed && { transform: [{ scale: 0.94 }] },
          ]}
        >
          <Svg
            width={26}
            height={26}
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth={2}
            strokeLinecap="round"
          >
            <Path d="M12 5v14M5 12h14" />
          </Svg>
        </Pressable>
        {item("기록")}
        {item("모닝콜")}
        {item("설정")}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "#F7F4EE",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 2,
    padding: 6,
    minHeight: 78,
    backgroundColor: "#FFFFFF",
    borderRadius: 27,
    borderWidth: 1,
    borderColor: "#E8ECE5",
    shadowColor: "#245C56",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.09,
    shadowRadius: 18,
    elevation: 6,
  },
  item: {
    flex: 1,
    minHeight: 58,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    gap: 5,
  },
  selected: { backgroundColor: "#E8F0E9" },
  pressed: { opacity: 0.7 },
  label: { fontSize: 10, fontWeight: "500", color: "#7D8782" },
  activeLabel: { color: "#245C56", fontWeight: "800" },
  create: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: "#245C56",
    marginHorizontal: 2,
    marginTop: -22,
    borderWidth: 4,
    borderColor: "#F7F4EE",
    shadowColor: "#245C56",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
});
