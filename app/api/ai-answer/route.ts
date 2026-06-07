import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: Request) {
  const { question } = await req.json();

  if (!question?.trim()) {
    return Response.json({ error: "No question provided" }, { status: 400 });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are a helpful assistant. Answer this question clearly and concisely:\n\n${question}`,
    });

    const text = response.text;
    return Response.json({ answer: text });
  } catch (err: any) {
    return Response.json({ error: err.message ?? "AI error" }, { status: 500 });
  }
}