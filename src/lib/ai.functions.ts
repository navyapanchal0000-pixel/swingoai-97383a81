import { createServerFn } from "@tanstack/react-start";
import { ChatInput, GATEWAY, ImageInput, SYSTEM_PROMPT, modeHint } from "./ai-prompts";

export const askSwingo = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ChatInput.parse(data))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured yet.");

    const system =
      SYSTEM_PROMPT +
      modeHint(data.mode) +
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

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { text: json.choices?.[0]?.message?.content ?? "" };
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
