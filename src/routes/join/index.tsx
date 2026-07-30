import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "~/components/Logo";

export const Route = createFileRoute("/join/")({
  component: JoinPage,
});

function JoinPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    // Navigate to the invite code route
    navigate({ to: "/join/$inviteCode", params: { inviteCode: code.trim() } });
  }

  return (
    <div className="relative min-h-dvh" style={{ backgroundColor: "#F5F0EB" }}>
      {/* ── Structural grid lines ────────────────────────────── */}
      <div className="pointer-events-none fixed inset-y-0 z-0" style={{ left: "24px", width: "0", borderLeft: "0.5px dashed #EDEDEA" }} />
      <div className="pointer-events-none fixed inset-y-0 z-0" style={{ right: "24px", width: "0", borderRight: "0.5px dashed #EDEDEA" }} />

      {/* ── Top ruled line with crosshair markers ────────────── */}
      <div className="pointer-events-none fixed left-6 right-6 top-[60px] z-10 border-t" style={{ borderColor: "#1A1A1A", borderWidth: "0.5px" }} />
      <div className="pointer-events-none fixed z-10" style={{ left: "24px", top: "50px" }}>
        <div style={{ width: "1.5px", height: "20px", backgroundColor: "#1A1A1A", margin: "0 auto" }} />
        <div style={{ width: "20px", height: "1.5px", backgroundColor: "#1A1A1A", position: "absolute", top: "10px", left: "-9px" }} />
      </div>
      <div className="pointer-events-none fixed z-10" style={{ right: "24px", top: "50px" }}>
        <div style={{ width: "1.5px", height: "20px", backgroundColor: "#1A1A1A", margin: "0 auto" }} />
        <div style={{ width: "20px", height: "1.5px", backgroundColor: "#1A1A1A", position: "absolute", top: "10px", left: "-9px" }} />
      </div>

      <main className="relative z-10 mx-auto flex min-h-dvh max-w-[327px] flex-col justify-center px-0 py-12">
        <div className="mb-10 flex justify-center">
          <Logo variant="icon" size="xl" />
        </div>

        <h1 style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", fontSize: "26px", fontWeight: 800, color: "#1A1A1A", letterSpacing: "0.06em", textTransform: "uppercase", textAlign: "center" }}>
          ENTER INVITE CODE
        </h1>
        <div className="mb-8 mt-2 w-full" style={{ borderTop: "0.5px solid #1A1A1A" }} />

        {error && (
          <div className="mb-6 p-3" style={{ backgroundColor: "#EDEDEA", border: "1.5px solid #C8603A", fontFamily: "'JetBrains Mono', 'SF Mono', 'Courier New', monospace", fontSize: "10px", color: "#C8603A" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label htmlFor="code" className="mb-1 block" style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", fontSize: "10px", fontWeight: 700, color: "#1A1A1A", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            INVITE CODE
          </label>
          <input
            id="code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter your family invite code"
            className="mb-6 w-full px-4 py-3"
            style={{ backgroundColor: "#EDEDEA", border: "1.5px solid #1A1A1A", color: "#1A1A1A", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", fontSize: "14px", outline: "none" }}
            required
            autoFocus
          />
          <button type="submit" className="w-full" style={{ height: "50px", backgroundColor: "#C8603A", color: "#F5F0EB", border: "none", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3em", cursor: "pointer" }}>
            JOIN FAMILY
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/" style={{ fontFamily: "'JetBrains Mono', 'SF Mono', 'Courier New', monospace", fontSize: "10px", color: "#1A1A1A", letterSpacing: "0.05em", textTransform: "uppercase", textDecoration: "none", borderBottom: "1px solid #1A1A1A", paddingBottom: "2px" }}>
            BACK TO HOME
          </a>
        </div>
      </main>
    </div>
  );
}
