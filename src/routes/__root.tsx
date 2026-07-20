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
      { title: "Family Hub — Stay close to the people who matter" },
      {
        name: "description",
        content:
          "A private, AI-powered connection platform that strengthens family relationships — the opposite of social media.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  notFoundComponent: () => (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold text-amber-800">Page not found</h1>
      <a href="/" className="text-teal-600 underline">
        Back to Family Hub
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
          isGrandparent ? "gp-body" : "bg-stone-50 text-stone-800"
        }`}
      >
        {/* Mode Toggle Bar */}
        <div
          className={`flex items-center justify-end px-4 py-2 ${
            isGrandparent
              ? "border-b"
              : "border-b border-stone-100 bg-white"
          }`}
          style={
            isGrandparent
              ? {
                  borderColor: "#e0d8c8",
                  backgroundColor: "var(--gp-bg, #fffdf7)",
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
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              isGrandparent
                ? "text-[#1a365d] hover:bg-[#f5e6c0]"
                : "text-stone-500 hover:bg-stone-100 hover:text-stone-700"
            }`}
            style={{ minHeight: "44px" }}
          >
            {isGrandparent ? "Standard mode" : "Simplified mode"}
          </button>
        </div>

        {children}
        <Scripts />
      </body>
    </html>
  );
}
