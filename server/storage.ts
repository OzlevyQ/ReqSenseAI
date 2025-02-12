import { db } from "./db";
import { analyses, type Analysis, type InsertAnalysis } from "@shared/schema";
import { desc } from "drizzle-orm";

export interface IStorage {
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  getRecentAnalyses(limit?: number): Promise<Analysis[]>;
}

export class DatabaseStorage implements IStorage {
  async createAnalysis(analysis: InsertAnalysis): Promise<Analysis> {
    const [result] = await db.insert(analyses).values(analysis).returning();
    return result;
  }

  async getRecentAnalyses(limit = 10): Promise<Analysis[]> {
    return db
      .select()
      .from(analyses)
      .orderBy(desc(analyses.createdAt))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();