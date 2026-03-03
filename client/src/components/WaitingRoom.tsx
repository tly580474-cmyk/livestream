import React from 'react';

interface WaitingRoomProps {
  roomId: string;
  isCaller: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  onHangUp: () => void;
}

const WaitingRoom: React.FC<WaitingRoomProps> = ({ roomId, isCaller, localVideoRef, onHangUp }) => {
  const [copied, setCopied] = React.useState(false);

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center p-4 gap-6">
      {/* Local video preview */}
      <div className="relative w-full max-w-sm aspect-video bg-slate-800 rounded-2xl overflow-hidden shadow-xl border border-slate-700/50">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover scale-x-[-1]"
        />
        <div className="absolute bottom-2 left-2 text-xs text-white/70 bg-black/40 rounded px-2 py-0.5">本地预览</div>
      </div>

      {/* Info card */}
      <div className="bg-slate-800/60 backdrop-blur rounded-2xl p-8 shadow-xl border border-slate-700/50 w-full max-w-sm text-center">
        {isCaller ? (
          <>
            <div className="flex justify-center mb-4">
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500"></span>
              </span>
            </div>
            <h2 className="text-white font-semibold text-lg mb-1">等待对方加入…</h2>
            <p className="text-slate-400 text-sm mb-5">将房间号分享给对方</p>

            <div className="flex items-center gap-2 bg-slate-700/60 border border-slate-600 rounded-xl px-4 py-3 mb-3">
              <span className="flex-1 text-white font-mono text-xl font-bold tracking-widest text-center">{roomId}</span>
              <button
                onClick={copyRoomId}
                className="text-slate-400 hover:text-white transition"
                title="复制"
              >
                {copied ? (
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
            {copied && <p className="text-emerald-400 text-xs mb-3">已复制到剪贴板</p>}
          </>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
              </span>
            </div>
            <h2 className="text-white font-semibold text-lg mb-1">已加入房间</h2>
            <p className="text-slate-400 text-sm mb-4">正在等待对方建立连接…</p>
            <div className="text-white font-mono text-xl font-bold tracking-widest bg-slate-700/60 rounded-xl py-3">{roomId}</div>
          </>
        )}

        <button
          onClick={onHangUp}
          className="mt-5 w-full py-2.5 rounded-xl bg-red-600/80 hover:bg-red-500 text-white text-sm font-semibold transition flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          取消
        </button>
      </div>
    </div>
  );
};

export default WaitingRoom;
