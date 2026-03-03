import { socketService } from './socketService';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed';

class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private roomId: string | null = null;
  private onRemoteStream: ((stream: MediaStream) => void) | null = null;
  private onConnectionStateChange: ((state: ConnectionState) => void) | null = null;

  setCallbacks(
    onRemoteStream: (stream: MediaStream) => void,
    onConnectionStateChange: (state: ConnectionState) => void
  ) {
    this.onRemoteStream = onRemoteStream;
    this.onConnectionStateChange = onConnectionStateChange;
  }

  async getLocalStream(): Promise<MediaStream> {
    if (this.localStream) return this.localStream;
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: true,
    });
    return this.localStream;
  }

  getLocalStreamSync(): MediaStream | null {
    return this.localStream;
  }

  private createPeerConnection(): RTCPeerConnection {
    // Close any existing connection first
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate && this.roomId) {
        socketService.sendIceCandidate(this.roomId, event.candidate.toJSON());
      }
    };

    pc.ontrack = (event) => {
      console.log('[WebRTC] Remote track received:', event.track.kind);
      if (event.streams && event.streams[0]) {
        this.onRemoteStream?.(event.streams[0]);
      } else {
        // Fallback: create MediaStream from track
        const stream = new MediaStream([event.track]);
        this.onRemoteStream?.(stream);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState);
      const stateMap: Record<string, ConnectionState> = {
        new: 'idle',
        connecting: 'connecting',
        connected: 'connected',
        disconnected: 'disconnected',
        failed: 'failed',
        closed: 'disconnected',
      };
      const state = stateMap[pc.connectionState] || 'idle';
      this.onConnectionStateChange?.(state);
    };

    pc.onicegatheringstatechange = () => {
      console.log('[WebRTC] ICE gathering state:', pc.iceGatheringState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE connection state:', pc.iceConnectionState);
    };

    this.peerConnection = pc;
    return pc;
  }

  private addLocalTracks(pc: RTCPeerConnection) {
    if (!this.localStream) return;
    this.localStream.getTracks().forEach((track) => {
      console.log('[WebRTC] Adding local track:', track.kind);
      pc.addTrack(track, this.localStream!);
    });
  }

  // Called by the room creator (offerer) when peer joins
  async initiateCall(roomId: string) {
    this.roomId = roomId;
    const pc = this.createPeerConnection();
    this.onConnectionStateChange?.('connecting');

    // Add local tracks BEFORE creating offer (essential for negotiation)
    this.addLocalTracks(pc);

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await pc.setLocalDescription(offer);
    console.log('[WebRTC] Sending offer to room:', roomId);
    socketService.sendOffer(roomId, offer);
  }

  // Called by the joiner (answerer) when receiving an offer
  async handleOffer(offer: RTCSessionDescriptionInit) {
    if (!this.roomId) {
      console.error('[WebRTC] handleOffer: roomId not set');
      return;
    }
    const pc = this.createPeerConnection();
    this.onConnectionStateChange?.('connecting');

    // Add local tracks BEFORE setting remote description
    this.addLocalTracks(pc);

    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    console.log('[WebRTC] Sending answer to room:', this.roomId);
    socketService.sendAnswer(this.roomId, answer);
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) return;
    console.log('[WebRTC] Setting remote description (answer)');
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async handleIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.peerConnection) return;
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error('[WebRTC] Error adding ICE candidate:', e);
    }
  }

  setRoomId(roomId: string) {
    this.roomId = roomId;
  }

  stopLocalStream() {
    this.localStream?.getTracks().forEach((t) => {
      t.stop();
      console.log('[WebRTC] Stopped local track:', t.kind);
    });
    this.localStream = null;
  }

  closeConnection() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
      console.log('[WebRTC] Peer connection closed');
    }
    this.roomId = null;
  }

  cleanup() {
    this.stopLocalStream();
    this.closeConnection();
  }

  toggleAudio(enabled: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => {
      t.enabled = enabled;
      console.log('[WebRTC] Audio track enabled:', enabled);
    });
  }

  toggleVideo(enabled: boolean) {
    this.localStream?.getVideoTracks().forEach((t) => {
      t.enabled = enabled;
      console.log('[WebRTC] Video track enabled:', enabled);
    });
  }
}

export const webrtcService = new WebRTCService();
