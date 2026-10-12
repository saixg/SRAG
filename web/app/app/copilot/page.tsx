"use client";

import { useEffect } from "react";
import { useCopilot } from "@/lib/copilot";

export default function CopilotPage() {
  const setOpen = useCopilot((state) => state.setOpen);
  const setExpanded = useCopilot((state) => state.setExpanded);
  useEffect(() => {
    setOpen(true);
    setExpanded(true);
  }, [setOpen, setExpanded]);
  return (
    <section className="wrap">
      <p className="muted">Copilot</p>
      <h1>Full-screen Copilot.</h1>
      <p>Same panel, more room. Press Ctrl or Cmd + K to toggle it.</p>
    </section>
  );
}
