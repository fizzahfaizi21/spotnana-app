export const CHAT_HISTORY_STORAGE_KEY = "spotnana-chat-history";
export const MAX_CHAT_HISTORY_ENTRIES = 50;

export type TimelineItem = {
  time: string;
  title: string;
  description?: string;
  location?: string;
};

export type ChatHistoryEntry = {
  id: string;
  createdAt: string;
  destination: string;
  interests: string[];
  notes?: string;
  responseText: string;
  timeline: TimelineItem[];
};

function isTimelineItem(x: unknown): x is TimelineItem {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.time === "string" && typeof o.title === "string";
}

function isEntry(x: unknown): x is ChatHistoryEntry {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.createdAt !== "string") return false;
  if (typeof o.destination !== "string") return false;
  if (!Array.isArray(o.interests)) return false;
  if (typeof o.responseText !== "string") return false;
  if (!Array.isArray(o.timeline)) return false;
  if (!o.interests.every((i) => typeof i === "string")) return false;
  if (!o.timeline.every(isTimelineItem)) return false;
  if (o.notes !== undefined && typeof o.notes !== "string") return false;
  return true;
}

export function loadChatHistory(): ChatHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry);
  } catch {
    return [];
  }
}

export function saveChatHistory(entries: ChatHistoryEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CHAT_HISTORY_STORAGE_KEY,
      JSON.stringify(entries.slice(0, MAX_CHAT_HISTORY_ENTRIES))
    );
  } catch {
    // ignore quota / private mode
  }
}

export function clearChatHistoryStorage(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CHAT_HISTORY_STORAGE_KEY);
  } catch {
    // ignore
  }
}
