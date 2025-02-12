import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import axios from "axios";
import { analyzeRequestSchema, type AnalyzeResponse } from "@shared/schema";

// API Keys from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

export function registerRoutes(app: Express): Server {
  app.post('/api/analyze', async (req, res) => {
    try {
      const { text } = analyzeRequestSchema.parse(req.body);

      // 1. Call Gemini API
      const geminiResponse = await axios.post(
        `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [
            {
              parts: [
                {
                  text: text
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          }
        }
      );

      // 2. Call Groq API
      const groqResponse = await axios.post(
        'https://api.groq.ai/chat/completions',
        {
          messages: [{ role: 'user', content: text }],
          model: 'llama-3.3-70b-versatile',
          temperature: 1,
          max_completion_tokens: 1024,
          top_p: 1,
        },
        {
          headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
        }
      );

      // 3. Call Deepseek API
      const deepseekResponse = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'deepseek/deepseek-r1-distill-llama-70b:free',
          messages: [{ role: 'user', content: text }],
        },
        {
          headers: {
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Extract responses with proper error handling
      const results = {
        gemini: geminiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini',
        groq: groqResponse.data.choices?.[0]?.message?.content || 'No response from Groq',
        deepseek: deepseekResponse.data.choices?.[0]?.message?.content || 'No response from Deepseek',
      };

      const finalAnalysis = `### Analysis Results ###\n
      - **Gemini**: ${results.gemini}\n
      - **Groq**: ${results.groq}\n
      - **Deepseek**: ${results.deepseek}`;

      // Store the analysis in the database
      await storage.createAnalysis({
        inputText: text,
        geminiResponse: results.gemini,
        groqResponse: results.groq,
        deepseekResponse: results.deepseek,
        finalAnalysis,
      });

      const response: AnalyzeResponse = { results, finalAnalysis };
      res.json(response);

    } catch (error: any) {
      console.error('Error:', error.response?.data || error.message);
      res.status(500).json({ 
        error: "Error analyzing text",
        details: error.response?.data?.error || error.message 
      });
    }
  });

  // Get recent analyses
  app.get('/api/analyses', async (_req, res) => {
    try {
      const analyses = await storage.getRecentAnalyses();
      res.json(analyses);
    } catch (error: any) {
      console.error('Error fetching analyses:', error);
      res.status(500).json({ error: "Error fetching analyses" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}