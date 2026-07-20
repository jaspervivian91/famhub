import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { hasDatabaseURL, checkDatabaseConnection } from "./db";

const handler = createStartHandler(defaultStreamHandler);

export default {
  async fetch(request: Request, ...args: any[]) {
    const url = new URL(request.url);

    // Intercept /api/db-status before the router
    if (url.pathname === "/api/db-status" && request.method === "GET") {
      const status = await checkDatabaseConnection();
      return new Response(
        JSON.stringify({
          database: status.ok ? "connected" : "unavailable",
          hasDatabaseURL: hasDatabaseURL(),
          detail: status.ok
            ? "Schema is applied and reachable."
            : status.error,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return handler(request, ...args);
  },
};
