"use client";

import { useRef, useState } from "react";
import styles from "./page.module.css";

type TimelineItem = {
  time: string;
  title: string;
  description?: string;
  location?: string;
};

const INTEREST_OPTIONS = [
  "Food",
  "Coffee",
  "Museums",
  "Art",
  "Nature",
  "Shopping",
  "Nightlife",
  "History",
  "Family-friendly",
];

export default function Home() {
  const [destination, setDestination] = useState("");
  const [selectedInterest, setSelectedInterest] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [response, setResponse] = useState("");
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Blocks duplicate submits before React re-renders (double-click / Enter spam). */
  const inFlightRef = useRef(false);

  function addInterest(value: string) {
    if (!value) return;
    if (interests.includes(value)) return;
    if (interests.length >= 3) {
      setError("You can select up to 3 interests.");
      return;
    }
    setError(null);
    setInterests((prev) => [...prev, value]);
    setSelectedInterest("");
  }

  function removeInterest(value: string) {
    setInterests((prev) => prev.filter((item) => item !== value));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlightRef.current) return;

    if (!destination.trim()) {
      setError("Please enter a destination.");
      return;
    }

    if (interests.length === 0) {
      setError("Please choose at least 1 interest.");
      return;
    }

    inFlightRef.current = true;

    setError(null);
    setResponse("");
    setTimeline([]);
    setLoading(true);

    try {
      const prompt = `Create a full-day itinerary for ${destination}. Interests: ${interests.join(
        ", "
      )}.`;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const data:
        | {
            error?: string;
            details?: string;
            responseText?: string;
            timeline?: unknown;
          }
        | null = await res.json().catch(() => null);

      if (!res.ok) {
        setError(
          data?.details ||
            data?.error ||
            "Request failed."
        );
        return;
      }

      if (data?.error) {
        setError(data.details || data.error);
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
      inFlightRef.current = false;
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Travel Spotnana</h1>
        <p className={styles.subtitle}>
          Enter a destination and choose up to 3 interests. We will generate a
          recommended day itinerary.
        </p>

        <form
          className={styles.form}
          onSubmit={handleSubmit}
          aria-busy={loading}
        >
          <input
            className={styles.input}
            placeholder="Destination city (e.g., Tokyo)"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />

          <div className={styles.dropdownRow}>
            <select
              className={styles.select}
              value={selectedInterest}
              onChange={(e) => setSelectedInterest(e.target.value)}
            >
              <option value="">Select an interest</option>
              {INTEREST_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => addInterest(selectedInterest)}
              disabled={!selectedInterest || interests.length >= 3}
            >
              Add interest
            </button>
          </div>

          <div className={styles.chipList}>
            {interests.map((interest) => (
              <button
                key={interest}
                type="button"
                className={styles.chip}
                onClick={() => removeInterest(interest)}
                title="Remove interest"
              >
                {interest} ×
              </button>
            ))}
          </div>

          <textarea
            className={styles.textarea}
            placeholder="Optional extra notes for the AI (budget, pace, etc.)"
          />

          <div className={styles.actions}>
            <button
              className={styles.button}
              type="submit"
              disabled={loading}
              aria-disabled={loading}
            >
              {loading ? "Loading…" : "Generate itinerary"}
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
              <div className={styles.responseTitle}>AI Summary</div>
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
