import { VOICE_TONES } from "./plans";

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speak(text: string, toneId: string, onEnd?: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const tone = VOICE_TONES.find((t) => t.id === toneId) ?? VOICE_TONES[0];
  const u = new SpeechSynthesisUtterance(text);
  u.pitch = tone.pitch;
  u.rate = tone.rate;
  u.onend = () => {
    currentUtterance = null;
    onEnd?.();
  };
  currentUtterance = u;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  currentUtterance = null;
}

export const isSpeaking = () => currentUtterance !== null;
