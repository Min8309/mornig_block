import { XMLParser, XMLValidator } from "fast-xml-parser";
export const newsCategories = [
  "정치",
  "경제",
  "사회",
  "생활/문화",
  "IT/과학",
  "세계",
] as const;
export type NewsCategory = (typeof newsCategories)[number];
export type NewsArticle = {
  id: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string | null;
  source: string;
};
export type NewsFeed = {
  category: NewsCategory;
  source: string;
  sourceSection: string;
  feedUrl: string;
  fetchedAt: string;
  articles: NewsArticle[];
};
const sections: Record<NewsCategory, { slug: string; label: string }> = {
  정치: { slug: "politics", label: "정치" },
  경제: { slug: "economy", label: "경제" },
  사회: { slug: "society", label: "사회" },
  "생활/문화": { slug: "culture", label: "문화" },
  "IT/과학": { slug: "health", label: "IT·바이오" },
  세계: { slug: "international", label: "국제" },
};
export function normalizeCategory(value: string): NewsCategory {
  if (value === "문화") return "생활/문화";
  if (value === "IT·기술") return "IT/과학";
  if (newsCategories.includes(value as NewsCategory))
    return value as NewsCategory;
  throw new Error("지원하지 않는 뉴스 분야예요.");
}
export function textOnly(value: unknown) {
  const text =
    typeof value === "object" && value !== null
      ? "#text" in value
        ? String((value as { "#text": unknown })["#text"])
        : ""
      : String(value ?? "");
  const decoded = text.replace(
    /&(?:amp|lt|gt|quot|apos|nbsp);|&#(?:x[0-9a-f]+|[0-9]+);/gi,
    (entity) => {
      const basic: Record<string, string> = {
        "&amp;": "&",
        "&lt;": "<",
        "&gt;": ">",
        "&quot;": '"',
        "&apos;": "'",
        "&nbsp;": " ",
      };
      if (basic[entity.toLowerCase()]) return basic[entity.toLowerCase()];
      const value = entity.slice(2, -1);
      const code =
        value[0]?.toLowerCase() === "x"
          ? parseInt(value.slice(1), 16)
          : parseInt(value, 10);
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
        ? String.fromCodePoint(code)
        : "";
    },
  );
  return decoded
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}
export function parseNews(
  xml: string,
  category: NewsCategory,
  now = new Date(),
): NewsFeed {
  if (
    xml.length > 1_500_000 ||
    /<!DOCTYPE|<!ENTITY/i.test(xml) ||
    XMLValidator.validate(xml) !== true
  )
    throw new Error("RSS 형식을 확인할 수 없어요.");
  const parsed = new XMLParser({
    ignoreAttributes: true,
    processEntities: true,
    parseTagValue: false,
    trimValues: true,
  }).parse(xml);
  const channel = parsed?.rss?.channel;
  if (!channel) throw new Error("뉴스 RSS를 찾지 못했어요.");
  const items = Array.isArray(channel.item)
    ? channel.item
    : channel.item
      ? [channel.item]
      : [];
  const seen = new Set<string>();
  const articles: NewsArticle[] = [];
  for (const item of items) {
    const title = textOnly(item.title).slice(0, 240);
    if (!title) continue;
    let url: URL;
    try {
      url = new URL(textOnly(item.link));
    } catch {
      continue;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") continue;
    if (url.hostname !== "newsis.com" && !url.hostname.endsWith(".newsis.com"))
      continue;
    url.protocol = "https:";
    const canonical = url.toString();
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    const published = new Date(textOnly(item.pubDate));
    articles.push({
      id: canonical,
      title,
      summary: textOnly(item.description).slice(0, 180),
      url: canonical,
      publishedAt: Number.isFinite(published.getTime())
        ? published.toISOString()
        : null,
      source: "뉴시스",
    });
  }
  articles.sort(
    (a, b) =>
      (b.publishedAt ? Date.parse(b.publishedAt) : 0) -
      (a.publishedAt ? Date.parse(a.publishedAt) : 0),
  );
  return {
    category,
    source: "뉴시스",
    sourceSection: sections[category].label,
    feedUrl: `https://www.newsis.com/RSS/${sections[category].slug}.xml`,
    fetchedAt: now.toISOString(),
    articles: articles.slice(0, 12),
  };
}
const cache = new Map<NewsCategory, NewsFeed>();
export async function loadNews(
  value: string,
  signal?: AbortSignal,
  force = false,
): Promise<NewsFeed> {
  const category = normalizeCategory(value),
    previous = cache.get(category);
  if (
    !force &&
    previous &&
    Date.now() - Date.parse(previous.fetchedAt) < 120000
  )
    return previous;
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) controller.abort();
  const timeout = setTimeout(cancel, 10000);
  try {
    const response = await fetch(
      `https://www.newsis.com/RSS/${sections[category].slug}.xml`,
      { signal: controller.signal },
    );
    if (!response.ok)
      throw new Error(
        "언론사에서 뉴스를 받지 못했어요. 잠시 후 다시 시도해 주세요.",
      );
    const content = await response.text();
    const feed = parseNews(content, category);
    if (!feed.articles.length) throw new Error("현재 제공된 기사가 없어요.");
    cache.set(category, feed);
    return feed;
  } catch (error) {
    if (controller.signal.aborted)
      throw new Error("뉴스 연결 시간이 초과되었거나 요청이 취소됐어요.");
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
  }
}
export function briefing(feed: NewsFeed, minutes: number) {
  const budget = Math.max(120, Math.floor(minutes * 60 * 3.2) - 100);
  let used = 0;
  const stories: string[] = [];
  for (const article of feed.articles.slice(0, 8)) {
    const headline = `${stories.length + 1}번째 소식. ${article.title}.`;
    if (used + headline.length > budget && stories.length) break;
    const summary =
      used + headline.length + article.summary.length < budget
        ? article.summary
        : "";
    const story = `${headline} ${summary}`;
    stories.push(story);
    used += story.length;
  }
  return `${feed.source} 공개 RSS의 ${feed.category} 소식입니다. 기사 제목과 RSS 소개문을 읽어드립니다. ${stories.join(" ")} 이상 ${stories.length}개 소식이었습니다. 자세한 내용은 원문 링크에서 확인해 주세요.`;
}
