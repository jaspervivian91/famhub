import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { signUp } from "~/lib/auth-api";
import { Logo } from "~/components/Logo";

export const Route = createFileRoute("/sign-up")({
  component: SignUpPage,
});

function SignUpPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      await signUp({
        data: {
          email: email.trim(),
          password,
          displayName: displayName.trim(),
        },
      });
      // Redirect to dashboard
      navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-dvh" style={{ backgroundColor: "#F5F0EB" }}>
      {/* ── Structural grid lines ────────────────────────────── */}
      <div
        className="pointer-events-none fixed inset-y-0 z-0"
        style={{
          left: "24px",
          width: "0",
          borderLeft: "0.5px dashed #EBF0EC",
        }}
      />
      <div
        className="pointer-events-none fixed inset-y-0 z-0"
        style={{
          right: "24px",
          width: "0",
          borderRight: "0.5px dashed #EBF0EC",
        }}
      />

      {/* ── Top ruled line with crosshair markers ────────────── */}
      <div
        className="pointer-events-none fixed left-6 right-6 top-[60px] z-10 border-t"
        style={{ borderColor: "#1A1A1A", borderWidth: "0.5px" }}
      />
      <div className="pointer-events-none fixed z-10" style={{ left: "24px", top: "50px" }}>
        <div style={{ width: "1.5px", height: "20px", backgroundColor: "#1A1A1A", margin: "0 auto" }} />
        <div style={{ width: "20px", height: "1.5px", backgroundColor: "#1A1A1A", position: "absolute", top: "10px", left: "-9px" }} />
      </div>
      <div className="pointer-events-none fixed z-10" style={{ right: "24px", top: "50px" }}>
        <div style={{ width: "1.5px", height: "20px", backgroundColor: "#1A1A1A", margin: "0 auto" }} />
        <div style={{ width: "20px", height: "1.5px", backgroundColor: "#1A1A1A", position: "absolute", top: "10px", left: "-9px" }} />
      </div>

      {/* ── Main content ─────────────────────────────────────── */}
      <main className="relative z-10 mx-auto flex min-h-dvh max-w-[327px] flex-col justify-center px-0 py-12">
        {/* Logo */}
        <div className="mb-10 flex justify-center">
          <Logo variant="icon" size="xl" />
        </div>

        {/* Heading */}
        <h1
          className="mb-2 text-center"
          style={{
            fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
            fontSize: "26px",
            fontWeight: 800,
            color: "#1A1A1A",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          CREATE ACCOUNT
        </h1>

        {/* Ruled line */}
        <div className="mb-8 w-full" style={{ borderTop: "0.5px solid #1A1A1A" }} />

        {/* Error */}
        {error && (
          <div
            className="mb-6 p-3"
            style={{
              backgroundColor: "#EBF0EC",
              border: "1.5px solid #3A6B4A",
              fontFamily: "'JetBrains Mono', 'SF Mono', 'Courier New', monospace",
              fontSize: "10px",
              color: "#3A6B4A",
              letterSpacing: "0.03em",
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Display name */}
          <label
            htmlFor="display-name"
            className="mb-1 block"
            style={{
              fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
              fontSize: "10px",
              fontWeight: 700,
              color: "#1A1A1A",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            NAME
          </label>
          <input
            id="display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="mb-5 w-full px-4 py-3"
            style={{
              backgroundColor: "#EBF0EC",
              border: "1.5px solid #1A1A1A",
              color: "#1A1A1A",
              fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
              fontSize: "14px",
              outline: "none",
            }}
            required
            autoFocus
          />

          {/* Email */}
          <label
            htmlFor="email"
            className="mb-1 block"
            style={{
              fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
              fontSize: "10px",
              fontWeight: 700,
              color: "#1A1A1A",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            EMAIL
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mb-5 w-full px-4 py-3"
            style={{
              backgroundColor: "#EBF0EC",
              border: "1.5px solid #1A1A1A",
              color: "#1A1A1A",
              fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
              fontSize: "14px",
              outline: "none",
            }}
            required
          />

          {/* Password */}
          <label
            htmlFor="password"
            className="mb-1 block"
            style={{
              fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
              fontSize: "10px",
              fontWeight: 700,
              color: "#1A1A1A",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            PASSWORD
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            minLength={8}
            className="mb-6 w-full px-4 py-3"
            style={{
              backgroundColor: "#EBF0EC",
              border: "1.5px solid #1A1A1A",
              color: "#1A1A1A",
              fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
              fontSize: "14px",
              outline: "none",
            }}
            required
          />

          {/* Submit */}
          <button
            type="submit"
            disabled={busy}
            className="w-full"
            style={{
              height: "50px",
              backgroundColor: busy ? "#EBF0EC" : "#3A6B4A",
              color: busy ? "#1A1A1A" : "#F5F0EB",
              border: "none",
              fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
              fontSize: "13px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.3em",
              cursor: busy ? "default" : "pointer",
            }}
          >
            {busy ? "CREATING ACCOUNT…" : "CREATE ACCOUNT"}
          </button>
        </form>

        {/* Link to sign-in */}
        <div className="mt-6 text-center">
          <a
            href="/sign-in"
            style={{
              fontFamily: "'JetBrains Mono', 'SF Mono', 'Courier New', monospace",
              fontSize: "10px",
              color: "#1A1A1A",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              textDecoration: "none",
              borderBottom: "1px solid #1A1A1A",
              paddingBottom: "2px",
            }}
          >
            ALREADY HAVE AN ACCOUNT? SIGN IN
          </a>
        </div>

        {/* ── Bottom heading with ruled line ────────────────── */}
        <div className="mt-auto pt-12">
          <div className="mb-3 w-full" style={{ borderTop: "0.5px solid #1A1A1A" }} />
          <h2
            className="text-center"
            style={{
              fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
              fontSize: "18px",
              fontWeight: 800,
              color: "#1A1A1A",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              opacity: 0.15,
            }}
          >
            CREATE ACCOUNT
          </h2>
        </div>
      </main>
    </div>
  );
}
