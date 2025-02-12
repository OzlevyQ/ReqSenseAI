import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Request/Response types
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

// Database schema
export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  inputText: text("input_text").notNull(),
  geminiResponse: text("gemini_response").notNull(),
  groqResponse: text("groq_response").notNull(),
  deepseekResponse: text("deepseek_response").notNull(),
  finalAnalysis: text("final_analysis").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAnalysisSchema = createInsertSchema(analyses).omit({
  id: true,
  createdAt: true,
});

export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;