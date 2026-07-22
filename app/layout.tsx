import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NBA 梦幻九宫格球员查询",
  description:
    "查询 NBA 球队交集、球队条件、成就口径与 5,135 名球员资料。",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
