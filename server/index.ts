// Load environment variables from .env file
import 'dotenv/config';

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const setupMiddleware = (app: express.Express) => {
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  
  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let responseBody: Record<string, any> | undefined;

    const originalJson = res.json;
    res.json = function(body, ...args) {
      responseBody = body;
      return originalJson.apply(res, [body, ...args]);
    };

    res.on("finish", () => {
      if (path.startsWith("/api")) {
        const duration = Date.now() - start;
        let logMessage = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        
        if (responseBody) {
          logMessage += ` :: ${JSON.stringify(responseBody)}`;
        }

        log(logMessage.length > 80 ? logMessage.slice(0, 79) + "…" : logMessage);
      }
    });

    next();
  });
};

const startServer = async () => {
  const app = express();
  setupMiddleware(app);

  try {
    const server = registerRoutes(app);

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error: ${message}`);
      res.status(status).json({ message });
    });

    // Set up Vite or static serving
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start server with port fallback
    const PORT = parseInt(process.env.PORT || "5000", 10);
    const listen = (port: number) => {
      server.listen(port, "0.0.0.0", () => {
        log(`Server running on http://localhost:${port}`);
      }).on('error', (e: any) => {
        if (e.code === 'EADDRINUSE') {
          log(`Port ${port} is busy, trying ${port + 1}...`);
          listen(port + 1);
        } else {
          log(`Failed to start server: ${e.message}`);
          process.exit(1);
        }
      });
    };

    listen(PORT);
  } catch (error: any) {
    log(`Fatal error: ${error.message}`);
    process.exit(1);
  }
};

startServer();
