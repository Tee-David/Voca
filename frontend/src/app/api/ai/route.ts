import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

type AiTask = "summarize" | "recap" | "ask" | "quiz";

interface AiRequestBody {
  task: AiTask;
  context: string;           // book/chapter text
  question?: string;         // for "ask" task
  chapterTitle?: string;
}

const SYSTEM_PROMPTS: Record<AiTask, string> = {
  summarize: `You are a concise literary analyst. Summarize the given text in 3-5 paragraphs, capturing key themes, plot points, and character developments. Use clear, engaging language.`,
  recap: `You are a helpful reading assistant. Write a brief 2-3 sentence recap of what happened in this chapter, as if reminding a reader who is picking the book back up. Be concise and spoiler-conscious.`,
  ask: `You are a knowledgeable reading companion. Answer questions about the provided text accurately and helpfully. Cite specific passages when relevant. If the answer isn't in the text, say so honestly.`,
  quiz: `You are an educational content creator. Generate exactly 5 multiple choice questions based on the provided text. Each question tests comprehension of key events, characters, or themes.

Return ONLY valid JSON in this exact format, no other text:
[
  {
    "question": "...",
    "choices": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "answer": 0,
    "explanation": "..."
  }
]`,
};

function truncateContext(text: string, maxChars = 12000): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n\n[...text truncated for context window...]";
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!GROQ_API_KEY) {
    return NextResponse.json(
      { error: "Groq API key not configured. Set GROQ_API_KEY in .env" },
      { status: 503 }
    );
  }

  const body: AiRequestBody = await req.json();
  const { task, context, question, chapterTitle } = body;

  if (!task || !context) {
    return NextResponse.json(
      { error: "Missing required fields: task, context" },
      { status: 400 }
    );
  }

  if (!SYSTEM_PROMPTS[task]) {
    return NextResponse.json({ error: `Unknown task: ${task}` }, { status: 400 });
  }

  const systemPrompt = SYSTEM_PROMPTS[task];
  const truncated = truncateContext(context);

  let userMessage = "";
  switch (task) {
    case "summarize":
      userMessage = `Please summarize the following text:\n\n${truncated}`;
      break;
    case "recap":
      userMessage = chapterTitle
        ? `Recap chapter "${chapterTitle}":\n\n${truncated}`
        : `Recap the following chapter:\n\n${truncated}`;
      break;
    case "ask":
      userMessage = `Context from the book:\n\n${truncated}\n\nQuestion: ${question || "What is this about?"}`;
      break;
    case "quiz":
      userMessage = `Generate 5 multiple choice questions from this text:\n\n${truncated}`;
      break;
  }

  try {
    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: task === "quiz" ? 0.3 : 0.5,
        max_tokens: task === "quiz" ? 2000 : 1024,
      }),
    });

    if (!groqRes.ok) {
      const errBody = await groqRes.text();
      console.error("Groq API error:", groqRes.status, errBody);
      return NextResponse.json(
        { error: `Groq API error: ${groqRes.status}` },
        { status: 502 }
      );
    }

    const groqData = await groqRes.json();
    const content = groqData.choices?.[0]?.message?.content ?? "";

    // For quiz, attempt to parse JSON
    if (task === "quiz") {
      try {
        // Extract JSON array from the response (handle markdown code fences)
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const questions = JSON.parse(jsonMatch[0]);
          return NextResponse.json({ task, result: questions });
        }
      } catch {
        // If JSON parsing fails, return raw text
      }
    }

    return NextResponse.json({
      task,
      result: content,
      model: groqData.model,
      usage: groqData.usage,
    });
  } catch (error: any) {
    console.error("Groq request failed:", error);
    return NextResponse.json(
      { error: "Failed to reach Groq API" },
      { status: 502 }
    );
  }
}
