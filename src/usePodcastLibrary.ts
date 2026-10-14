import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initialPodcasts, PodcastSource, rssUrl } from "./podcasts";
const key = "morningblock.podcast.library.v1";
export function usePodcastLibrary() {
  const [sources, setSources] = useState<PodcastSource[]>(initialPodcasts),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    AsyncStorage.getItem(key)
      .then((value) => {
        if (value) {
          const parsed = JSON.parse(value);
          if (!Array.isArray(parsed)) throw Error("Invalid podcast library");
          const ids = new Set<string>();
          setSources(
            parsed.filter((source) => {
              try {
                if (
                  typeof source?.id !== "string" ||
                  typeof source?.name !== "string" ||
                  ids.has(source.id)
                )
                  return false;
                rssUrl(source.url);
                ids.add(source.id);
                return true;
              } catch {
                return false;
              }
            }),
          );
        }
      })
      .catch(() => setError("팟캐스트 목록을 불러오지 못했어요."))
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (ready)
      AsyncStorage.setItem(key, JSON.stringify(sources)).catch(() =>
        setError("팟캐스트 목록을 저장하지 못했어요."),
      );
  }, [sources, ready]);
  return { sources, setSources, ready, error };
}
