import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { alarmKey, MorningCall, validateCall } from "./alarm-model";
Notifications.setNotificationHandler({
  handleNotification: async (notification) => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: notification.request.content.data?.soundEnabled !== false,
    shouldSetBadge: false,
  }),
});
const owns = (n: Notifications.NotificationRequest) =>
  n.content.data?.kind === "morningblock-call";
async function permission(sound: boolean) {
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync(
      sound ? "morning-call-sound" : "morning-call-silent",
      {
        name: sound ? "모닝콜 · 소리" : "모닝콜 · 무음",
        importance: Notifications.AndroidImportance.HIGH,
        sound: sound ? "default" : null,
        vibrationPattern: sound ? [0, 200, 100, 200] : [0],
      },
    );
  let p = await Notifications.getPermissionsAsync();
  if (!p.granted)
    p = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
  if (!p.granted)
    throw new Error("휴대폰 설정에서 모닝블록 알림을 허용해 주세요.");
}
export async function saveCall(call: MorningCall, routineName: string) {
  validateCall(call);
  const old = (await Notifications.getAllScheduledNotificationsAsync()).filter(
    owns,
  );
  const created: string[] = [];
  try {
    if (call.enabled) {
      await permission(call.sound);
      const [hour, minute] = call.time.split(":").map(Number);
      for (const weekday of call.days)
        created.push(
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "좋은 아침이에요 ☀",
              body: `${routineName} · 알림을 눌러 오늘의 루틴을 바로 시작하세요.`,
              sound: call.sound ? "default" : false,
              data: {
                kind: "morningblock-call",
                routineId: call.routineId,
                soundEnabled: call.sound,
              },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday,
              hour,
              minute,
              channelId: call.sound
                ? "morning-call-sound"
                : "morning-call-silent",
            },
          }),
        );
    }
    await AsyncStorage.setItem(alarmKey, JSON.stringify(call));
    const removed = await Promise.allSettled(
      old.map((n) =>
        Notifications.cancelScheduledNotificationAsync(n.identifier),
      ),
    );
    if (removed.some((result) => result.status === "rejected"))
      return "새 설정은 저장했지만 이전 알림 일부를 해제하지 못했어요. 중복 알림이 남을 수 있으니 설정을 다시 저장해 주세요.";
  } catch (error) {
    await Promise.allSettled(
      created.map((id) => Notifications.cancelScheduledNotificationAsync(id)),
    );
    throw error;
  }
}
export async function testCall(sound: boolean) {
  await permission(sound);
  return Notifications.scheduleNotificationAsync({
    content: {
      title: "모닝블록 테스트 모닝콜",
      body: "알림 소리와 표시를 확인해 주세요.",
      sound: sound ? "default" : false,
      data: { kind: "morningblock-test", soundEnabled: sound },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: sound ? "morning-call-sound" : "morning-call-silent",
    },
  });
}
const handledCalls = new Set<string>();
export function listenForCall(fn: (routineId: string) => void) {
  let alive = true;
  const handle = (response: Notifications.NotificationResponse | null) => {
    if (!alive || !response) return;
    const n = response.notification.request;
    const id = `${n.identifier}:${response.notification.date}`;
    if (
      n.content.data?.kind === "morningblock-call" &&
      typeof n.content.data.routineId === "string" &&
      !handledCalls.has(id)
    ) {
      handledCalls.add(id);
      if (handledCalls.size > 64)
        handledCalls.delete(handledCalls.values().next().value!);
      fn(n.content.data.routineId);
      void Notifications.clearLastNotificationResponseAsync().catch(() => {});
    }
  };
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  void Notifications.getLastNotificationResponseAsync()
    .then(handle)
    .catch(() => {});
  return () => {
    alive = false;
    sub.remove();
  };
}
