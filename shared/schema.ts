import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const analyzeRequestSchema = z.object({
  text: z.string().min(1, "Text is required").max(5000, "Text too long")
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

export type AnalyzeResponse = {
  results: {
    gemini: string;
    groq: string;
    deepseek: string;
  };
  finalAnalysis: string;
};
