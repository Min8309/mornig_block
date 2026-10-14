// Run with Node 22+: OPENAI_API_KEY, TTS_ACCESS_TOKEN, PUBLIC_BASE_URL and TTS_ALLOWED_ORIGINS.
import http from "node:http";
import { randomUUID, timingSafeEqual } from "node:crypto";
const {
  OPENAI_API_KEY,
  TTS_ACCESS_TOKEN,
  TTS_ALLOWED_ORIGINS = "",
} = process.env;
const PUBLIC_BASE_URL =
  process.env.PUBLIC_BASE_URL || process.env.RENDER_EXTERNAL_URL;
if (
  !OPENAI_API_KEY ||
  !TTS_ACCESS_TOKEN ||
  TTS_ACCESS_TOKEN.length < 32 ||
  !PUBLIC_BASE_URL?.startsWith("https://")
)
  throw Error(
    "Configure server secrets, a >=32 character access token and HTTPS public URL.",
  );
const origins = TTS_ALLOWED_ORIGINS.split(",").filter(Boolean),
  audio = new Map(),
  limits = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [id, v] of audio) if (v.expires < now) audio.delete(id);
  for (const [id, v] of limits) if (v.until < now) limits.delete(id);
}, 60000).unref();
const authorized = (value) => {
  const a = Buffer.from(value || ""),
    b = Buffer.from(`Bearer ${TTS_ACCESS_TOKEN}`);
  return a.length === b.length && timingSafeEqual(a, b);
};
const json = (res, status, value) => {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(value));
};
http
  .createServer(async (req, res) => {
    const origin = req.headers.origin;
    if (origin) {
      if (!origins.includes(origin))
        return json(res, 403, { error: "Origin not allowed" });
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type",
    );
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }
    const path = new URL(req.url, "http://localhost").pathname;
    if (req.method === "GET" && path.startsWith("/audio/")) {
      const id = path.slice(7),
        item = audio.get(id);
      if (!item || item.expires < Date.now())
        return json(res, 404, { error: "Audio expired" });
      res.writeHead(200, {
        "Content-Type": "audio/mpeg",
        "Content-Length": item.data.length,
        "Cache-Control": "private, no-store",
      });
      return res.end(item.data);
    }
    if (req.method !== "POST" || path !== "/tts")
      return json(res, 404, { error: "Not found" });
    if (!authorized(req.headers.authorization))
      return json(res, 401, { error: "Unauthorized" });
    // This single-owner server needs per-user authentication before public app launch.
    const ip = req.socket.remoteAddress,
      now = Date.now(),
      limit = limits.get(ip) || { count: 0, until: now + 60000 };
    if (limit.until < now) {
      limit.count = 0;
      limit.until = now + 60000;
    }
    limits.set(ip, limit);
    if (++limit.count > 30)
      return json(res, 429, { error: "Too many requests" });
    if (audio.size >= 100)
      return json(res, 503, { error: "Audio queue is full" });
    try {
      let body = "";
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body) > 24000) {
          json(res, 413, { error: "Text too long" });
          req.destroy();
          return;
        }
      }
      const value = JSON.parse(body);
      if (
        typeof value.text !== "string" ||
        !value.text.trim() ||
        value.text.length > 4000 ||
        !["nova", "onyx"].includes(value.voice)
      )
        return json(res, 400, { error: "Invalid text or voice" });
      const upstream = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "tts-1-hd",
          voice: value.voice,
          input: value.text,
          response_format: "mp3",
          speed: Math.max(0.6, Math.min(1.25, Number(value.rate) || 1)),
        }),
        signal: AbortSignal.timeout(45000),
      });
      if (!upstream.ok)
        return json(res, 502, { error: "Speech provider unavailable" });
      const data = Buffer.from(await upstream.arrayBuffer()),
        id = randomUUID();
      audio.set(id, { data, expires: Date.now() + 300000 });
      json(res, 200, {
        audioUrl: `${PUBLIC_BASE_URL.replace(/\/$/, "")}/audio/${id}`,
      });
    } catch {
      json(res, 502, { error: "Speech generation failed" });
    }
  })
  .listen(Number(process.env.PORT) || 8787, "0.0.0.0");
