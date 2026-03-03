import React from 'react';
import type { ConnectionState } from '../services/webrtcService';

interface VideoCallProps {
  roomId: string;
  connectionState: ConnectionState;
  audioEnabled: boolean;
  videoEnabled: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  onHangUp: () => void;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
}

const stateLabel: Record<ConnectionState, { text: string; color: string }> = {
  idle: { text: '准备中', color: 'text-slate-400' },
  connecting: { text: '连接中…', color: 'text-yellow-400' },
  connected: { text: '已连接', color: 'text-emerald-400' },
  disconnected: { text: '已断开', color: 'text-red-400' },
  failed: { text: '连接失败', color: 'text-red-500' },
};

const VideoCall: React.FC<VideoCallProps> = ({
  roomId,
  connectionState,
  audioEnabled,
  videoEnabled,
  localVideoRef,
  remoteVideoRef,
  onHangUp,
  onToggleAudio,
  onToggleVideo,
}) => {
  const { text, color } = stateLabel[connectionState] ?? stateLabel.idle;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-900/80 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span className="text-white font-semibold text-sm">视频通话</span>
          <span className="text-slate-500 text-xs ml-1">#{roomId}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {connectionState === 'connected' && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
          <span className={`text-xs font-medium ${color}`}>{text}</span>
        </div>
      </div>

      {/* Video area */}
      <div className="flex-1 relative bg-slate-950">
        {/* Remote video (main) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Remote placeholder */}
        {connectionState !== 'connected' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center">
              <svg className="w-10 h-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className={`text-sm font-medium ${color}`}>{text}</p>
          </div>
        )}

        {/* Local video (PiP) */}
        <div className="absolute bottom-4 right-4 w-36 aspect-video bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-700/60">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover scale-x-[-1]"
          />
          {!videoEnabled && (
            <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                <line x1="2" y1="2" x2="22" y2="22" strokeWidth={2} strokeLinecap="round" />
              </svg>
            </div>
          )}
          <div className="absolute bottom-1 left-1 text-[10px] text-white/60 bg-black/40 rounded px-1">我</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 py-5 bg-slate-900/80 border-t border-slate-800">
        {/* Mic toggle */}
        <button
          onClick={onToggleAudio}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            audioEnabled
              ? 'bg-slate-700 hover:bg-slate-600 text-white'
              : 'bg-red-600 hover:bg-red-500 text-white'
          }`}
          title={audioEnabled ? '关闭麦克风' : '开启麦克风'}
        >
          {audioEnabled ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          )}
        </button>

        {/* Hang up */}
        <button
          onClick={onHangUp}
          className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 active:bg-red-700 flex items-center justify-center shadow-lg shadow-red-600/30 transition-all"
          title="挂断"
        >
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02L6.6 10.8z" />
          </svg>
        </button>

        {/* Camera toggle */}
        <button
          onClick={onToggleVideo}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            videoEnabled
              ? 'bg-slate-700 hover:bg-slate-600 text-white'
              : 'bg-red-600 hover:bg-red-500 text-white'
          }`}
          title={videoEnabled ? '关闭摄像头' : '开启摄像头'}
        >
          {videoEnabled ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              <line x1="2" y1="2" x2="22" y2="22" strokeWidth={2} strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default VideoCall;
