import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // data/premium-history/*.jsonl is read at runtime via fs, not imported —
  // Next's static trace analysis won't pick it up on its own, so the stock
  // page's serverless bundle would silently be missing it on Vercel without
  // this. See CLAUDE.md §8.
  outputFileTracingIncludes: {
    "/stock/*": ["./data/premium-history/**/*"],
  },
};

export default nextConfig;
