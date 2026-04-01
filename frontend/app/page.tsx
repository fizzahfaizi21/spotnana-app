"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./page.module.css";
import {
  type ChatHistoryEntry,
  clearChatHistoryStorage,
  loadChatHistory,
  MAX_CHAT_HISTORY_ENTRIES,
  type TimelineItem,
  saveChatHistory,
} from "../lib/chatHistory";

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

// Helper function to parse timeline data from API response
function parseTimelineData(timelineData: unknown): TimelineItem[] {
  if (!Array.isArray(timelineData)) return [];
  return timelineData
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
}

// Main component for the Spotnana Planner page
export default function Home() {
  // State variables for form inputs and UI state
  const [destination, setDestination] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedInterest, setSelectedInterest] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [response, setResponse] = useState("");
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [history, setHistory] = useState<ChatHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Blocks duplicate submits before React re-renders (double-click / Enter spam). */
  const inFlightRef = useRef(false);

  // Load chat history on component mount
  useEffect(() => {
    setHistory(loadChatHistory());
  }, []);

  // Function to add an interest to the list, with validation
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

  // Function to remove an interest from the list
  function removeInterest(value: string) {
    setInterests((prev) => prev.filter((item) => item !== value));
  }

  // Async function to handle form submission and generate itinerary
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
      let prompt = `Create a full-day itinerary for ${destination.trim()}. Interests: ${interests.join(
        ", "
      )}.`;
      if (notes.trim()) {
        prompt += ` Additional notes: ${notes.trim()}`;
      }

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

      const responseText =
        typeof data?.responseText === "string" ? data.responseText : "";
      setResponse(responseText);

      const items = parseTimelineData(data?.timeline);
      setTimeline(items);

      const entry: ChatHistoryEntry = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        destination: destination.trim(),
        interests: [...interests],
        notes: notes.trim() || undefined,
        responseText,
        timeline: items,
      };
      setHistory((prev) => {
        const next = [entry, ...prev].slice(0, MAX_CHAT_HISTORY_ENTRIES);
        saveChatHistory(next);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }

  // Function to apply a history entry to the current state
  function applyHistoryEntry(entry: ChatHistoryEntry) {
    setDestination(entry.destination);
    setInterests([...entry.interests]);
    setNotes(entry.notes ?? "");
    setResponse(entry.responseText);
    setTimeline(entry.timeline);
    setError(null);
  }

  // Function to clear all state and history
  function handleClear() {
    if (loading) return;
    setResponse("");
    setTimeline([]);
    setError(null);
    setHistory([]);
    clearChatHistoryStorage();
    setDestination("");
    setNotes("");
    setInterests([]);
    setSelectedInterest("");
  }

  // Render the main UI
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Spotnana Planner</h1>
        <p className={styles.subtitle}>
          Enter a destination and choose up to 3 interests. We will generate a
          recommended day itinerary.
        </p>

        {/* Form: destination, interests, notes */}
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
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.clearButton}
              onClick={handleClear}
              disabled={loading}
              aria-label="Clear response and chat history"
            >
              Clear
            </button>
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

        {/* Loading, errors, AI summary, timeline */}
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

        {/* Past itineraries from localStorage */}
        {history.length > 0 ? (
          <section className={styles.historySection} aria-label="Past itineraries">
            <div className={styles.historyHeader}>
              <h2 className={styles.historyTitle}>Past itineraries</h2>
            </div>
            <ul className={styles.historyList}>
              {history.map((entry) => (
                <li key={entry.id} className={styles.historyItem}>
                  <button
                    type="button"
                    className={styles.historyItemButton}
                    onClick={() => applyHistoryEntry(entry)}
                  >
                    <span className={styles.historyItemMeta}>
                      {new Date(entry.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                    <span className={styles.historyItemDestination}>
                      {entry.destination}
                    </span>
                    <span className={styles.historyItemInterests}>
                      {entry.interests.join(" · ")}
                    </span>
                    <span className={styles.historyItemPreview}>
                      {entry.responseText.slice(0, 120)}
                      {entry.responseText.length > 120 ? "…" : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
