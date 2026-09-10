import { Response } from 'express';

export interface SseEventPayload {
  stage: string;
  progress: number;
  message: string;
  data?: any;
}

class SseService {
  private clients: Map<string, Response> = new Map();

  /**
   * Add a new client to the SSE connections map.
   */
  public addClient(clientId: string, res: Response) {
    this.clients.set(clientId, res);
    
    // Send initial connection event
    this.sendEvent(clientId, {
      stage: 'connected',
      progress: 0,
      message: 'SSE Connection Established'
    });
  }

  /**
   * Remove a client from the SSE connections map.
   */
  public removeClient(clientId: string) {
    const res = this.clients.get(clientId);
    if (res) {
      res.end();
      this.clients.delete(clientId);
    }
  }

  /**
   * Send an event to a specific client.
   */
  public sendEvent(clientId: string, payload: SseEventPayload) {
    const res = this.clients.get(clientId);
    if (res) {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
      
      // If the stage is "COMPLETED" or "ERROR", close the connection
      if (payload.stage === 'COMPLETED' || payload.stage === 'ERROR') {
        this.removeClient(clientId);
      }
    }
  }
}

export const sseService = new SseService();
