import { Outlet, createFileRoute } from "@tanstack/react-router";

/** The agent area. Each screen below it renders through this outlet. */
export const Route = createFileRoute("/agents")({
  component: () => <Outlet />,
});
