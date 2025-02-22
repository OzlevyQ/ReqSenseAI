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

      // Enable streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Helper function to send updates
      const sendUpdate = (phase: string, content: string) => {
        res.write(`data: ${JSON.stringify({ phase, content })}\n\n`);
      };

      // Phase 1: Initial Analysis by all models
      sendUpdate("start", "Starting analysis...");

      // 1. Gemini Initial Analysis
      const geminiPrompt = `Analyze the following text and provide detailed insights:\n\n${text}`;
      sendUpdate("gemini-prompt", geminiPrompt);

      const geminiResponse = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [{
            parts: [{ text: geminiPrompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          }
        }
      );
      const geminiResult = geminiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
      sendUpdate("gemini-response", geminiResult);

      // 2. Groq Initial Analysis
      const groqPrompt = `Analyze the following text and provide detailed insights:\n\n${text}`;
      sendUpdate("groq-prompt", groqPrompt);

      const groqCompletion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: groqPrompt }],
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 1024,
      });
      const groqResult = groqCompletion.choices[0]?.message?.content || 'No response';
      sendUpdate("groq-response", groqResult);

      // 3. Deepseek Initial Analysis
      const deepseekPrompt = `Analyze the following text and provide detailed insights:\n\n${text}`;
      sendUpdate("deepseek-prompt", deepseekPrompt);

      const deepseekResponse = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'deepseek/deepseek-r1-distill-llama-70b:free',
          messages: [{ role: 'user', content: deepseekPrompt }],
        },
        {
          headers: {
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const deepseekResult = deepseekResponse.data.choices?.[0]?.message?.content || 'No response';
      sendUpdate("deepseek-response", deepseekResult);

      // Phase 2: Systems Engineering Analysis
      const systemsEngPrompt = `You are a systems engineer with 30 years of experience. Review these analyses and categorize the requirements into functional and non-functional categories according to INCOSE standards:\n\nAnalyses:\n${geminiResult}\n${groqResult}\n${deepseekResult}`;
      sendUpdate("systems-eng-prompt", systemsEngPrompt);

      const systemsEngResponse = await axios.post(
        `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [{ parts: [{ text: systemsEngPrompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
        }
      );
      const systemsEngResult = systemsEngResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis';
      sendUpdate("systems-eng-response", systemsEngResult);

      // Phase 3: Design Engineering Review
      const designEngPrompt = `You are a senior design engineer with 30 years of experience. Review these requirements and analyze them for design constraints (legal, physical, chemical, etc.):\n\n${systemsEngResult}`;
      sendUpdate("design-eng-prompt", designEngPrompt);

      const designEngResponse = await groq.chat.completions.create({
        messages: [{ role: 'user', content: designEngPrompt }],
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 1024,
      });
      const designEngResult = designEngResponse.choices[0]?.message?.content || 'No review';
      sendUpdate("design-eng-response", designEngResult);

      // Phase 4: Product Management Summary
      const pmPrompt = `You are a senior product manager with 30 years of experience. Create a formal document summarizing all the analyses:\n\n${systemsEngResult}\n\n${designEngResult}`;
      sendUpdate("pm-prompt", pmPrompt);

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
      const pmResult = pmResponse.data.choices?.[0]?.message?.content || 'No summary';
      sendUpdate("pm-response", pmResult);

      // Store the complete analysis
      await storage.createAnalysis({
        inputText: text,
        geminiResponse: geminiResult,
        groqResponse: groqResult,
        deepseekResponse: deepseekResult,
        finalAnalysis: `# Complete Analysis Document\n\n${systemsEngResult}\n\n${designEngResult}\n\n${pmResult}`,
      });

      sendUpdate("complete", "Analysis complete");
      res.end();

    } catch (error: any) {
      console.error('Error:', error.response?.data || error.message);
      res.write(`data: ${JSON.stringify({
        phase: "error",
        content: error.response?.data?.error || error.message
      })}\n\n`);
      res.end();
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

  app.get('/api/download-report/:analysisId', async (req, res) => {
    try {
      const analysis = await storage.getAnalysis(req.params.analysisId);
      if (!analysis) {
        return res.status(404).json({ error: 'Analysis not found' });
      }

      const { Document, Paragraph, TextRun } = require('docx');

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "Requirements Analysis Report", bold: true, size: 32 }),
              ],
            }),
            new Paragraph({
              text: "",
            }),
            new Paragraph({
              children: [new TextRun({ text: analysis.finalAnalysis })],
            }),
          ],
        }],
      });

      const buffer = await Packer.toBuffer(doc);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', 'attachment; filename=analysis-report.docx');
      res.send(buffer);
    } catch (error) {
      console.error('Error generating report:', error);
      res.status(500).json({ error: 'Error generating report' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}