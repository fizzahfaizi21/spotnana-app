"use client";

import { useState } from "react";
import styles from "./page.module.css";

export default function Home() {
  const [prompt, setPrompt] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Step 1: UI only (no API call yet).
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
            <button className={styles.button} type="submit">
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
