"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "system-ui, sans-serif",
            backgroundColor: "#FAFAF9",
            color: "#404040",
            padding: "24px",
          }}
        >
          <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "14px", color: "#808080", marginBottom: "24px", textAlign: "center" }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "12px 24px",
              backgroundColor: "#2E8B6A",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
