import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import axios from "axios";
import { Groq } from "groq-sdk";
import { analyzeRequestSchema, type AnalyzeResponse } from "@shared/schema";

// API Keys from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// Initialize Groq client
const groq = new Groq({
  apiKey: GROQ_API_KEY,
});

export function registerRoutes(app: Express): Server {
  app.post('/api/analyze', async (req, res) => {
    try {
      const { text } = analyzeRequestSchema.parse(req.body);

      // Phase 1: Initial Analysis by all models
      const [geminiInitial, groqInitial, deepseekInitial] = await Promise.all([
        // 1. Gemini Initial Analysis
        axios.post(
          `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
          {
            contents: [{
              parts: [{ text: `Analyze the following text and provide detailed insights:\n\n${text}` }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024,
            }
          }
        ),

        // 2. Groq Initial Analysis
        groq.chat.completions.create({
          messages: [{ 
            role: 'user', 
            content: `Analyze the following text and provide detailed insights:\n\n${text}` 
          }],
          model: "llama-3.3-70b-versatile",
          temperature: 0.7,
          max_tokens: 1024,
        }),

        // 3. Deepseek Initial Analysis
        axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: 'deepseek/deepseek-r1-distill-llama-70b:free',
            messages: [{ 
              role: 'user', 
              content: `Analyze the following text and provide detailed insights:\n\n${text}` 
            }],
          },
          {
            headers: {
              Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        )
      ]);

      const initialResults = {
        gemini: geminiInitial.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response',
        groq: groqInitial.choices[0]?.message?.content || 'No response',
        deepseek: deepseekInitial.data.choices?.[0]?.message?.content || 'No response',
      };

      // Phase 2: Systems Engineering Analysis (Gemini)
      const systemsEngPrompt = `You are a systems engineer with 30 years of experience. Review these analyses and categorize the requirements into functional and non-functional categories according to INCOSE standards:

Initial Analyses:
${Object.entries(initialResults).map(([model, analysis]) => `
### ${model.toUpperCase()} Analysis
${analysis}
`).join('\n')}`;

      const systemsEngResponse = await axios.post(
        `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [{ parts: [{ text: systemsEngPrompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
        }
      );

      // Phase 3: Design Engineering Review (Groq)
      const designEngPrompt = `You are a senior design engineer with 30 years of experience. Review these requirements and analyze them for design constraints (legal, physical, chemical, etc.):

${systemsEngResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No systems engineering analysis available'}`;

      const designEngResponse = await groq.chat.completions.create({
        messages: [{ role: 'user', content: designEngPrompt }],
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 1024,
      });

      // Phase 4: Product Management Summary (Deepseek)
      const pmPrompt = `You are a senior product manager with 30 years of experience. Create a formal document summarizing all the analyses:

Systems Engineering Analysis:
${systemsEngResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis'}

Design Engineering Review:
${designEngResponse.choices[0]?.message?.content || 'No review'}`;

      const pmResponse = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'deepseek/deepseek-r1-distill-llama-70b:free',
          messages: [{ role: 'user', content: pmPrompt }],
        },
        {
          headers: {
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Format final response with collapsible sections
      const finalAnalysis = `
## Initial Analyses
<details>
<summary>Gemini Analysis</summary>

${initialResults.gemini}
</details>

<details>
<summary>Groq Analysis</summary>

${initialResults.groq}
</details>

<details>
<summary>Deepseek Analysis</summary>

${initialResults.deepseek}
</details>

## Systems Engineering Analysis
<details>
<summary>Functional and Non-Functional Requirements (INCOSE)</summary>

${systemsEngResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis'}
</details>

## Design Engineering Review
<details>
<summary>Design Constraints and Limitations</summary>

${designEngResponse.choices[0]?.message?.content || 'No review'}
</details>

## Final Product Requirements Document
<details>
<summary>Formal Documentation</summary>

${pmResponse.data.choices?.[0]?.message?.content || 'No summary'}
</details>`;

      // Store the analysis in the database
      await storage.createAnalysis({
        inputText: text,
        geminiResponse: initialResults.gemini,
        groqResponse: initialResults.groq,
        deepseekResponse: initialResults.deepseek,
        finalAnalysis,
      });

      const response: AnalyzeResponse = {
        results: initialResults,
        finalAnalysis,
      };

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