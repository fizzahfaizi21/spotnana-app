"use client";

import { useState } from "react";
import styles from "./page.module.css";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!prompt.trim()) {
      setError("Please enter a prompt.");
      return;
    }

    setError(null);
    setResponse("");
    setLoading(true);

    // Step 2: State management only.
    // We intentionally do NOT call any AI provider here yet.
    setTimeout(() => {
      setLoading(false);
      setError("AI generation not implemented yet. We'll wire the API in the next step.");
    }, 600);
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
        </div>
      </div>
    </div>
  );
}
