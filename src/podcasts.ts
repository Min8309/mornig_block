import { Platform } from "react-native";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { textOnly } from "./news";
import lukeSnapshot from "./data/luke-snapshot.json";
export type PodcastSource = {
  id: string;
  name: string;
  url: string;
  custom?: boolean;
};
export type PodcastEpisode = {
  id: string;
  title: string;
  audioUrl: string;
  url: string;
  publishedAt: string | null;
  duration: number | null;
};
export type PodcastFeed = {
  name: string;
  url: string;
  episodes: PodcastEpisode[];
  fetchedAt: string;
  snapshot?: boolean;
};
export const initialPodcasts: PodcastSource[] = [
  {
    id: "bbc-grammar",
    name: "BBC · Learning English Grammar",
    url: "https://podcasts.files.bbci.co.uk/p02pc9wq.rss",
  },
  {
    id: "bbc-conversations",
    name: "BBC · Learning English Conversations",
    url: "https://podcasts.files.bbci.co.uk/p02pc9zn.rss",
  },
  {
    id: "luke",
    name: "Luke’s English Podcast",
    url: "https://teacherluke.co.uk/feed/",
  },
  {
    id: "bbc-sixminute",
    name: "BBC · 6 Minute English",
    url: "https://podcasts.files.bbci.co.uk/p02pc9tn.rss",
  },
];
export function rssUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("올바른 RSS 주소를 입력해 주세요.");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.hostname === "localhost" ||
    /^(127\.|0\.|10\.|192\.168\.|169\.254\.|\[|172\.(1[6-9]|2\d|3[01])\.)/.test(
      url.hostname,
    )
  )
    throw new Error("공개 HTTPS RSS 주소만 등록할 수 있어요.");
  url.hash = "";
  return url.toString();
}
export function podcastAudioUrl(value: string) {
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("오디오 주소 형식이 올바르지 않아요.");
  url.protocol = "https:";
  if (url.hostname === "open.live.bbc.co.uk")
    url.pathname = url.pathname.replace("/proto/http/", "/proto/https/");
  return url.toString();
}
function duration(value: unknown) {
  const parts = String(value ?? "")
    .split(":")
    .map(Number);
  if (parts.some((x) => !Number.isFinite(x) || x < 0) || parts.length > 3)
    return null;
  return parts.reduce((total, x) => total * 60 + x, 0) || null;
}
export function parsePodcast(xml: string, url: string): PodcastFeed {
  if (
    xml.length > 8_000_000 ||
    /<!DOCTYPE|<!ENTITY/i.test(xml) ||
    XMLValidator.validate(xml) !== true
  )
    throw new Error("RSS 형식을 확인할 수 없어요.");
  const channel = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseTagValue: false,
    processEntities: true,
  }).parse(xml)?.rss?.channel;
  if (!channel) throw new Error("팟캐스트 RSS 주소가 아니에요.");
  const raw = Array.isArray(channel.item)
    ? channel.item
    : channel.item
      ? [channel.item]
      : [];
  const episodes: PodcastEpisode[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const enclosures = Array.isArray(item.enclosure)
      ? item.enclosure
      : [item.enclosure];
    const enclosure = enclosures.find(
      (e: any) => e && String(e["@_type"] || "").startsWith("audio/"),
    );
    if (!enclosure) continue;
    let audioUrl: string;
    try {
      audioUrl = podcastAudioUrl(enclosure["@_url"]);
    } catch {
      continue;
    }
    if (seen.has(audioUrl)) continue;
    seen.add(audioUrl);
    const date = new Date(textOnly(item.pubDate));
    const link = textOnly(item.link);
    episodes.push({
      id: audioUrl,
      title: textOnly(item.title).slice(0, 220) || "제목 없는 에피소드",
      audioUrl,
      url: /^https?:\/\//.test(link) ? link : "",
      publishedAt: Number.isFinite(date.getTime()) ? date.toISOString() : null,
      duration: duration(item["itunes:duration"]),
    });
  }
  episodes.sort(
    (a, b) =>
      (b.publishedAt ? Date.parse(b.publishedAt) : 0) -
      (a.publishedAt ? Date.parse(a.publishedAt) : 0),
  );
  if (!episodes.length)
    throw new Error("RSS에서 재생할 오디오를 찾지 못했어요.");
  return {
    name: textOnly(channel.title) || "새 팟캐스트",
    url,
    episodes: episodes.slice(0, 12),
    fetchedAt: new Date().toISOString(),
  };
}
const cache = new Map<string, PodcastFeed>();
export async function loadPodcast(
  value: string,
  signal?: AbortSignal,
  force = false,
) {
  const url = rssUrl(value);
  const previous = cache.get(url);
  if (
    !force &&
    previous &&
    Date.now() - Date.parse(previous.fetchedAt) < 300000
  )
    return previous;
  const controller = new AbortController(),
    cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) cancel();
  const timeout = setTimeout(cancel, 12000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error("RSS 서버가 응답하지 않아요.");
    const feed = parsePodcast(await response.text(), url);
    cache.set(url, feed);
    return feed;
  } catch (error) {
    if (signal?.aborted) throw new Error("요청이 취소됐어요.");
    if (Platform.OS === "web" && url === lukeSnapshot.sourceUrl) {
      return {
        name: lukeSnapshot.title,
        url,
        fetchedAt: lukeSnapshot.fetchedAt,
        snapshot: true,
        episodes: lukeSnapshot.episodes.map((e) => ({
          id: e.audioUrl,
          title: e.title,
          audioUrl: e.audioUrl,
          url: e.url || "",
          publishedAt: Number.isFinite(Date.parse(e.date || ""))
            ? new Date(e.date!).toISOString()
            : null,
          duration: null,
        })),
      };
    }
    throw new Error(
      Platform.OS === "web"
        ? "RSS를 읽지 못했어요. 주소를 확인하거나 휴대폰 앱에서 등록해 주세요. 브라우저 읽기 제한이 있을 수 있어요."
        : "RSS 연결에 실패했어요. 주소와 네트워크를 확인해 주세요.",
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
  }
}
