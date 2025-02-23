import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { log } from "./vite";
import * as dotenv from "dotenv";
import cors from "cors";

<<<<<<< HEAD
// Load environment variables first
=======
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

>>>>>>> e5af3a781ffa5e0b14aad8da645358985f60a29d
dotenv.config();

const app = express();

<<<<<<< HEAD
// Add CORS middleware
app.use(
  cors({
    origin: "*", // Your Vite dev server URL
    methods: ["GET", "POST"],
    credentials: true,
  })
);
=======
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  credentials: true,
}));
>>>>>>> e5af3a781ffa5e0b14aad8da645358985f60a29d

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
  // Serve the "public" folder in addition
app.use(express.static("dist"));

<<<<<<< HEAD
=======
// הוספת middleware להגשת קבצים סטטיים
app.use(express.static(path.join(__dirname, '../dist')));

// Route דינמי שמחזיר את index.html לכל בקשה שלא מתחילה ב-/api
app.get('*', (req: Request, res: Response) => {
  // אם זו לא בקשת API
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  }
});

>>>>>>> e5af3a781ffa5e0b14aad8da645358985f60a29d
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
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
  const server = registerRoutes(app);

<<<<<<< HEAD
  app.use(
    (err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      throw err;
    }
  );

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }


  const PORT = 5000;
=======
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    log(`Error: ${message}`);
  });

  const PORT = process.env.PORT || 5000;
>>>>>>> e5af3a781ffa5e0b14aad8da645358985f60a29d
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
})();
