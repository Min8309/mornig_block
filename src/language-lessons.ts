export const languages = [
  { id: "en", label: "영어", locale: "en-US" },
  { id: "ja", label: "일본어", locale: "ja-JP" },
  { id: "zh", label: "중국어", locale: "zh-CN" },
  { id: "es", label: "스페인어", locale: "es-ES" },
] as const;
export const levels = [
  {
    id: "beginner",
    label: "초급",
    description: "짧은 생활 표현 · 천천히 듣기",
  },
  {
    id: "intermediate",
    label: "중급",
    description: "상황 대화 · 핵심 내용 파악",
  },
  { id: "advanced", label: "고급", description: "긴 문장 · 맥락과 의도 이해" },
] as const;
export type StudyLanguage = (typeof languages)[number]["id"];
export type StudyLevel = (typeof levels)[number]["id"];
export type StudyConfig = { language: StudyLanguage; level: StudyLevel };
export type Lesson = {
  title: string;
  lines: { text: string; meaning: string }[];
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
};
const line = (text: string, meaning: string) => ({ text, meaning });
export const lessons: Record<StudyLanguage, Record<StudyLevel, Lesson>> = {
  en: {
    beginner: {
      title: "여유 있게 시작하기",
      lines: [
        line(
          "Good morning. How are you today?",
          "좋은 아침이에요. 오늘 기분이 어때요?",
        ),
        line(
          "I am ready for a new day.",
          "새로운 하루를 시작할 준비가 됐어요.",
        ),
        line("Let us have breakfast together.", "함께 아침을 먹어요."),
      ],
      question: "마지막에 함께 하자고 제안한 것은 무엇인가요?",
      choices: ["아침 식사", "운동", "회의"],
      answer: 0,
      explanation: "have breakfast together는 함께 아침을 먹자는 뜻이에요.",
    },
    intermediate: {
      title: "출근길 일정 조율",
      lines: [
        line(
          "Could we move the meeting to ten thirty?",
          "회의를 10시 30분으로 옮길 수 있을까요?",
        ),
        line(
          "My train is delayed, but I can join online.",
          "기차가 지연됐지만 온라인으로 참석할 수 있어요.",
        ),
        line(
          "That works. I will send you the updated invitation.",
          "좋아요. 수정된 초대장을 보내드릴게요.",
        ),
      ],
      question: "화자가 일정을 바꾸려는 이유는 무엇인가요?",
      choices: ["자료가 없어서", "기차가 지연돼서", "회의가 취소돼서"],
      answer: 1,
      explanation: "My train is delayed가 일정 변경의 이유를 설명해요.",
    },
    advanced: {
      title: "집중하는 아침의 조건",
      lines: [
        line(
          "Although checking messages first thing may feel productive, it can scatter our attention before the day begins.",
          "아침에 바로 메시지를 확인하면 생산적으로 느껴질 수 있지만 하루가 시작되기 전에 주의가 분산될 수 있어요.",
        ),
        line(
          "By setting aside a few quiet minutes, we give ourselves space to decide what deserves our focus.",
          "조용한 시간을 잠깐 확보하면 무엇에 집중할지 결정할 여유가 생겨요.",
        ),
        line(
          "The goal is not to avoid technology altogether, but to use it with intention.",
          "목표는 기술을 완전히 피하는 것이 아니라 의도를 가지고 사용하는 것이에요.",
        ),
      ],
      question: "화자가 강조하는 기술 사용 방식은 무엇인가요?",
      choices: [
        "모든 기술 사용 중단",
        "일어나자마자 메시지 확인",
        "목적을 정해 기술 사용",
      ],
      answer: 2,
      explanation:
        "use it with intention은 목적과 의도를 가지고 사용한다는 뜻이에요.",
    },
  },
  ja: {
    beginner: {
      title: "아침 인사",
      lines: [
        line(
          "おはようございます。よく眠れましたか。",
          "좋은 아침입니다. 잘 주무셨나요?",
        ),
        line("はい、よく眠れました。", "네, 잘 잤어요."),
        line("一緒に朝ごはんを食べましょう。", "함께 아침을 먹어요."),
      ],
      question: "함께 하자고 제안한 것은 무엇인가요?",
      choices: ["산책", "아침 식사", "공부"],
      answer: 1,
      explanation: "朝ごはんを食べましょう는 아침을 먹자는 제안이에요.",
    },
    intermediate: {
      title: "전철 지연 알리기",
      lines: [
        line(
          "電車が遅れているので、少し遅れるかもしれません。",
          "전철이 지연돼서 조금 늦을 수도 있어요.",
        ),
        line(
          "先にオンラインで会議に参加できますか。",
          "먼저 온라인으로 회의에 참석할 수 있나요?",
        ),
        line(
          "はい、駅で静かな場所を探して参加します。",
          "네, 역에서 조용한 곳을 찾아 참석할게요.",
        ),
      ],
      question: "회의에 어떻게 참석할 예정인가요?",
      choices: ["역에서 온라인으로", "다음 날 사무실에서", "참석하지 않음"],
      answer: 0,
      explanation:
        "静かな場所を探して参加します는 조용한 곳을 찾아 참석한다는 의미예요.",
    },
    advanced: {
      title: "작은 습관의 지속",
      lines: [
        line(
          "新しい習慣を続けるには、意志の強さだけに頼らないことが大切です。",
          "새 습관을 지속하려면 의지의 강함에만 의존하지 않는 것이 중요해요.",
        ),
        line(
          "忙しい日でも実行できるように、最初の一歩を小さくしておきましょう。",
          "바쁜 날에도 실천할 수 있도록 첫걸음을 작게 만들어 둡시다.",
        ),
        line(
          "完璧な朝を目指すより、自分に合ったペースを見つけるほうが長続きします。",
          "완벽한 아침을 목표로 삼기보다 자신에게 맞는 속도를 찾는 편이 오래 지속돼요.",
        ),
      ],
      question: "습관을 오래 유지하기 위해 권하는 것은 무엇인가요?",
      choices: [
        "완벽한 계획 고집",
        "작게 시작하고 자기 속도 찾기",
        "의지만으로 버티기",
      ],
      answer: 1,
      explanation: "最初の一歩を小さく, 自分に合ったペース가 핵심이에요.",
    },
  },
  zh: {
    beginner: {
      title: "아침 식사 인사",
      lines: [
        line(
          "早上好！你今天感觉怎么样？",
          "좋은 아침이에요! 오늘 기분이 어때요?",
        ),
        line("我很好，谢谢。", "좋아요, 고마워요."),
        line("我们一起吃早饭吧。", "함께 아침을 먹어요."),
      ],
      question: "마지막 문장은 무엇을 제안하나요?",
      choices: ["회의", "독서", "아침 식사"],
      answer: 2,
      explanation: "一起吃早饭은 함께 아침을 먹는다는 뜻이에요.",
    },
    intermediate: {
      title: "회의 참석 방법",
      lines: [
        line(
          "因为地铁晚点了，我可能会迟到十分钟。",
          "지하철이 지연돼서 10분 정도 늦을 수도 있어요.",
        ),
        line(
          "你可以先在网上参加会议吗？",
          "먼저 온라인으로 회의에 참석할 수 있나요?",
        ),
        line("可以，我现在就打开电脑。", "네, 지금 바로 컴퓨터를 켤게요."),
      ],
      question: "늦는 이유는 무엇인가요?",
      choices: ["지하철 지연", "컴퓨터 고장", "늦잠"],
      answer: 0,
      explanation: "地铁晚点了는 지하철이 지연됐다는 의미예요.",
    },
    advanced: {
      title: "주의를 어디에 둘까",
      lines: [
        line(
          "很多人一醒来就查看手机，以为这样能更快地了解当天的安排。",
          "많은 사람이 눈을 뜨자마자 휴대폰을 확인하면 그날의 일정을 더 빨리 파악할 수 있다고 생각해요.",
        ),
        line(
          "然而，过多的信息可能让我们在开始工作之前就感到疲惫。",
          "하지만 너무 많은 정보는 일을 시작하기 전부터 피로하게 만들 수 있어요.",
        ),
        line(
          "与其追求接收所有消息，不如先决定今天最值得关注的事情。",
          "모든 메시지를 받으려 하기보다 오늘 가장 집중할 가치가 있는 일을 먼저 결정하는 편이 나아요.",
        ),
      ],
      question: "화자가 권하는 아침 행동은 무엇인가요?",
      choices: [
        "모든 메시지 확인",
        "알림을 더 많이 받기",
        "오늘 집중할 일 먼저 결정",
      ],
      answer: 2,
      explanation: "先决定今天最值得关注的事情가 중심 제안이에요.",
    },
  },
  es: {
    beginner: {
      title: "함께 아침 먹기",
      lines: [
        line(
          "Buenos días. ¿Cómo estás hoy?",
          "좋은 아침이에요. 오늘 기분이 어때요?",
        ),
        line("Estoy bien, gracias.", "좋아요, 고마워요."),
        line("Vamos a desayunar juntos.", "함께 아침을 먹어요."),
      ],
      question: "마지막 문장은 무엇을 제안하나요?",
      choices: ["함께 아침 먹기", "버스 타기", "책 사기"],
      answer: 0,
      explanation: "desayunar juntos는 함께 아침을 먹는다는 뜻이에요.",
    },
    intermediate: {
      title: "출근길 일정 변경",
      lines: [
        line(
          "¿Podemos empezar la reunión a las diez y media?",
          "회의를 10시 30분에 시작할 수 있을까요?",
        ),
        line(
          "Mi tren lleva retraso, pero puedo conectarme desde el móvil.",
          "기차가 지연됐지만 휴대폰으로 접속할 수 있어요.",
        ),
        line(
          "Claro. Te envío el enlace ahora mismo.",
          "물론이죠. 지금 바로 링크를 보낼게요.",
        ),
      ],
      question: "화자는 무엇으로 회의에 접속할 수 있나요?",
      choices: ["사무실 컴퓨터", "휴대폰", "접속할 수 없음"],
      answer: 1,
      explanation: "desde el móvil은 휴대폰을 통해서라는 뜻이에요.",
    },
    advanced: {
      title: "유연한 아침 루틴",
      lines: [
        line(
          "Una rutina útil no tiene por qué ser idéntica todos los días; debería adaptarse a nuestras circunstancias.",
          "유용한 루틴이 매일 똑같을 필요는 없으며 우리의 상황에 맞게 조정되어야 해요.",
        ),
        line(
          "Si disponemos de poco tiempo, reducir la duración puede ser más razonable que abandonar el hábito.",
          "시간이 부족하다면 습관을 포기하기보다 시간을 줄이는 편이 더 합리적일 수 있어요.",
        ),
        line(
          "Lo importante es mantener una intención clara y reconocer que la constancia también requiere flexibilidad.",
          "중요한 것은 분명한 의도를 유지하고 꾸준함에도 유연성이 필요하다는 점을 인정하는 것이에요.",
        ),
      ],
      question: "시간이 부족할 때 화자가 권하는 것은 무엇인가요?",
      choices: [
        "습관 완전히 포기",
        "항상 같은 시간 고집",
        "시간을 줄여 습관 유지",
      ],
      answer: 2,
      explanation: "reducir la duración은 시간을 줄여 유지한다는 의미예요.",
    },
  },
};
export function studyConfig(block: {
  language?: StudyLanguage;
  level?: StudyLevel;
  topic?: string;
}): StudyConfig {
  return {
    language: languages.some((x) => x.id === block.language)
      ? block.language!
      : "en",
    level: levels.some((x) => x.id === block.level)
      ? block.level!
      : block.topic?.includes("중급")
        ? "intermediate"
        : block.topic?.includes("고급")
          ? "advanced"
          : "beginner",
  };
}
export function studyTopic(config: StudyConfig) {
  return `${languages.find((x) => x.id === config.language)!.label} · ${levels.find((x) => x.id === config.level)!.label} 리스닝`;
}
