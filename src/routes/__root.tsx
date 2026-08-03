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
      // PWA / mobile
      { name: "theme-color", content: "#1A1A1A" },
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
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-fh-bg">
      <h1 className="text-2xl font-bold text-fh-ember">Page not found</h1>
      <a href="/" className="text-fh-tide underline">
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
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => {
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
          isGrandparent
            ? "gp-body"
            : "bg-fh-bg text-fh-body"
        }`}
      >
        {/* Mode Toggle Bar */}
        <div
          className={`flex items-center justify-end px-4 py-2 ${
            isGrandparent
              ? "border-b-2"
              : "border-b border-fh-border bg-white"
          }`}
          style={
            isGrandparent
              ? {
                  borderColor: "#1A1A1A",
                  backgroundColor: "#FFFFFF",
                }
              : {}
          }
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
            className={`flex items-center gap-2 rounded-none px-4 py-2 text-sm font-medium transition-colors ${
              isGrandparent
                ? "border-2 bg-white text-fh-body hover:bg-gp-surface"
                : "text-fh-muted hover:bg-fh-surface hover:text-fh-body"
            }`}
            style={{
              minHeight: isGrandparent ? "56px" : "44px",
              ...(isGrandparent ? { borderColor: "#1A1A1A" } : {}),
            }}
          >
            <span
              aria-hidden="true"
              className="shrink-0"
              style={{
                width: isGrandparent ? 10 : 8,
                height: isGrandparent ? 10 : 8,
                backgroundColor: isGrandparent
                  ? "#1A1A1A"
                  : "rgba(26, 26, 26, 0.3)",
              }}
            />
            {isGrandparent ? "Standard mode" : "Simplified mode"}
          </button>
        </div>

        {children}
        <Scripts />
      </body>
    </html>
  );
}
