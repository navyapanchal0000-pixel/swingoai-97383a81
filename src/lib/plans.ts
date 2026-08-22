export type PlanId = "free" | "pro" | "premium";

export type Plan = {
  id: PlanId;
  name: string;
  price: string;
  priceValue: number;
  chatSeconds: number;
  imageSeconds: number;
  limits: string[];
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free Plan",
    price: "₹0 / Month",
    priceValue: 0,
    chatSeconds: 6,
    imageSeconds: 7.5,
    limits: ["5 images / day", "2 videos / day", "Standard response speed"],
  },
  pro: {
    id: "pro",
    name: "Pro Plan",
    price: "₹69 / Month",
    priceValue: 69,
    chatSeconds: 3,
    imageSeconds: 5,
    limits: ["40 images / day", "15 videos / day", "5 files", "5 PPTs"],
  },
  premium: {
    id: "premium",
    name: "Premium Plan",
    price: "₹99 / Month",
    priceValue: 99,
    chatSeconds: 1.5,
    imageSeconds: 4,
    limits: ["Unlimited images", "Unlimited videos", "Unlimited files & PPTs"],
  },
};

export const PLAN_LIST = [PLANS.free, PLANS.pro, PLANS.premium];

export const MASTER_EMAIL = "navyapanchal0000@gmail.com";
export const MASTER_PASSWORD = "na12vya@ps5";

export const VOICE_TONES = [
  { id: "aurora", label: "Aurora", pitch: 1.1, rate: 1 },
  { id: "nova", label: "Nova", pitch: 1.35, rate: 1.05 },
  { id: "onyx", label: "Onyx", pitch: 0.75, rate: 0.95 },
  { id: "echo", label: "Echo", pitch: 1, rate: 1.15 },
  { id: "sage", label: "Sage", pitch: 0.9, rate: 0.9 },
];
