import { STEPHANUS_SRC } from "./grammar.ts";

const STEPHANUS = new RegExp(`^${STEPHANUS_SRC}$`);
const ASK = /^(\d+)([a-e]?)$/;

export interface StephanusSought { kind: "number" | "page"; asked: string; page: string }
export type StephanusAsk = { kind: "nothing" } | { kind: "notANumber"; typed: string } | StephanusSought;

export const isStephanus = (label: string): boolean => STEPHANUS.test(label);
export const stephanusPage = (n: string): string => /^\d+/.exec(n)![0];

export function askedStephanus(typed: string): StephanusAsk {
  const t = typed.trim(), asked = t.toLowerCase();
  if (!asked) return { kind: "nothing" };
  const m = ASK.exec(asked);
  if (!m) return { kind: "notANumber", typed: t };
  return { kind: m[2] ? "number" : "page", asked, page: m[1] };
}

export function stephanusRun(from: string, to?: string | null): string {
  if (!to || from === to) return from;
  return from + "-" + (stephanusPage(from) === stephanusPage(to) ? to.slice(-1) : to);
}
