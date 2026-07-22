import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html", host: "localhost" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the NBA player query shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>NBA 梦幻九宫格球员查询<\/title>/i);
  assert.match(html, /src="\/nba-guide\.html"/i);
  assert.match(html, /直接进入球队交集查询/);
  assert.match(html, /http:\/\/localhost\/og\.png/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/);
});

test("ships the complete player database and social assets", async () => {
  const [guide, og, favicon] = await Promise.all([
    readFile(new URL("../public/nba-guide.html", import.meta.url), "utf8"),
    access(new URL("../public/og.png", import.meta.url)),
    access(new URL("../public/favicon.png", import.meta.url)),
  ]);

  assert.match(guide, /搜索 5,135 名球员/);
  assert.match(guide, /球队交集查询/);
  assert.match(guide, /条件答案查询/);
  assert.match(guide, /NBA 梦幻九宫格球员查询/);

  await assert.rejects(access(new URL("../app/_sites-preview", templateRoot)));
});
