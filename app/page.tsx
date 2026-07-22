import type { Metadata } from "next";
import { headers } from "next/headers";

const title = "NBA 梦幻九宫格球员查询";
const description =
  "查询 NBA 球队交集、球队条件、成就口径与 5,135 名球员资料，快速找到正确且更稀有的九宫格答案。";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const imageUrl = `${protocol}://${host}/og.png`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale: "zh_CN",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: "NBA 梦幻九宫格球员查询",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function Home() {
  return (
    <main className="app-shell">
      <a className="skip-link" href="/nba-guide.html#pair-finder">
        直接进入球队交集查询
      </a>
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />
      <iframe
        className="guide-frame"
        src="/nba-guide.html"
        title="NBA 梦幻九宫格球员查询"
      />
      <noscript>
        <p className="noscript-note">
          需要启用 JavaScript 才能使用查询功能。你也可以
          <a href="/nba-guide.html">直接打开完整球员库</a>。
        </p>
      </noscript>
    </main>
  );
}
