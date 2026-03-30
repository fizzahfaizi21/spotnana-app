"use client";

import { useState } from "react";
import styles from "./page.module.css";

type TimelineItem = {
  time: string;
  title: string;
  description?: string;
  location?: string;
};

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!prompt.trim()) {
      setError("Please enter a prompt.");
      return;
    }

    setError(null);
    setResponse("");
    setTimeline([]);
    setLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const data:
        | { error?: string; responseText?: string; timeline?: unknown }
        | null = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Request failed.");
        return;
      }

      if (data?.error) {
        setError(data.error);
        return;
      }

      setResponse(typeof data?.responseText === "string" ? data.responseText : "");

      if (Array.isArray(data?.timeline)) {
        // Harden the payload for UI rendering.
        const items: TimelineItem[] = data.timeline
          .filter((x) => x && typeof x === "object")
          .map((x) => {
            const record = x as Record<string, unknown>;
            return {
              time: typeof record.time === "string" ? record.time : "",
              title: typeof record.title === "string" ? record.title : "",
              description:
                typeof record.description === "string"
                  ? record.description
                  : undefined,
              location:
                typeof record.location === "string"
                  ? record.location
                  : undefined,
            };
          })
          .filter((x) => x.time && x.title);
        setTimeline(items);
      } else {
        setTimeline([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>AI Prompt</h1>

        <form className={styles.form} onSubmit={handleSubmit}>
          <textarea
            className={styles.textarea}
            placeholder="Type your prompt..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />

          <div className={styles.actions}>
            <button className={styles.button} type="submit" disabled={loading}>
              Submit
            </button>
          </div>
        </form>

        <div className={styles.statusRow} aria-live="polite">
          {loading ? (
            <div className={styles.loadingRow}>
              <div className={styles.spinner} aria-hidden="true" />
              <div className={styles.loadingText}>Loading...</div>
            </div>
          ) : null}

          {error ? <div className={styles.error}>{error}</div> : null}

          {response ? (
            <div className={styles.responseBox}>
              <div className={styles.responseTitle}>Response</div>
              <div className={styles.responseText}>{response}</div>
            </div>
          ) : null}

          {timeline.length > 0 ? (
            <div className={styles.timelineBox}>
              <div className={styles.timelineHeader}>Day timeline</div>
              <div className={styles.timelineList}>
                {timeline.map((item) => (
                  <div key={`${item.time}-${item.title}`} className={styles.timelineItem}>
                    <div className={styles.timelineTime}>{item.time}</div>
                    <div className={styles.timelineTitle}>{item.title}</div>
                    {(item.description || item.location) ? (
                      <div className={styles.timelineMeta}>
                        {item.description ? item.description : null}
                        {item.description && item.location ? " " : null}
                        {item.location ? `(${item.location})` : null}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
