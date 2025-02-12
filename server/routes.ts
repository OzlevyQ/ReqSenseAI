import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import axios from "axios";
import { analyzeRequestSchema, type AnalyzeResponse } from "@shared/schema";

// API Keys
const GEMINI_API_KEY = 'AIzaSyDQUQfKvQJ5FCVFBXe5YGDMKTjcBSi06SQ';
const GROQ_API_KEY = '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';
const DEEPSEEK_API_KEY = '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';

export function registerRoutes(app: Express): Server {
  app.post('/api/analyze', async (req, res) => {
    try {
      const { text } = analyzeRequestSchema.parse(req.body);

      // 1. Call Gemini API
      const geminiResponse = await axios.post(
        'https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generateText',
        {
          prompt: { text },
          temperature: 1,
          candidateCount: 1,
          maxOutputTokens: 1024,
        },
        {
          headers: { Authorization: `Bearer ${GEMINI_API_KEY}` },
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

      // Combine results
      const results = {
        gemini: geminiResponse.data.candidates[0]?.output || 'No response from Gemini',
        groq: groqResponse.data.choices[0]?.message?.content || 'No response from Groq',
        deepseek: deepseekResponse.data.choices[0]?.message?.content || 'No response from Deepseek',
      };

      const finalAnalysis = `### Analysis Results ###\n
      - **Gemini**: ${results.gemini}\n
      - **Groq**: ${results.groq}\n
      - **Deepseek**: ${results.deepseek}`;

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

  const httpServer = createServer(app);
  return httpServer;
}
