/**
 * Room Service - manages room state in memory
 */

const rooms = new Map(); // roomId -> { id, creatorId, users: Set, createdAt }

/**
 * Generate a unique 6-digit room ID
 */
function generateRoomId() {
  let id;
  do {
    id = Math.floor(100000 + Math.random() * 900000).toString();
  } while (rooms.has(id));
  return id;
}

/**
 * Create a new room for the given socket ID
 */
function createRoom(socketId) {
  const id = generateRoomId();
  const room = {
    id,
    creatorId: socketId,
    users: new Set([socketId]),
    createdAt: new Date(),
  };
  rooms.set(id, room);
  return room;
}

/**
 * Join an existing room
 */
function joinRoom(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) {
    return { success: false, error: 'Room not found' };
  }
  if (room.users.size >= 2) {
    return { success: false, error: 'Room is full (max 2 users)' };
  }
  room.users.add(socketId);
  return { success: true };
}

/**
 * Remove a user from a specific room
 */
function leaveRoom(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.users.delete(socketId);
  if (room.users.size === 0) {
    rooms.delete(roomId);
    console.log(`[Room] Room ${roomId} destroyed (empty)`);
  }
}

/**
 * Remove a user from all rooms they are in (on disconnect)
 * Returns list of affected room IDs
 */
function removeUser(socketId) {
  const affectedRooms = [];
  for (const [roomId, room] of rooms.entries()) {
    if (room.users.has(socketId)) {
      affectedRooms.push(roomId);
      room.users.delete(socketId);
      if (room.users.size === 0) {
        rooms.delete(roomId);
        console.log(`[Room] Room ${roomId} destroyed (empty)`);
      }
    }
  }
  return affectedRooms;
}

/**
 * Get total number of active rooms
 */
function getRoomCount() {
  return rooms.size;
}

module.exports = {
  createRoom,
  joinRoom,
  leaveRoom,
  removeUser,
  getRoomCount,
};
