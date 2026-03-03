import React from 'react';

interface HomePageProps {
  joinInput: string;
  setJoinInput: (val: string) => void;
  error: string;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
}

const HomePage: React.FC<HomePageProps> = ({
  joinInput,
  setJoinInput,
  error,
  onCreateRoom,
  onJoinRoom,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-600 mb-4 shadow-lg shadow-blue-500/30">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">视频通话</h1>
          <p className="text-slate-400 mt-2 text-sm">安全的 P2P 实时视频对话</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/60 backdrop-blur rounded-2xl p-8 shadow-xl border border-slate-700/50">
          {/* Error */}
          {error && (
            <div className="mb-5 flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Create Room */}
          <button
            onClick={onCreateRoom}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-base transition-all duration-150 shadow-md shadow-blue-600/30 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            创建新房间
          </button>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-600" />
            <span className="text-slate-500 text-xs">或者</span>
            <div className="flex-1 h-px bg-slate-600" />
          </div>

          {/* Join Room */}
          <div className="flex gap-2">
            <input
              type="text"
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onJoinRoom()}
              placeholder="输入房间号"
              maxLength={8}
              className="flex-1 bg-slate-700/60 border border-slate-600 text-white placeholder-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
            <button
              onClick={onJoinRoom}
              className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-sm transition-all duration-150 shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14" />
              </svg>
              加入
            </button>
          </div>

          <p className="text-slate-500 text-xs text-center mt-5">
            每个房间最多支持 2 位用户 · 音视频数据端对端加密传输
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
