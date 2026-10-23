import type { OcrResult } from "./schema";

// One JSON object per line (NDJSON) streamed from /api/ocr.
export type StepId = "upload" | "optimize" | "server" | "extract" | "verify";
export type StepStatus = "pending" | "running" | "done" | "error";

export type Stats = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  ms: number;
  costUsd: number | null;
};

export type OcrEvent =
  | { type: "step"; id: StepId; status: StepStatus; ms?: number; detail?: string }
  | { type: "result"; result: OcrResult; stats: Stats }
  | { type: "error"; message: string };

export const MAX_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
