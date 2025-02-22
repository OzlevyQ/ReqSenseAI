import express, { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import * as dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// הגדרת __dirname עבור ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// טעינת משתני סביבה
dotenv.config();

const app = express();

// הגדרת CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  })
);

// ניתוח JSON ונתונים מקודדים ב-URL
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// הגדרת נתיב לקבצים סטטיים מתוך תיקיית "dist"
app.use(express.static(path.join(__dirname, "dist")));

// נתיב מפורש לקובץ Service Worker
app.get("/service-worker.js", (req: Request, res: Response) => {
  res.sendFile(path.resolve(__dirname, "dist", "index.html"));
});

// נתיב חלופי לתיקון בקשות עם "undefined" בנתיב (עוקף בעיה אפשרית בצד הלקוח)
app.get("/undefined/service-worker.js", (req: Request, res: Response) => {
  res.redirect("/service-worker.js");
});

// Middleware לוגינג לבקשות API
app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    capturedJsonResponse = body;
    return originalJson(body);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  // רישום נתיבי ה-API
  const server = registerRoutes(app);

  // Middleware לטיפול בטעויות - צריך להיות בסוף השרשרת
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    log(`Error: ${message}`);
    // לא מזרקים את השגיאה לאחר שליחת התגובה
  });

  // הגדרת Vite במצב פיתוח או הגשת קבצים סטטיים בפרודקשן
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`Server is running on port ${PORT}`);
  });
})();
