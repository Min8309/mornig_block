const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const net = require("node:net");
test("TTS server rejects unauthenticated, invalid and disallowed-origin requests without provider calls", async () => {
  const reservation = net.createServer();
  await new Promise((resolve) => reservation.listen(0, "127.0.0.1", resolve));
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const token = "test-token-only-not-a-real-secret-123456789";
  const proc = spawn(process.execPath, ["server/tts.mjs"], {
    env: {
      ...process.env,
      PORT: String(port),
      OPENAI_API_KEY: "invalid-test-key-never-used",
      TTS_ACCESS_TOKEN: token,
      PUBLIC_BASE_URL: "https://voice.example.test",
      TTS_ALLOWED_ORIGINS: "https://allowed.example.test",
    },
    stdio: "ignore",
  });
  try {
    const endpoint = `http://127.0.0.1:${port}/tts`;
    let ready = false;
    for (let i = 0; i < 50; i++) {
      try {
        await fetch(endpoint);
        ready = true;
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    }
    assert.ok(ready, "server starts");
    let response = await fetch(endpoint, { method: "POST", body: "{}" });
    assert.equal(response.status, 401);
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: "sample", voice: "unsupported" }),
    });
    assert.equal(response.status, 400);
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Origin: "https://unapproved.example.test",
        Authorization: `Bearer ${token}`,
      },
      body: "{}",
    });
    assert.equal(response.status, 403);
    response = await fetch(endpoint, {
      method: "OPTIONS",
      headers: { Origin: "https://allowed.example.test" },
    });
    assert.equal(response.status, 204);
    assert.equal(
      response.headers.get("Access-Control-Allow-Origin"),
      "https://allowed.example.test",
    );
    response = await fetch(`http://127.0.0.1:${port}/audio/nonexistent`);
    assert.equal(response.status, 404);
  } finally {
    proc.kill();
    await new Promise((resolve) => proc.once("exit", resolve));
  }
});
