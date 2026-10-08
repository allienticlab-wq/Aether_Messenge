import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { apiRouter } from './server/api.js';
import { wsManager } from './server/websocket.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

async function bootstrap() {
  const app = express();
  const server = http.createServer(app);

  // Body parser
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Mount API endpoints
  app.use('/api', apiRouter);

  // Initialize WebSockets on HTTP server
  wsManager.initialize(server);

  if (!isProd) {
    // Development mode: Mount Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve built static files
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Aether Platform] Unified server running on http://0.0.0.0:${PORT}`);
    console.log(`[Aether Platform] WebSockets active on ws://0.0.0.0:${PORT}/ws`);
  });

  // Dual-port listening resilience for Easypanel / Docker reverse proxies:
  // If Easypanel expects port 80 and PORT is 3000 (or vice versa), bind secondary port so routing NEVER fails
  const secondaryPort = PORT === 80 ? 3000 : 80;
  if (!process.env.DISABLE_SECONDARY_PORT) {
    try {
      const secondaryServer = http.createServer(app);
      wsManager.initialize(secondaryServer);
      secondaryServer.on('error', (err: any) => {
        // Silently ignore if port 80 requires unprivileged permissions or is already bound
        console.log(`[Aether Platform] Secondary port ${secondaryPort} listener skipped (${err.code || err.message}), primary port ${PORT} active.`);
      });
      secondaryServer.listen(secondaryPort, '0.0.0.0', () => {
        console.log(`[Aether Platform] Secondary listener active on http://0.0.0.0:${secondaryPort}`);
      });
    } catch {
      // Ignore
    }
  }
}

bootstrap().catch((err) => {
  console.error('[Aether Platform] Server startup failed:', err);
  process.exit(1);
});
