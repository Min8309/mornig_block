import * as Speech from "./voice";
import { languages, lessons, levels, StudyConfig } from "./language-lessons";
type Step = { text?: string; locale?: string; rate?: number; pause?: number };
export function listeningSteps(config: StudyConfig): Step[] {
  const lesson = lessons[config.language][config.level],
    language = languages.find((x) => x.id === config.language)!,
    level = levels.find((x) => x.id === config.level)!;
  const rate =
    config.level === "beginner"
      ? 0.72
      : config.level === "intermediate"
        ? 0.86
        : 1;
  return [
    {
      text: `${language.label} ${level.label} 리스닝을 시작해요. 먼저 대본을 보지 않고 들어보세요.`,
      locale: "ko-KR",
      rate: 0.88,
    },
    ...lesson.lines.map((l) => ({
      text: l.text,
      locale: language.locale,
      rate,
    })),
    { text: lesson.question, locale: "ko-KR", rate: 0.88 },
    { pause: 5000 },
    {
      text: `정답은 ${lesson.choices[lesson.answer]}입니다. ${lesson.explanation}`,
      locale: "ko-KR",
      rate: 0.88,
    },
    { text: "문장의 뜻을 확인해 볼까요?", locale: "ko-KR" },
    ...lesson.lines.map((l) => ({
      text: l.meaning,
      locale: "ko-KR",
      rate: 0.88,
    })),
    { text: "다시 듣고, 잠시 멈추는 동안 따라 말해 보세요.", locale: "ko-KR" },
    ...lesson.lines.flatMap((l) => [
      { text: l.text, locale: language.locale, rate },
      { pause: 4000 },
    ]),
    {
      text: "잘했어요. 남은 시간에는 방금 배운 표현을 천천히 떠올려 보세요.",
      locale: "ko-KR",
      rate: 0.88,
    },
  ];
}
export function playListening(
  config: StudyConfig,
  onError: (message: string) => void,
  onComplete?: () => void,
) {
  let cancelled = false,
    index = 0,
    timer: ReturnType<typeof setTimeout> | null = null;
  const steps = listeningSteps(config);
  let voices: Speech.Voice[] = [];
  const next = () => {
    if (cancelled) return;
    if (index >= steps.length) {
      onComplete?.();
      return;
    }
    const step = steps[index++];
    if (step.pause) {
      timer = setTimeout(next, step.pause);
      return;
    }
    const voice = voices.find((v) =>
      v.language
        .toLowerCase()
        .replace("_", "-")
        .startsWith(step.locale!.split("-")[0]),
    );
    Speech.speak(step.text!, {
      language: step.locale,
      voice: voice?.identifier,
      rate: step.rate ?? 0.88,
      onDone: next,
      onError: () => {
        if (!cancelled)
          onError(
            "음성을 재생하지 못했어요. 기기의 언어 음성 설정을 확인해 주세요.",
          );
      },
    });
  };
  void Speech.getAvailableVoicesAsync()
    .then((list) => {
      if (cancelled) return;
      voices = list;
      const target = languages.find((x) => x.id === config.language)!;
      if (
        list.length &&
        !list.some((v) => v.language.toLowerCase().startsWith(target.id))
      ) {
        onError(
          `${target.label} 음성이 없어요. 기기 설정에서 해당 언어의 음성을 설치해 주세요.`,
        );
        return;
      }
      next();
    })
    .catch(() => {
      if (!cancelled) next();
    });
  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
    Speech.stop();
  };
}
