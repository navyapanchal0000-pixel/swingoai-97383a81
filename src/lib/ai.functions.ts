import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

const IDENTITY =
  "Swingo AI was made and developed by Navya Panchal to help and assist you with your tasks seamlessly!";

const SYSTEM_PROMPT = [
  "You are Swingo AI, a warm, sharp and extremely capable assistant.",
  `If the user asks who developed you, who made you, or who your owner is, you must reply exactly: "${IDENTITY}"`,
  "You are great at maths (show clean step-by-step working) and at code (always use fenced code blocks).",
  "Use the provided long-term memory about the user to personalise every answer.",
  "Keep answers focused and well formatted with short paragraphs and markdown.",
].join(" ");

const ChatInput = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })),
  memory: z.string().optional(),
  mode: z.enum(["chat", "maths", "code", "live"]).default("chat"),
});

export const askSwingo = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ChatInput.parse(data))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured yet.");

    const modeHint =
      data.mode === "maths"
        ? " The user is in MATHS mode: solve rigorously with numbered steps and a final boxed answer line."
        : data.mode === "code"
          ? " The user is in CodeX mode: return production-ready code with a short explanation."
          : data.mode === "live"
            ? " The user is in Swingo Live voice mode: answer in short spoken sentences."
            : "";

    const system =
      SYSTEM_PROMPT +
      modeHint +
      (data.memory ? `\n\nLong-term memory about this user:\n${data.memory}` : "");

    const res = await fetch(`${GATEWAY}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        reasoning_effort: "none",
        messages: [{ role: "system", content: system }, ...data.messages],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("Swingo is busy right now. Please retry in a moment.");
      if (res.status === 402) throw new Error("AI credits are exhausted. Please top up to continue.");
      throw new Error(`Swingo could not answer (${res.status}). ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return { text: json.choices?.[0]?.message?.content ?? "" };
  });

const ImageInput = z.object({
  prompt: z.string().min(1),
  size: z.string().default("1024x1024"),
  format: z.enum(["png", "jpg"]).default("png"),
});

export const generateSwingoImage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ImageInput.parse(data))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured yet.");

    const res = await fetch(`${GATEWAY}/images/generations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "openai/gpt-image-1-mini",
        prompt: data.prompt,
        size: data.size,
        n: 1,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 402) throw new Error("AI credits are exhausted. Please top up to continue.");
      throw new Error(`Image generation failed (${res.status}). ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as { data?: { b64_json?: string; url?: string }[] };
    const first = json.data?.[0];
    const mime = data.format === "jpg" ? "image/jpeg" : "image/png";
    const url = first?.b64_json ? `data:${mime};base64,${first.b64_json}` : (first?.url ?? "");
    if (!url) throw new Error("Swingo could not create that image.");
    return { url };
  });
