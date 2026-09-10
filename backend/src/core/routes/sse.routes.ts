import { Router, Request, Response } from 'express';
import { sseService } from '../utils/sse.service';

const router = Router();

router.get('/events', (req: Request, res: Response) => {
  const clientId = req.query.clientId as string;

  if (!clientId) {
    res.status(400).json({ error: 'clientId query parameter is required' });
    return;
  }

  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*' // Adjust if strict CORS is needed
  });

  // Handle client disconnect
  req.on('close', () => {
    sseService.removeClient(clientId);
  });

  // Add the client to the active connections map
  sseService.addClient(clientId, res);
});

export default router;
