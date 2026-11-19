import { io, Socket } from 'socket.io-client';

// Connect to current origin, which is proxied by Vite to backend on port 4000
export const socket: Socket = io({
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000
});
