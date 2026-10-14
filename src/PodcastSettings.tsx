import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  loadPodcast,
  PodcastEpisode,
  PodcastFeed,
  PodcastSource,
  rssUrl,
} from "./podcasts";
import PodcastPlayer from "./PodcastPlayer";
export type PodcastSelection = {
  podcastId?: string;
  episodeId?: string;
  episode?: PodcastEpisode;
};
export default function PodcastSettings({
  sources,
  selection,
  minutes,
  onSelect,
  onSourcesChange,
  autoPlay = false,
  paused = false,
  libraryOnly = false,
  onTogglePause,
  startAudio = true,
}: {
  sources: PodcastSource[];
  selection: PodcastSelection;
  minutes: number;
  onSelect: (value: PodcastSelection, topic: string) => void;
  onSourcesChange: (sources: PodcastSource[]) => void;
  autoPlay?: boolean;
  startAudio?: boolean;
  paused?: boolean;
  libraryOnly?: boolean;
  onTogglePause?: () => void;
}) {
  const [libraryChoice, setLibraryChoice] = useState(
    selection.podcastId || sources[0]?.id,
  );
  const source =
    sources.find(
      (s) => s.id === (libraryOnly ? libraryChoice : selection.podcastId),
    ) || sources[0];
  const [feed, setFeed] = useState<PodcastFeed | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [input, setInput] = useState(""),
    [adding, setAdding] = useState(false),
    [manage, setManage] = useState(libraryOnly);
  const [refresh, setRefresh] = useState(0);
  const [episodesOpen, setEpisodesOpen] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setEpisodesOpen(false);
    setFeed(null);
    setError("");
    if (!source) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadPodcast(source.url, controller.signal, refresh > 0)
      .then((value) => {
        if (current) setFeed(value);
      })
      .catch((e) => {
        if (current) setError(e.message);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [source?.url, refresh]);
  const episode =
    feed?.episodes.find((e) => e.id === selection.episodeId) ||
    (selection.podcastId === source?.id ? selection.episode : undefined) ||
    feed?.episodes[0];
  const add = async () => {
    setAdding(true);
    setError("");
    try {
      const url = rssUrl(input);
      if (sources.some((s) => s.url === url))
        throw new Error("이미 등록한 RSS예요.");
      const result = await loadPodcast(url);
      if (!alive.current) return;
      const newSource = {
        id: `custom-${Date.now()}`,
        name: result.name,
        url,
        custom: true,
      };
      onSourcesChange([...sources, newSource]);
      setLibraryChoice(newSource.id);
      onSelect(
        { podcastId: newSource.id, episodeId: undefined, episode: undefined },
        result.name,
      );
      setInput("");
      setFeed(result);
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "등록하지 못했어요.");
    } finally {
      if (alive.current) setAdding(false);
    }
  };
  return (
    <View style={styles.root}>
      {!autoPlay && (
        <>
          <Text style={styles.label}>내 팟캐스트 채널</Text>
          {sources.map((s) => (
            <View key={s.id} style={styles.sourceRow}>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: source?.id === s.id }}
                style={[styles.source, source?.id === s.id && styles.chosen]}
                onPress={() => {
                  setLibraryChoice(s.id);
                  onSelect(
                    {
                      podcastId: s.id,
                      episodeId: undefined,
                      episode: undefined,
                    },
                    s.name,
                  );
                }}
              >
                <Text
                  style={[
                    styles.sourceText,
                    source?.id === s.id && { color: "white" },
                  ]}
                >
                  {s.name}
                </Text>
              </Pressable>
              {manage && (
                <Pressable
                  accessibilityLabel={`${s.name} 삭제`}
                  onPress={() => {
                    const next = sources.filter((x) => x.id !== s.id);
                    onSourcesChange(next);
                    if (source?.id === s.id)
                      onSelect(
                        {
                          podcastId: next[0]?.id,
                          episodeId: undefined,
                          episode: undefined,
                        },
                        next[0]?.name || "채널 선택",
                      );
                  }}
                  style={styles.delete}
                >
                  <Text style={styles.link}>삭제</Text>
                </Pressable>
              )}
            </View>
          ))}
          <Pressable style={styles.manage} onPress={() => setManage((v) => !v)}>
            <Text style={styles.link}>
              {manage ? "RSS 관리 접기" : "＋ RSS 채널 추가·관리"}
            </Text>
          </Pressable>
          {manage && (
            <View style={styles.form}>
              <Text style={styles.label}>공개 RSS 주소 추가</Text>
              <TextInput
                accessibilityLabel="팟캐스트 RSS 주소"
                placeholder="https://example.com/podcast.rss"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect={false}
                value={input}
                editable={!adding}
                onChangeText={setInput}
                style={styles.input}
              />
              <Pressable
                disabled={adding || !input.trim()}
                onPress={add}
                style={[
                  styles.add,
                  (adding || !input.trim()) && { opacity: 0.4 },
                ]}
              >
                <Text style={styles.addText}>
                  {adding ? "오디오 RSS 확인 중…" : "RSS 확인하고 채널 저장"}
                </Text>
              </Pressable>
              <Text style={styles.note}>
                음성이 포함된 공개 HTTPS RSS를 등록해요. 브라우저에서 읽기를
                제한한 피드는 휴대폰 앱에서 추가할 수 있어요.
              </Text>
            </View>
          )}
        </>
      )}
      {loading && <ActivityIndicator color="#686096" />}
      {error && (
        <Text accessibilityLiveRegion="polite" style={styles.note}>
          {error}
        </Text>
      )}
      {feed && (
        <>
          <View style={styles.row}>
            <Text style={styles.label}>에피소드 선택</Text>
            {!autoPlay && (
              <Pressable
                onPress={() => setRefresh((v) => v + 1)}
                style={styles.delete}
              >
                <Text style={styles.link}>새로고침</Text>
              </Pressable>
            )}
          </View>
          {feed.snapshot && (
            <Text style={styles.note}>
              웹 읽기 제한으로{" "}
              {new Date(feed.fetchedAt).toLocaleString("ko-KR")}에 확인한 목록을
              표시해요. 휴대폰 앱은 원본 RSS에 직접 연결해요.
            </Text>
          )}
          {!autoPlay && !libraryOnly && (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: episodesOpen }}
                accessibilityLabel={
                  episodesOpen ? "에피소드 목록 접기" : "다른 에피소드 선택"
                }
                onPress={() => setEpisodesOpen((open) => !open)}
                style={styles.episodeToggle}
              >
                <Text style={styles.link}>
                  {episodesOpen ? "에피소드 목록 접기" : "다른 에피소드 선택"}
                </Text>
                <Text style={styles.link}>{episodesOpen ? "⌃" : "⌄"}</Text>
              </Pressable>
              {episodesOpen && (
                <ScrollView
                  nestedScrollEnabled
                  style={styles.episodeList}
                  contentContainerStyle={{ padding: 4 }}
                >
                  {feed.episodes.slice(0, 5).map((e) => (
                    <Pressable
                      key={e.id}
                      accessibilityRole="radio"
                      accessibilityLabel={e.title}
                      accessibilityState={{ selected: episode?.id === e.id }}
                      onPress={() => {
                        onSelect(
                          { podcastId: source.id, episodeId: e.id, episode: e },
                          feed.name,
                        );
                        setEpisodesOpen(false);
                      }}
                      style={[
                        styles.episode,
                        episode?.id === e.id && styles.selectedEpisode,
                      ]}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text
                          numberOfLines={1}
                          ellipsizeMode="tail"
                          style={styles.episodeTitle}
                        >
                          {e.title}
                        </Text>
                        <Text style={styles.note}>
                          {e.publishedAt
                            ? new Date(e.publishedAt).toLocaleDateString(
                                "ko-KR",
                              )
                            : "날짜 미제공"}
                          {e.duration
                            ? ` · ${Math.round(e.duration / 60)}분`
                            : ""}
                        </Text>
                      </View>
                      <Text style={styles.selectionMark}>
                        {episode?.id === e.id ? "✓" : "○"}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </>
          )}
        </>
      )}
      {episode && source && !libraryOnly && (
        <PodcastPlayer
          key={episode.id}
          episode={episode}
          program={feed?.name || source.name}
          minutes={minutes}
          autoPlay={autoPlay && startAudio}
          paused={paused}
          onTogglePause={onTogglePause}
        />
      )}
      <Pressable
        accessibilityRole="link"
        onPress={() => source && Linking.openURL(source.url)}
      >
        <Text style={styles.link}>공식 RSS 원본 ↗</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { gap: 12 },
  label: { fontSize: 13, fontWeight: "700", color: "#626C67" },
  sourceRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  source: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#E8EEE9",
  },
  chosen: { backgroundColor: "#245C56" },
  sourceText: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 19,
    color: "#245C56",
  },
  delete: { padding: 12 },
  link: { fontSize: 12, fontWeight: "700", color: "#686096" },
  manage: { padding: 14, borderRadius: 13, backgroundColor: "#E8E7F3" },
  form: { gap: 10 },
  input: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#CFD8D0",
    fontSize: 13,
  },
  add: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#686096",
    alignItems: "center",
  },
  addText: { fontSize: 13, fontWeight: "700", color: "white" },
  note: { fontSize: 11, lineHeight: 18, color: "#626C67" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  episodeToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#F0EEF7",
  },
  episodeList: {
    maxHeight: 220,
    borderWidth: 1,
    borderColor: "#E4E7DF",
    borderRadius: 13,
  },
  selectionMark: {
    fontSize: 17,
    color: "#686096",
    width: 20,
    textAlign: "center",
  },
  episode: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 60,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "transparent",
    gap: 8,
  },
  selectedEpisode: { borderColor: "#686096", backgroundColor: "#F0EEF7" },
  episodeTitle: {
    fontSize: 13,
    lineHeight: 21,
    fontWeight: "600",
    color: "#252D2B",
  },
});
