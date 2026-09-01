import type { Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { COOKIE_NAME, verifyToken } from './auth';

const clients = new Map<string, Set<WebSocket>>();

function parseCookies(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  header.split(';').forEach(part => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  });
  return out;
}

export function initWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    // Browsers can't set custom headers on a WebSocket handshake, so cookies
    // are the default path — but cross-site cookies are unreliable on some
    // mobile browsers, so also accept a token passed as a query param.
    const cookies = parseCookies(req.headers.cookie ?? '');
    const url = new URL(req.url ?? '', 'http://localhost');
    const token = cookies[COOKIE_NAME] ?? url.searchParams.get('token') ?? undefined;
    if (!token) {
      ws.close(1008, 'Unauthorized');
      return;
    }

    let userId: string;
    try {
      userId = verifyToken(token).userId;
    } catch {
      ws.close(1008, 'Unauthorized');
      return;
    }

    if (!clients.has(userId)) {
      clients.set(userId, new Set());
    }
    clients.get(userId)!.add(ws);

    ws.on('close', () => {
      const sockets = clients.get(userId);
      sockets?.delete(ws);
      if (sockets && sockets.size === 0) {
        clients.delete(userId);
      }
    });
  });

  return wss;
}

export function pushToUser(userId: string, payload: unknown) {
  const sockets = clients.get(userId);
  if (!sockets || sockets.size === 0) return;
  const data = JSON.stringify(payload);
  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}
