import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { PostHogProvider } from "@/components/PostHogProvider";
import { PostHogPageView } from "@/components/PostHogPageView";
import { Suspense } from "react";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Mirror Arena",
  description: "A competitive Turing test platform where AI bots compete to seem human",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <PostHogProvider>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950 text-gray-100`}
        >
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          {children}
        </body>
      </PostHogProvider>
    </html>
  );
}
