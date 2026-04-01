import OpenAI from "openai";
import { NextResponse } from "next/server";

type TimelineItem = {
  time: string; // "HH:MM" (24-hour)
  title: string;
  description?: string;
  location?: string;
};

type GenerateResponse = {
  responseText: string;
  timeline: TimelineItem[];
};

function safeExtractJson(text: string): unknown {
  // Some models may wrap JSON in extra text; this tries to recover.
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
  const candidate = text.slice(firstBrace, lastBrace + 1);
  return JSON.parse(candidate);
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Server misconfigured: missing OPENAI_API_KEY." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    const prompt = typeof body?.prompt === "string" ? body.prompt : "";

    if (!prompt.trim()) {
      return NextResponse.json(
        { error: "Missing required field: `prompt`." },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = [
      "You are Spotnana Planner, a helpful travel itinerary planner.",
      "Given the user's prompt (city and up to three interests), generate a full day schedule.",
      "Return STRICTLY valid JSON with EXACTLY these keys: responseText, timeline.",
      "timeline must be an array of items ordered by time.",
      "Each item must contain: time (24-hour HH:MM), title, description, and location.",
      "description should be short (1-3 sentences). location should be a place name or neighborhood.",
      "Make the day run from 09:00 onward with reasonable activity gaps.",
      "Do not include any extra keys and do not wrap the JSON in markdown.",
    ].join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    });

    const content = completion.choices?.[0]?.message?.content ?? "";

    // Preferred path: response is already JSON.
    let parsed: GenerateResponse | null = null;
    try {
      parsed = JSON.parse(content) as GenerateResponse;
    } catch {
      try {
        parsed = safeExtractJson(content) as GenerateResponse | null;
      } catch {
        parsed = null;
      }
    }

    if (!parsed || !Array.isArray(parsed.timeline)) {
      // Fallback: still return something usable for the UI.
      return NextResponse.json(
        {
          responseText: content,
          timeline: [],
        } satisfies GenerateResponse,
        { status: 200 }
      );
    }

    // Minimal shape hardening.
    const timeline = parsed.timeline
      .filter((x) => x && typeof x === "object")
      .map((x) => {
        const record = x as Record<string, unknown>;

        const time = typeof record.time === "string" ? record.time : "";
        const title =
          typeof record.title === "string" ? record.title : "";
        const description =
          typeof record.description === "string"
            ? record.description
            : undefined;
        const location =
          typeof record.location === "string" ? record.location : undefined;

        return { time, title, description, location };
      })
      .filter((x) => x.time && x.title);

    return NextResponse.json({
      responseText:
        typeof parsed.responseText === "string"
          ? parsed.responseText
          : content,
      timeline,
    } satisfies GenerateResponse);
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to generate itinerary.",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

