import React, { useState, useEffect } from "react";

export default function SeatHoldTimer({ expiresAt, onExpire }) {
  const calc = () => Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  const [secondsLeft, setSecondsLeft] = useState(calc);

  useEffect(() => {
    const timer = setInterval(() => {
      const rem = calc();
      setSecondsLeft(rem);
      if (rem <= 0) {
        clearInterval(timer);
        if (onExpire) onExpire();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  const timeString = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  const isCritical = secondsLeft <= 30 && secondsLeft > 0;
  const isExpired = secondsLeft <= 0;

  return (
    <div
      style={{
        padding: "0.75rem 1rem",
        borderRadius: "6px",
        marginBottom: "1rem",
        backgroundColor: isExpired || isCritical ? "rgba(239, 68, 68, 0.15)" : "rgba(56, 189, 248, 0.15)",
        border: `1px solid ${isExpired || isCritical ? "#ef4444" : "#0284c7"}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <strong style={{ color: isExpired || isCritical ? "#f87171" : "#38bdf8" }}>
          {isExpired ? "Seat Hold Expired" : "5-Minute Seat Hold Active"}
        </strong>
        <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
          {isExpired ? "Seats released back to public inventory." : "Complete payment before timer expires."}
        </p>
      </div>
      <div style={{ fontSize: "1.5rem", fontWeight: "700", fontFamily: "monospace", color: isExpired || isCritical ? "#ef4444" : "#38bdf8" }}>
        {timeString}
      </div>
    </div>
  );
}
