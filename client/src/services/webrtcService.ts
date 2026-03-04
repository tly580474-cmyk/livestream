import { socketService } from './socketService';

// ─── ICE 服务器配置 ───────────────────────────────────────────────────────────
// STUN 服务器列表（多个服务器提高成功率）
const STUN_SERVERS_BASE: RTCIceServer[] = [
  // Google 公共 STUN 服务器
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  // Linphone 公共 STUN
  { urls: 'stun:stun.linphone.org:3478' },
  // PJSIP 公共 STUN
  { urls: 'stun:stun.pjsip.org:3478' },
  // FreeSWITCH 公共 STUN
  { urls: 'stun:stun.freeswitch.org:3478' },
  // VoIPBuster 公共 STUN
  { urls: 'stun:stun.voipbuster.com:3478' },
];

// P3: 额外的 IPv6 STUN 端点（Google 公共 STUN 同时支持 IPv4/IPv6）
// 当检测到 IPv6 网络时追加
const STUN_SERVERS_IPV6_EXTRA: RTCIceServer[] = [
  { urls: 'stun:[2001:4860:4864:5::99]:19302' }, // Google IPv6 STUN
];

// P1: 心跳间隔（毫秒）—— 30 s 一次，远低于多数 NAT 60 s 超时
const HEARTBEAT_INTERVAL_MS = 30_000;

// P4: 预分配 ICE 候选池大小 —— 让浏览器提前绑定多个本地 UDP 端口，
//     增加多端口并行打洞覆盖率
const ICE_CANDIDATE_POOL_SIZE = 10;

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed';

class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private roomId: string | null = null;
  private onRemoteStream: ((stream: MediaStream) => void) | null = null;
  private onConnectionStateChange: ((state: ConnectionState) => void) | null = null;

  // ── P1: 心跳保活 ──────────────────────────────────────────────────────────
  private heartbeatChannel: RTCDataChannel | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  // ── P3: IPv6 支持 ─────────────────────────────────────────────────────────
  private ipv6Available = false;

  // ─────────────────────────────────────────────────────────────────────────

  setCallbacks(
    onRemoteStream: (stream: MediaStream) => void,
    onConnectionStateChange: (state: ConnectionState) => void
  ) {
    this.onRemoteStream = onRemoteStream;
    this.onConnectionStateChange = onConnectionStateChange;
  }

  // ── P3: 检测本机是否具有 IPv6 连通性 ────────────────────────────────────
  // 通过临时 RTCPeerConnection 收集 ICE 候选，判断是否出现 IPv6 地址
  private detectIPv6(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const pc = new RTCPeerConnection({
          iceServers: STUN_SERVERS_BASE,
        });
        pc.createDataChannel('ipv6-probe');
        let found = false;

        pc.onicecandidate = (ev) => {
          if (ev.candidate) {
            // ICE candidate 第 5 字段是 IP 地址；IPv6 地址含 ':'
            const ip = ev.candidate.candidate.split(' ')[4] ?? '';
            if (ip.includes(':')) {
              found = true;
            }
          } else {
            // null candidate → 收集完毕
            pc.close();
            resolve(found);
          }
        };

        pc.createOffer()
          .then((o) => pc.setLocalDescription(o))
          .catch(() => resolve(false));

        // 最多等待 3 s，避免阻塞
        setTimeout(() => {
          pc.close();
          resolve(found);
        }, 3000);
      } catch {
        resolve(false);
      }
    });
  }

  private buildIceServers(): RTCIceServer[] {
    const servers: RTCIceServer[] = [...STUN_SERVERS_BASE];
    if (this.ipv6Available) {
      servers.push(...STUN_SERVERS_IPV6_EXTRA);
      console.log('[WebRTC] IPv6 detected — IPv6 STUN servers added');
    }
    return servers;
  }

  // ── P1: 启动心跳定时器 ───────────────────────────────────────────────────
  private startHeartbeat() {
    this.stopHeartbeat();

    const sendPing = () => {
      if (this.heartbeatChannel?.readyState === 'open') {
        const msg = JSON.stringify({ type: 'ping', ts: Date.now() });
        this.heartbeatChannel.send(msg);
        console.log('[WebRTC] 💓 Heartbeat ping sent');
      }
    };

    // 立即发一次，然后每隔 HEARTBEAT_INTERVAL_MS 发送
    sendPing();
    this.heartbeatTimer = setInterval(sendPing, HEARTBEAT_INTERVAL_MS);
    console.log(`[WebRTC] Heartbeat started (interval ${HEARTBEAT_INTERVAL_MS / 1000}s)`);
  }

  // ── P1: 停止心跳 ─────────────────────────────────────────────────────────
  private stopHeartbeat() {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      console.log('[WebRTC] Heartbeat stopped');
    }
  }

  // ── P1: 为 Offerer（主叫）创建心跳 DataChannel ──────────────────────────
  private setupHeartbeatAsInitiator(pc: RTCPeerConnection) {
    const ch = pc.createDataChannel('heartbeat', {
      ordered: false,     // 无序 → 实时性更好
      maxRetransmits: 0,  // 不重传 → 心跳丢失无所谓
    });
    this.heartbeatChannel = ch;

    ch.onopen = () => {
      console.log('[WebRTC] Heartbeat channel (initiator) open');
      this.startHeartbeat();
    };

    ch.onmessage = (ev) => {
      // 收到 pong — 记录 RTT（可选）
      try {
        const data = JSON.parse(ev.data as string) as { type: string; pingTs: number };
        if (data.type === 'pong') {
          console.log(`[WebRTC] 💓 Heartbeat pong received, RTT ≈ ${Date.now() - data.pingTs} ms`);
        }
      } catch { /* ignore */ }
    };

    ch.onclose = () => this.stopHeartbeat();
    ch.onerror = (e) => console.warn('[WebRTC] Heartbeat channel error:', e);
  }

  // ── P1: Answerer（被叫）监听心跳 DataChannel ────────────────────────────
  private listenForHeartbeatChannel(pc: RTCPeerConnection) {
    pc.ondatachannel = (ev) => {
      if (ev.channel.label !== 'heartbeat') return;
      const ch = ev.channel;
      this.heartbeatChannel = ch;
      console.log('[WebRTC] Heartbeat channel (answerer) received');

      ch.onopen = () => {
        console.log('[WebRTC] Heartbeat channel (answerer) open');
        // 被叫方也主动发心跳，两端都保活 NAT 映射
        this.startHeartbeat();
      };

      ch.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data as string) as { type: string; ts: number };
          if (data.type === 'ping') {
            // 回 pong
            if (ch.readyState === 'open') {
              ch.send(JSON.stringify({ type: 'pong', pingTs: data.ts, ts: Date.now() }));
            }
          }
        } catch { /* ignore */ }
      };

      ch.onclose = () => this.stopHeartbeat();
      ch.onerror = (e) => console.warn('[WebRTC] Heartbeat channel error:', e);
    };
  }

  // ── 创建 RTCPeerConnection ───────────────────────────────────────────────
  private createPeerConnection(): RTCPeerConnection {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.stopHeartbeat();

    const pc = new RTCPeerConnection({
      iceServers: this.buildIceServers(),
      // P4: 预分配更多本地 UDP 端口，增大 NAT 映射命中概率
      iceCandidatePoolSize: ICE_CANDIDATE_POOL_SIZE,
    });

    // ── ICE 候选：直接发给对端（Trickle ICE）─────────────────────────────
    pc.onicecandidate = (event) => {
      if (event.candidate && this.roomId) {
        const cand = event.candidate;
        const ip = cand.candidate.split(' ')[4] ?? '';
        const isIPv6 = ip.includes(':');
        console.log(`[WebRTC] ICE candidate: ${isIPv6 ? 'IPv6' : 'IPv4'} ${cand.type}`);
        socketService.sendIceCandidate(this.roomId, cand.toJSON());
      }
    };

    pc.ontrack = (event) => {
      console.log('[WebRTC] Remote track received:', event.track.kind);
      if (event.streams && event.streams[0]) {
        this.onRemoteStream?.(event.streams[0]);
      } else {
        this.onRemoteStream?.(new MediaStream([event.track]));
      }
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      console.log('[WebRTC] Connection state:', s);
      const stateMap: Record<string, ConnectionState> = {
        new: 'idle',
        connecting: 'connecting',
        connected: 'connected',
        disconnected: 'disconnected',
        failed: 'failed',
        closed: 'disconnected',
      };
      this.onConnectionStateChange?.(stateMap[s] ?? 'idle');

      // P1: 连接成功时确保心跳在运行；断开时停止
      if (s === 'connected') {
        if (this.heartbeatChannel?.readyState === 'open') {
          this.startHeartbeat();
        }
      } else if (s === 'disconnected' || s === 'failed' || s === 'closed') {
        this.stopHeartbeat();
      }
    };

    pc.onicegatheringstatechange = () => {
      console.log('[WebRTC] ICE gathering state:', pc.iceGatheringState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE connection state:', pc.iceConnectionState);
      // 当 ICE 断连时尝试重启（ICE restart）
      if (pc.iceConnectionState === 'failed') {
        console.warn('[WebRTC] ICE failed — attempting ICE restart');
        pc.restartIce();
      }
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

  // ── P3 + P4: 在发起通话前先检测 IPv6，结果缓存 ──────────────────────────
  private async prepareNetwork() {
    this.ipv6Available = await this.detectIPv6();
    console.log(`[WebRTC] IPv6 available: ${this.ipv6Available}`);
  }

  // Called by the room creator (offerer) when peer joins
  async initiateCall(roomId: string) {
    this.roomId = roomId;

    // P3: 检测 IPv6
    await this.prepareNetwork();

    const pc = this.createPeerConnection();
    this.onConnectionStateChange?.('connecting');

    // P1: 主叫创建心跳 DataChannel（必须在 createOffer 前）
    this.setupHeartbeatAsInitiator(pc);

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

    // P3: 检测 IPv6
    await this.prepareNetwork();

    const pc = this.createPeerConnection();
    this.onConnectionStateChange?.('connecting');

    // P1: 被叫监听心跳 DataChannel
    this.listenForHeartbeatChannel(pc);

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
    this.stopHeartbeat();
    if (this.heartbeatChannel) {
      this.heartbeatChannel.close();
      this.heartbeatChannel = null;
    }
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
