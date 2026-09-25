import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import appCss from "~/styles/app.css?url";
import { getUIMode, setUIMode } from "~/lib/ui-mode";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Family Core — Stay close to the people who matter" },
      {
        name: "description",
        content:
          "A private, AI-powered connection platform that strengthens family relationships — the opposite of social media.",
      },
      // PWA / mobile — warm cream chrome, never stark black
      { name: "theme-color", content: "#F5F0EB" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "Family Core" },
      { name: "mobile-web-app-capable", content: "yes" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // PWA manifest
      { rel: "manifest", href: "/manifest.json" },
      // Apple touch icon (iOS home screen)
      {
        rel: "apple-touch-icon",
        sizes: "192x192",
        href: "/icons/icon-192.png",
      },
      // Google Fonts preconnect
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      // Favicon
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    ],
  }),
  notFoundComponent: () => (
    <div className="fh-page-turn flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="fh-h2">We couldn&apos;t find that page</h1>
      <a href="/" className="fh-link fh-body">
        Back to Family Core
      </a>
    </div>
  ),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"standard" | "grandparent">("standard");

  useEffect(() => {
    setMode(getUIMode());
  }, []);

  // Register PWA service worker
  useEffect(() => {
    if ("serviceWorker" in navigator && window.location.protocol === "https:") {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("Service worker registration failed:", err);
      });
    }
  }, []);

  function handleToggle() {
    if (mode === "grandparent") {
      setUIMode("standard");
      setMode("standard");
      window.location.href = "/";
    } else {
      setUIMode("grandparent");
      setMode("grandparent");
      window.location.href = "/grandparent";
    }
  }

  const isGrandparent = mode === "grandparent";

  return (
    <html lang="en" className={isGrandparent ? "gp-mode-active" : ""}>
      <head>
        <HeadContent />
      </head>
      <body
        className={`min-h-dvh antialiased ${
          isGrandparent ? "gp-body" : "bg-fh-bg text-fh-body"
        }`}
      >
        {/* ── Warm mode switch — a quiet corner control, never a toolbar ── */}
        <div
          className="flex items-center justify-end px-5 pt-4 pb-1"
          style={{ backgroundColor: "var(--color-fh-bg)" }}
        >
          <button
            role="switch"
            aria-checked={isGrandparent}
            aria-label={
              isGrandparent
                ? "Switch to standard mode"
                : "Switch to simplified mode"
            }
            onClick={handleToggle}
            className={`inline-flex items-center gap-2 rounded-full border font-[family-name:var(--font-body)] transition-colors ${
              isGrandparent
                ? "px-5 py-3 text-[1.125rem] font-bold"
                : "px-3 py-1.5 text-[0.8125rem]"
            }`}
            style={{
              minHeight: isGrandparent ? 60 : 44,
              backgroundColor: isGrandparent
                ? "var(--color-fh-surface-soft)"
                : "transparent",
              borderColor: "var(--color-fh-line)",
              color: isGrandparent
                ? "var(--color-fh-body)"
                : "var(--color-fh-muted)",
              transitionDuration: "200ms",
            }}
          >
            <span
              aria-hidden="true"
              className="shrink-0 rounded-full"
              style={{
                width: isGrandparent ? 12 : 8,
                height: isGrandparent ? 12 : 8,
                backgroundColor: "var(--color-fh-accent)",
              }}
            />
            {isGrandparent ? "Standard text" : "Larger text"}
          </button>
        </div>

        {children}
        <Scripts />
      </body>
    </html>
  );
}
