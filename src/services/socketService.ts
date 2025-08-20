import io, { Socket } from 'socket.io-client';
import { PRODUCTION_CONFIG } from '../config/production';

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;

  // Singleton instance
  private static instance: SocketService;
  
  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  // Connect to Socket.io server
  public connect(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.socket = io(PRODUCTION_CONFIG.SOCKET_URL, {
          transports: ['websocket', 'polling'],
          timeout: 10000,
          reconnection: true,
          reconnectionAttempts: 5,
        });

        this.socket.on('connect', () => {
          console.log('Socket.io connected successfully');
          this.isConnected = true;
          resolve(true);
        });

        this.socket.on('disconnect', () => {
          console.log('Socket.io disconnected');
          this.isConnected = false;
          resolve(false);
        });

        this.socket.on('connect_error', (error) => {
          console.error('Socket.io connection error:', error);
          this.isConnected = false;
          resolve(false);
        });

      } catch (error) {
        console.error('Error creating socket connection:', error);
        resolve(false);
      }
    });
  }

  // Join tracking room
  public joinTrackingRoom(jobId: string, jobType: 'order' | 'errand', role: 'buyer' | 'seller' | 'runner'): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('join', { jobId, type: jobType, role });
    }
  }

  // Listen for status updates
  public onStatusUpdate(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('statusUpdate', callback);
    }
  }

  // Listen for location updates
  public onLocationUpdate(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('locationUpdate', callback);
    }
  }

  // Update status
  public updateStatus(jobId: string, jobType: 'order' | 'errand', status: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('statusUpdate', {
        id: jobId,
        type: jobType,
        status,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Update runner location
  public updateRunnerLocation(jobId: string, jobType: 'order' | 'errand', location: { latitude: number; longitude: number }): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('locationUpdate', {
        id: jobId,
        type: jobType,
        location,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Check connection status
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Disconnect
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

export default SocketService.getInstance();


