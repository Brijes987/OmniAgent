
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
    });
  }
  return socket;
};

export const connectSocket = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const s = getSocket();
    if (s.connected) {
      resolve();
      return;
    }
    s.connect();
    s.on("connect", resolve);
    s.on("connect_error", reject);
  });
};

export const disconnectSocket = (): void => {
  const s = getSocket();
  if (s.connected) {
    s.disconnect();
  }
};
