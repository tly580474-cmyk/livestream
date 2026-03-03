import { useVideoCall } from './hooks/useVideoCall';
import HomePage from './components/HomePage';
import WaitingRoom from './components/WaitingRoom';
import VideoCall from './components/VideoCall';

function App() {
  const {
    phase,
    roomId,
    joinInput,
    setJoinInput,
    connectionState,
    error,
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
  } = useVideoCall();

  if (phase === 'home') {
    return (
      <HomePage
        joinInput={joinInput}
        setJoinInput={setJoinInput}
        error={error}
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
      />
    );
  }

  if (phase === 'waiting') {
    return (
      <WaitingRoom
        roomId={roomId}
        isCaller={isCaller}
        localVideoRef={localVideoRef}
        onHangUp={hangUp}
      />
    );
  }

  return (
    <VideoCall
      roomId={roomId}
      connectionState={connectionState}
      audioEnabled={audioEnabled}
      videoEnabled={videoEnabled}
      localVideoRef={localVideoRef}
      remoteVideoRef={remoteVideoRef}
      onHangUp={hangUp}
      onToggleAudio={toggleAudio}
      onToggleVideo={toggleVideo}
    />
  );
}

export default App;
