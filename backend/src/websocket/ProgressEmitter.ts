import WebSocket from 'ws';
import { ProgressEvent } from './ProgressEvent';

/**
 * Singleton registry that maps jobId → set of open WebSocket connections.
 * Multiple browser tabs can subscribe to the same jobId.
 */
class ProgressEmitter {
  private readonly connections = new Map<string, Set<WebSocket>>();

  /**
   * Register a newly upgraded WebSocket for a specific jobId.
   * Automatically unregisters on close.
   */
  register(jobId: string, ws: WebSocket): void {
    if (!this.connections.has(jobId)) {
      this.connections.set(jobId, new Set());
    }
    this.connections.get(jobId)!.add(ws);

    ws.on('close', () => {
      const set = this.connections.get(jobId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) {
          this.connections.delete(jobId);
        }
      }
    });
  }

  /**
   * Push a ProgressEvent to all open connections subscribed to jobId.
   * Silently skips closed/closing connections.
   */
  emit(jobId: string, event: ProgressEvent): void {
    const clients = this.connections.get(jobId);
    if (!clients || clients.size === 0) return;

    const payload = JSON.stringify(event);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  /** Returns the number of active subscriber connections across all jobs. */
  activeConnectionCount(): number {
    let total = 0;
    for (const set of this.connections.values()) {
      total += set.size;
    }
    return total;
  }

  /** Returns a list of jobIds that currently have at least one subscriber. */
  activeJobIds(): string[] {
    return Array.from(this.connections.keys());
  }
}

export const progressEmitter = new ProgressEmitter();
