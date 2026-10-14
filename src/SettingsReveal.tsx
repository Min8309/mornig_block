import React, { useEffect, useRef } from "react";
import {
  AccessibilityInfo,
  Animated,
  Platform,
  StyleSheet,
} from "react-native";
export default function SettingsReveal({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let active = true;
    let animation: Animated.CompositeAnimation | null = null;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!active || reduced) return;
      value.setValue(0);
      animation = Animated.timing(value, {
        toValue: 1,
        duration: 180,
        useNativeDriver: Platform.OS !== "web",
      });
      animation.start();
    });
    return () => {
      active = false;
      animation?.stop();
    };
  }, []);
  return (
    <Animated.View
      style={[
        s.body,
        {
          opacity: value,
          transform: [
            {
              translateY: value.interpolate({
                inputRange: [0, 1],
                outputRange: [-8, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
const s = StyleSheet.create({ body: { gap: 14 } });
