const { test } = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const vm = require("node:vm");
function load(file, mocks = {}) {
  const module = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInNewContext(js, {
    module,
    exports: module.exports,
    require: (name) => {
      if (name in mocks) return mocks[name];
      throw Error(name);
    },
    Date,
    Set,
    Promise,
    Error,
    URL,
    AbortController,
    setTimeout,
    clearTimeout,
  });
  return module.exports;
}
const model = load("src/alarm-model.ts");
const call = {
  enabled: true,
  time: "07:00",
  days: [2, 3, 4, 5, 6],
  routineId: "weekday",
  sound: true,
};
test("weekday after Friday alarm advances to Monday", () => {
  const next = model.nextCall(call, new Date(2026, 9, 16, 7, 0));
  assert.equal(next.getDay(), 1);
  assert.equal(next.getDate(), 19);
  assert.equal(next.getHours(), 7);
});
test("Sunday uses Expo weekday 1 and crosses month boundary", () => {
  const next = model.nextCall(
    { ...call, days: [1] },
    new Date(2026, 9, 31, 23, 59),
  );
  assert.equal(next.getMonth(), 10);
  assert.equal(next.getDate(), 1);
  assert.equal(next.getDay(), 0);
});
test("before alarm returns today, disabled returns null", () => {
  const now = new Date(2026, 9, 14, 6, 59);
  assert.equal(model.nextCall(call, now).getDate(), 14);
  assert.equal(model.nextCall({ ...call, enabled: false }, now), null);
});
test("invalid time and empty enabled days are rejected", () => {
  assert.throws(() => model.validateCall({ ...call, time: "24:00" }));
  assert.throws(() => model.validateCall({ ...call, days: [] }));
  assert.throws(() => model.validateCall({ ...call, days: [2, 2] }));
  model.validateCall({ ...call, enabled: false, days: [] });
});
function native({
  granted = true,
  failAt = 0,
  storageFails = false,
  cancelFails = false,
} = {}) {
  const scheduled = [],
    cancelled = [],
    saved = [],
    old = [
      { identifier: "old", content: { data: { kind: "morningblock-call" } } },
      { identifier: "other", content: { data: { kind: "unrelated" } } },
    ];
  let requested = 0;
  const api = {
    setNotificationHandler() {},
    getAllScheduledNotificationsAsync: async () => old,
    setNotificationChannelAsync: async () => {},
    AndroidImportance: { HIGH: 4 },
    getPermissionsAsync: async () => ({ granted }),
    requestPermissionsAsync: async () => {
      requested++;
      return { granted };
    },
    SchedulableTriggerInputTypes: {
      WEEKLY: "weekly",
      TIME_INTERVAL: "timeInterval",
    },
    scheduleNotificationAsync: async (n) => {
      if (failAt && scheduled.length + 1 === failAt)
        throw Error("schedule failed");
      scheduled.push(n);
      return `new-${scheduled.length}`;
    },
    cancelScheduledNotificationAsync: async (id) => {
      if (cancelFails && id === "old") throw Error("cancel failed");
      cancelled.push(id);
    },
  };
  const alarm = load("src/alarm.ts", {
    "react-native": { Platform: { OS: "android" } },
    "@react-native-async-storage/async-storage": {
      setItem: async (k, v) => {
        if (storageFails) throw Error("storage failed");
        saved.push(JSON.parse(v));
      },
    },
    "expo-notifications": api,
    "./alarm-model": model,
  });
  return { alarm, scheduled, cancelled, saved, requested: () => requested };
}
test("schedules chosen weekly days and cancels only owned previous alarms", async () => {
  const x = native();
  await x.alarm.saveCall({ ...call, days: [2, 6] }, "평일 루틴");
  assert.equal(x.scheduled.length, 2);
  assert.equal(x.scheduled[0].trigger.weekday, 2);
  assert.equal(x.scheduled[1].trigger.weekday, 6);
  assert.equal(x.scheduled[0].trigger.hour, 7);
  assert.deepEqual(x.cancelled, ["old"]);
  assert.equal(x.saved.length, 1);
});
test("permission refusal preserves existing alarms and settings", async () => {
  const x = native({ granted: false });
  await assert.rejects(x.alarm.saveCall(call, "루틴"));
  assert.equal(x.scheduled.length, 0);
  assert.equal(x.cancelled.length, 0);
  assert.equal(x.saved.length, 0);
});
test("partial scheduling failure removes new alarms and preserves old", async () => {
  const x = native({ failAt: 2 });
  await assert.rejects(x.alarm.saveCall(call, "루틴"));
  assert.deepEqual(x.cancelled, ["new-1"]);
  assert.equal(x.saved.length, 0);
});
test("turning off cancels owned alarms without requesting permission", async () => {
  const x = native({ granted: false });
  await x.alarm.saveCall({ ...call, enabled: false }, "루틴");
  assert.deepEqual(x.cancelled, ["old"]);
  assert.equal(x.requested(), 0);
  assert.equal(x.saved[0].enabled, false);
});

const dial = load("src/dial-model.ts");
test("dial maps both rotation directions and full revolutions to modules", () => {
  assert.equal(dial.modeIndex(0), 0);
  assert.equal(dial.modeIndex(-72), 1);
  assert.equal(dial.modeIndex(-144), 2);
  assert.equal(dial.modeIndex(-216), 3);
  assert.equal(dial.modeIndex(-360), 0);
  assert.equal(dial.modeIndex(72), 4);
  assert.equal(dial.modeIndex(720), 0);
});
test("dial crossing angle boundary has no full-circle jump", () => {
  assert.equal(dial.shortestDelta(179, -179), 2);
  assert.equal(dial.shortestDelta(-179, 179), -2);
});
test("dial snaps to nearest category and arrows take closest path", () => {
  assert.equal(dial.snapAngle(-80), -72);
  assert.equal(dial.snapAngle(150), 144);
  assert.equal(dial.angleForIndex(-288, 0), -360);
  assert.equal(dial.angleForIndex(0, 4), 72);
});

const reorder = load("src/reorder-model.ts");
test("drag reorder preserves module data and leaves input unchanged", () => {
  const a = [
    { id: "a", minutes: 3 },
    { id: "b", minutes: 5 },
    { id: "c", minutes: 7 },
  ];
  const result = reorder.moveItem(a, 0, 2);
  assert.equal(result.map((x) => x.id).join(","), "b,c,a");
  assert.equal(result[2].minutes, 3);
  assert.equal(a[0].id, "a");
});
test("drag target uses variable card heights and clamps list boundaries", () => {
  const p = [
    { y: 0, height: 210 },
    { y: 222, height: 260 },
    { y: 494, height: 200 },
  ];
  assert.equal(reorder.dropIndex(p, 0, 300), 1);
  assert.equal(reorder.dropIndex(p, 0, 1000), 2);
  assert.equal(reorder.dropIndex(p, 2, -1000), 0);
  assert.equal(reorder.dropIndex(p, 1, 0), 1);
});

const news = load("src/news.ts", {
  "fast-xml-parser": require("fast-xml-parser"),
});
test("RSS parses CDATA, sorts dates, strips HTML, deduplicates links", () => {
  const xml = `<rss><channel><item><title><![CDATA[경제 &amp; 시장]]></title><link>https://www.newsis.com/view/1</link><description><![CDATA[<p>제공된 소개문</p><script>alert(1)</script>]]></description><pubDate>Tue, 13 Oct 2026 00:00:00 GMT</pubDate></item><item><title>세계 뉴스</title><link>https://www.newsis.com/view/2</link><pubDate>Wed, 14 Oct 2026 00:00:00 GMT</pubDate></item><item><title>중복</title><link>https://www.newsis.com/view/1</link></item><item><title>위험 링크</title><link>javascript:alert(1)</link></item></channel></rss>`;
  const feed = news.parseNews(xml, "경제");
  assert.equal(feed.articles.length, 2);
  assert.equal(feed.articles[0].title, "세계 뉴스");
  assert.equal(feed.articles[1].summary, "제공된 소개문");
  assert.equal(feed.articles[1].title, "경제 & 시장");
  assert.equal(feed.source, "뉴시스");
});
test("RSS rejects unsupported feeds and entity declarations", () => {
  assert.throws(() => news.parseNews("<html/>", "정치"));
  assert.throws(() => news.parseNews("<!DOCTYPE rss><rss/>", "정치"));
  assert.equal(news.normalizeCategory("문화"), "생활/문화");
  assert.throws(() => news.normalizeCategory("unknown"));
});
test("short RSS briefing preserves full headlines within budget", () => {
  const feed = {
    source: "뉴시스",
    category: "경제",
    articles: Array.from({ length: 12 }, (_, i) => ({
      title: "기사 제목 " + i,
      summary: "제공된 소개문 ".repeat(30),
    })),
  };
  const text = news.briefing(feed, 1);
  assert.ok(text.includes("기사 제목 0"));
  assert.ok(!text.includes("기사 제목 11"));
  assert.ok(text.includes("공개 RSS"));
});

const study = load("src/language-lessons.ts");
test("four languages have complete beginner/intermediate/advanced lessons", () => {
  assert.equal(study.languages.length, 4);
  assert.equal(study.levels.length, 3);
  for (const language of study.languages)
    for (const level of study.levels) {
      const lesson = study.lessons[language.id][level.id];
      assert.ok(lesson.lines.length >= 3);
      assert.ok(lesson.lines.every((x) => x.text && x.meaning));
      assert.ok(lesson.question);
      assert.ok(lesson.choices[lesson.answer]);
    }
});
test("legacy English settings preserve intermediate difficulty", () => {
  assert.equal(
    study.studyConfig({ topic: "중급 비즈니스" }).level,
    "intermediate",
  );
  assert.equal(study.studyConfig({}).language, "en");
  assert.equal(
    study.studyTopic({ language: "ja", level: "advanced" }),
    "일본어 · 고급 리스닝",
  );
});
test("listening script uses the selected speech locale and shadowing pauses", () => {
  const audio = load("src/language-audio.ts", {
    "./voice": {},
    "./language-lessons": study,
  });
  for (const language of study.languages) {
    const steps = audio.listeningSteps({
      language: language.id,
      level: "beginner",
    });
    assert.ok(steps.some((x) => x.locale === language.locale));
    assert.ok(steps.some((x) => x.pause === 5000));
    assert.ok(steps.some((x) => x.pause === 4000));
  }
});
test("cancelled listening does not start after voice discovery completes", async () => {
  let spoken = 0;
  const audio = load("src/language-audio.ts", {
    "./voice": {
      getAvailableVoicesAsync: async () => [],
      speak: () => spoken++,
      stop: () => {},
    },
    "./language-lessons": study,
  });
  const stop = audio.playListening(
    { language: "es", level: "advanced" },
    () => {},
  );
  stop();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(spoken, 0);
});

const clock = load("src/time-model.ts");
test("time arrows carry minutes and wrap at midnight", () => {
  assert.equal(clock.adjustTime("07:59", "minute", 1), "08:00");
  assert.equal(clock.adjustTime("00:00", "minute", -1), "23:59");
  assert.equal(clock.adjustTime("23:30", "hour", 1), "00:30");
});
test("time inputs accept digits, constrain range and normalize on blur", () => {
  assert.equal(clock.inputTime("07:00", "hour", "99"), "23:00");
  assert.equal(clock.inputTime("07:00", "minute", "x5"), "07:5");
  assert.equal(clock.formatTime("7:5"), "07:05");
  assert.equal(clock.formatTime(":"), "00:00");
});

test("news reader speaks actual feed contents in Korean and reports completion", () => {
  let utterance,
    options,
    completed = 0;
  const reader = load("src/news-audio.ts", {
    "./voice": {
      stop: () => {},
      speak: (text, o) => {
        utterance = text;
        options = o;
      },
    },
    "./news": news,
  });
  reader.readNews(
    {
      source: "뉴시스",
      category: "사회",
      articles: [{ title: "실제 RSS 제목", summary: "RSS 소개문" }],
    },
    5,
    () => completed++,
    () => {},
  );
  assert.ok(utterance.includes("실제 RSS 제목"));
  assert.ok(utterance.includes("RSS 소개문"));
  assert.equal(options.language, "ko-KR");
  options.onDone();
  assert.equal(completed, 1);
});
test("stopped news reader ignores late completion and error callbacks", () => {
  let options,
    events = 0,
    stops = 0;
  const reader = load("src/news-audio.ts", {
    "./voice": {
      stop: () => stops++,
      speak: (_, o) => {
        options = o;
      },
    },
    "./news": news,
  });
  const stop = reader.readNews(
    {
      source: "뉴시스",
      category: "정치",
      articles: [{ title: "제목", summary: "" }],
    },
    3,
    () => events++,
    () => events++,
  );
  stop();
  options.onDone();
  options.onError();
  assert.equal(events, 0);
  assert.equal(stops, 2);
});

const stats = load("src/records-model.ts");
test("record calendar groups ISO timestamps by Korean day and supports leap year", () => {
  assert.equal(stats.recordDay("2026-10-13T15:30:00Z"), "2026-10-14");
  const cells = stats.monthCells(2024, 2);
  assert.ok(cells.includes("2024-02-29"));
  assert.equal(cells.length % 7, 0);
});
test("record totals distinguish actual time and count active days once", () => {
  const records = [
    {
      date: "2026-10-14T01:00:00Z",
      minutes: 10,
      actualSeconds: 120,
      name: "a",
    },
    {
      date: "2026-10-14T02:00:00Z",
      minutes: 10,
      actualSeconds: 180,
      name: "b",
    },
    { date: "2026-10-13T01:00:00Z", minutes: 5, name: "legacy" },
  ];
  const summary = stats.recordStats(records, "2026-10-14");
  assert.equal(summary.completed, 3);
  assert.equal(summary.minutes, 10);
  assert.equal(summary.activeDays, 2);
  assert.equal(summary.streak, 2);
  assert.equal(summary.legacyCount, 1);
});
test("empty records show zero and streak can continue from yesterday", () => {
  assert.equal(stats.recordStats([], "2026-10-14").completed, 0);
  assert.equal(
    stats.recordStats(
      [{ date: "2026-10-13T01:00:00Z", minutes: 3, name: "a" }],
      "2026-10-14",
    ).streak,
    1,
  );
});

const podcast = load("src/podcasts.ts", {
  "react-native": { Platform: { OS: "ios" } },
  "fast-xml-parser": require("fast-xml-parser"),
  "./news": news,
  "./data/luke-snapshot.json": {
    sourceUrl: "https://teacherluke.co.uk/feed/",
    episodes: [],
  },
});
test("podcast parser reads audio enclosures and preserves original duration", () => {
  const feed = podcast.parsePodcast(
    '<rss><channel><title>My show</title><item><title>Episode</title><enclosure url="https://example.com/a.mp3" type="audio/mpeg"/><itunes:duration>01:02:03</itunes:duration></item><item><title>Not audio</title><enclosure url="https://example.com/a.jpg" type="image/jpeg"/></item></channel></rss>',
    "https://example.com/rss",
  );
  assert.equal(feed.episodes.length, 1);
  assert.equal(feed.episodes[0].duration, 3723);
});
test("podcast RSS registration rejects invalid URLs, private addresses and nonaudio feeds", () => {
  assert.throws(() => podcast.rssUrl("file:///etc/passwd"));
  assert.throws(() => podcast.rssUrl("https://localhost/feed"));
  assert.throws(() => podcast.rssUrl("https://user:pass@example.com/feed"));
  assert.throws(() =>
    podcast.parsePodcast(
      "<rss><channel><title>Blog</title></channel></rss>",
      "https://example.com/rss",
    ),
  );
  assert.equal(
    podcast.rssUrl(" https://example.com/feed#x "),
    "https://example.com/feed",
  );
});
test("BBC audio upgrades both HTTPS transport and redirect protocol", () => {
  const url = podcast.podcastAudioUrl(
    "http://open.live.bbc.co.uk/a/proto/http/file.mp3",
  );
  assert.equal(url, "https://open.live.bbc.co.uk/a/proto/https/file.mp3");
});

test("storage failure rolls back new notifications and preserves old alarms", async () => {
  const x = native({ storageFails: true });
  await assert.rejects(x.alarm.saveCall({ ...call, days: [2] }, "아침"));
  assert.deepEqual(x.cancelled, ["new-1"]);
  assert.equal(x.saved.length, 0);
});
test("dial midpoint snapping agrees with selected mode", () => {
  for (const angle of [-396, -36, 36, 396])
    assert.equal(dial.modeIndex(dial.snapAngle(angle)), dial.modeIndex(angle));
});

test("notification tap starts linked routine once, while next weekly occurrence works", async () => {
  let listener;
  let initial = null;
  const fired = [];
  const alarm = load("src/alarm.ts", {
    "react-native": { Platform: { OS: "ios" } },
    "@react-native-async-storage/async-storage": {},
    "./alarm-model": model,
    "expo-notifications": {
      setNotificationHandler() {},
      addNotificationResponseReceivedListener(fn) {
        listener = fn;
        return { remove() {} };
      },
      getLastNotificationResponseAsync: async () => initial,
      clearLastNotificationResponseAsync: async () => {
        initial = null;
      },
    },
  });
  const response = (date) => ({
    notification: {
      date,
      request: {
        identifier: "weekly",
        content: {
          data: { kind: "morningblock-call", routineId: "saved-routine" },
        },
      },
    },
  });
  initial = response(100);
  let cleanup = alarm.listenForCall((id) => fired.push(id));
  await new Promise((resolve) => setTimeout(resolve, 0));
  listener(response(100));
  cleanup();
  cleanup = alarm.listenForCall((id) => fired.push(id));
  listener(response(100));
  listener(response(200));
  cleanup();
  assert.deepEqual(fired, ["saved-routine", "saved-routine"]);
});
test("saved voice applies to narration and foreign-language default selection", async () => {
  const calls = [];
  let saved;
  const api = load("src/voice.ts", {
    "expo-speech": {
      speak: (text, options) => calls.push(options),
      stop: () => {},
      getAvailableVoicesAsync: async () => [],
    },
    "@react-native-async-storage/async-storage": {
      getItem: async () => null,
      setItem: async (k, v) => {
        saved = v;
      },
    },
    "./cloud-voice": {
      loadCloudConfig: async () => {},
      getCloudConfig: () => ({ enabled: false }),
      stopCloud() {},
      speakCloud() {},
    },
  });
  await api.selectVoice("en-US", "chosen");
  api.speak("Good morning", { language: "en-US", voice: "first-available" });
  assert.equal(calls[0].voice, "chosen");
  api.previewDeviceVoice("Sample", { language: "en-US", voice: "candidate" });
  assert.equal(calls[1].voice, "candidate");
  assert.equal(JSON.parse(saved)["en-US"], "chosen");
});

test("old notification cancellation failure preserves new schedule and reports a warning", async () => {
  const x = native({ cancelFails: true });
  const warning = await x.alarm.saveCall({ ...call, days: [2] }, "아침");
  assert.ok(warning);
  assert.equal(x.scheduled.length, 1);
  assert.equal(x.saved.length, 1);
  assert.ok(!x.cancelled.includes("new-1"));
});

test("stored records discard malformed entries and preserve legacy and actual progress", () => {
  const records = load("src/records-model.ts");
  const legacy = { date: "2026-10-14T00:00:00Z", name: "아침", minutes: 15 };
  const current = { ...legacy, actualSeconds: 30 };
  assert.equal(records.loadRecords({}).length, 0);
  assert.equal(records.loadRecords(null).length, 0);
  const restored = records.loadRecords([
    null,
    {},
    { ...legacy, date: "invalid" },
    { ...legacy, minutes: "15" },
    { ...legacy, actualSeconds: -1 },
    legacy,
    current,
  ]);
  assert.equal(restored.length, 2);
  assert.equal(restored[0], legacy);
  assert.equal(restored[1], current);
  assert.equal(records.recordStats(restored, "2026-10-14").minutes, 15.5);
});

test("device voice discovery remains available when cloud speech is enabled", async () => {
  const voices = [{ identifier: "device-ko", language: "ko-KR", name: "한국어" }];
  const api = load("src/voice.ts", {
    "expo-speech": { getAvailableVoicesAsync: async () => voices },
    "@react-native-async-storage/async-storage": {},
    "./cloud-voice": { getCloudConfig: () => ({ enabled: true }) },
  });
  assert.equal((await api.getAvailableVoicesAsync()).length, 0);
  assert.equal(await api.getAvailableDeviceVoicesAsync(), voices);
});
