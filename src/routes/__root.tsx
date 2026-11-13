import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  Link,
  useRouterState,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "~/styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "HomeStory — Every home has a story." },
      {
        name: "description",
        content:
          "HomeStory gives a UK home a permanent digital history page, reached by a brass QR plaque beside the front door. The official EPC building record and the owner’s own chapter — passed on with the house.",
      },
      { name: "theme-color", content: "#F7F4EF" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
    ],
  }),
  notFoundComponent: () => (
    <div className="hs-wrap flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <p className="hs-label">Page not found</p>
      <h1 className="hs-h2">This page has no story yet.</h1>
      <Link to="/" className="hs-link">
        Back to HomeStory
      </Link>
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
  // A published home's page carries its own Claude credit line, at the end of
  // the story; the footer would only repeat it.
  const isHomeStoryPage = useRouterState({
    select: (state) => state.location.pathname.startsWith("/h/"),
  });

  return (
    <html lang="en-GB">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-dvh bg-hs-bg font-body text-hs-ink antialiased">
        <header className="hs-wrap">
          <div className="flex items-center justify-between border-b border-hs-rule-soft py-5">
            <Link
              to="/"
              className="font-display text-xl tracking-[0.01em] text-hs-ink no-underline"
            >
              HomeStory
            </Link>
            <span className="hs-label">Every home has a story</span>
          </div>
        </header>

        <main>{children}</main>

        <footer className="hs-wrap mt-16">
          <div className="border-t border-hs-rule-brass py-10">
            {!isHomeStoryPage && (
              <p className="hs-caption">
                History narratives powered by Claude AI.
              </p>
            )}
            <p className="hs-caption mt-2">
              HomeStory — a permanent history page for every home.
            </p>
          </div>
        </footer>
        <Scripts />
      </body>
    </html>
  );
}
