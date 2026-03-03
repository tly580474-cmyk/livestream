import { useState, useEffect, useRef, useCallback } from 'react';
import { socketService } from '../services/socketService';
import { webrtcService } from '../services/webrtcService';
import type { ConnectionState } from '../services/webrtcService';

export type CallPhase = 'home' | 'waiting' | 'in-call';

export function useVideoCall() {
  const [phase, setPhase] = useState<CallPhase>('home');
  const [roomId, setRoomId] = useState<string>('');
  const [joinInput, setJoinInput] = useState<string>('');
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [error, setError] = useState<string>('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isCaller, setIsCaller] = useState(false);

  // Store streams in state so we can assign them when refs become available
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Assign local stream to video element whenever stream or ref changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, phase]);

  // Assign remote stream to video element whenever stream or ref changes
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, phase]);

  // Setup WebRTC callbacks once
  useEffect(() => {
    webrtcService.setCallbacks(
      (stream) => {
        console.log('[Hook] Remote stream received, tracks:', stream.getTracks().length);
        setRemoteStream(stream);
        // Also try to assign directly in case ref is already available
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
        // Switch to in-call when remote stream arrives
        setPhase('in-call');
      },
      (state) => {
        setConnectionState(state);
      }
    );
  }, []);

  const setupLocalVideo = async () => {
    try {
      const stream = await webrtcService.getLocalStream();
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      setError('无法获取摄像头/麦克风权限，请检查设备权限设置。');
      throw err;
    }
  };

  const setupSocketListeners = useCallback((currentRoomId: string) => {
    const socket = socketService.getSocket();
    if (!socket) return;

    // Remove any stale listeners first
    socket.off('peer-joined');
    socket.off('offer');
    socket.off('answer');
    socket.off('ice-candidate');
    socket.off('peer-left');

    socket.on('peer-joined', async () => {
      console.log('[Hook] Peer joined, initiating call as caller');
      try {
        await webrtcService.initiateCall(currentRoomId);
      } catch (err) {
        console.error('[Hook] initiateCall error:', err);
        setError('建立通话失败，请重试。');
      }
    });

    socket.on('offer', async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
      console.log('[Hook] Received offer');
      try {
        await webrtcService.handleOffer(offer);
        // phase will switch to 'in-call' when remote stream arrives via onRemoteStream callback
      } catch (err) {
        console.error('[Hook] handleOffer error:', err);
        setError('处理通话请求失败。');
      }
    });

    socket.on('answer', async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      console.log('[Hook] Received answer');
      try {
        await webrtcService.handleAnswer(answer);
        // Caller switches to in-call after answer
        setPhase('in-call');
      } catch (err) {
        console.error('[Hook] handleAnswer error:', err);
        setError('处理通话应答失败。');
      }
    });

    socket.on('ice-candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      await webrtcService.handleIceCandidate(candidate);
    });

    socket.on('peer-left', () => {
      console.log('[Hook] Peer left');
      setConnectionState('disconnected');
      setError('对方已挂断通话。');
      doCleanup();
      setPhase('home');
    });
  }, []);

  const createRoom = async () => {
    setError('');
    try {
      socketService.connect();
      await setupLocalVideo();
      const result = await socketService.createRoom();
      if (!result.success || !result.roomId) {
        setError('创建房间失败，请重试。');
        return;
      }
      setRoomId(result.roomId);
      setIsCaller(true);
      webrtcService.setRoomId(result.roomId);
      setupSocketListeners(result.roomId);
      setPhase('waiting');
    } catch (err) {
      setError('连接服务器失败，请检查网络。');
    }
  };

  const joinRoom = async () => {
    const trimmed = joinInput.trim();
    if (!trimmed) {
      setError('请输入房间号。');
      return;
    }
    setError('');
    try {
      socketService.connect();
      await setupLocalVideo();
      const result = await socketService.joinRoom(trimmed);
      if (!result.success) {
        setError(result.error || '加入房间失败，请检查房间号。');
        return;
      }
      setRoomId(trimmed);
      setIsCaller(false);
      webrtcService.setRoomId(trimmed);
      setupSocketListeners(trimmed);
      setPhase('waiting');
    } catch (err) {
      setError('连接服务器失败，请检查网络。');
    }
  };

  const doCleanup = () => {
    const socket = socketService.getSocket();
    if (socket) {
      socket.off('peer-joined');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('peer-left');
    }
    webrtcService.cleanup();
    setLocalStream(null);
    setRemoteStream(null);
    setRoomId('');
    setConnectionState('idle');
    setAudioEnabled(true);
    setVideoEnabled(true);
  };

  const hangUp = () => {
    if (roomId) {
      socketService.leaveRoom(roomId);
    }
    doCleanup();
    setPhase('home');
    setError('');
  };

  const toggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    webrtcService.toggleAudio(next);
  };

  const toggleVideo = () => {
    const next = !videoEnabled;
    setVideoEnabled(next);
    webrtcService.toggleVideo(next);
  };

  return {
    phase,
    roomId,
    joinInput,
    setJoinInput,
    connectionState,
    error,
    setError,
    audioEnabled,
    videoEnabled,
    isCaller,
    localVideoRef,
    remoteVideoRef,
    createRoom,
    joinRoom,
    hangUp,
    toggleAudio,
    toggleVideo,
  };
}
