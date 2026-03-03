import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

class SocketService {
  private socket: Socket | null = null;

  connect(): Socket {
    if (!this.socket || !this.socket.connected) {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
      });
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  createRoom(): Promise<{ success: boolean; roomId?: string; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'Not connected' });
      this.socket.emit('create-room', (res: { success: boolean; roomId?: string }) => {
        resolve(res);
      });
    });
  }

  joinRoom(roomId: string): Promise<{ success: boolean; roomId?: string; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'Not connected' });
      this.socket.emit('join-room', roomId, (res: { success: boolean; roomId?: string; error?: string }) => {
        resolve(res);
      });
    });
  }

  sendOffer(roomId: string, offer: RTCSessionDescriptionInit) {
    this.socket?.emit('offer', { roomId, offer });
  }

  sendAnswer(roomId: string, answer: RTCSessionDescriptionInit) {
    this.socket?.emit('answer', { roomId, answer });
  }

  sendIceCandidate(roomId: string, candidate: RTCIceCandidateInit) {
    this.socket?.emit('ice-candidate', { roomId, candidate });
  }

  leaveRoom(roomId: string) {
    this.socket?.emit('leave-room', roomId);
  }
}

export const socketService = new SocketService();
