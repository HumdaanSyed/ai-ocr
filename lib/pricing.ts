// USD per 1M tokens [input, output], from developers.openai.com/api/docs/pricing (checked 2026-10-23).
const PRICES: Record<string, [number, number]> = {
  "gpt-6.1-sol": [2, 10],
  "gpt-6-sol": [2, 10],
  "gpt-6-luna": [0.1, 0.5],
  "gpt-5.6-sol": [4, 20],
  "gpt-5.4-mini": [0.75, 4.5],
};

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number | null {
  const p = PRICES[model];
  return p ? (inputTokens * p[0] + outputTokens * p[1]) / 1e6 : null;
}
