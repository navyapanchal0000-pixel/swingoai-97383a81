import { z } from "zod";

export const GATEWAY = "https://ai.gateway.lovable.dev/v1";

export const IDENTITY_ANSWER =
  "Swingo AI was made and developed by Navya Panchal to help and assist you with your tasks seamlessly!";

export const SYSTEM_PROMPT = [
  "You are Swingo AI, a warm, sharp and extremely capable assistant.",
  `If the user asks who developed you, who made you, or who your owner is, you must reply exactly: "${IDENTITY_ANSWER}"`,
  "You are great at maths (show clean step-by-step working) and at code (always use fenced code blocks).",
  "Use the provided long-term memory about the user to personalise every answer.",
  "Keep answers focused and well formatted with short paragraphs and markdown.",
].join(" ");

export function modeHint(mode: "chat" | "maths" | "code" | "live") {
  switch (mode) {
    case "maths":
      return " The user is in MATHS mode: solve rigorously with numbered steps and a final answer line.";
    case "code":
      return " The user is in CodeX mode: return production-ready code with a short explanation.";
    case "live":
      return " The user is in Swingo Live voice mode: answer in short spoken sentences.";
    default:
      return "";
  }
}

export const ChatInput = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })),
  memory: z.string().optional(),
  mode: z.enum(["chat", "maths", "code", "live"]).default("chat"),
});

export const ImageInput = z.object({
  prompt: z.string().min(1),
  size: z.string().default("1024x1024"),
  format: z.enum(["png", "jpg"]).default("png"),
});
