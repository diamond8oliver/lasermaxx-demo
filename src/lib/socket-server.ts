import type { Server } from "socket.io";

export function getIO(): Server | null {
  return (globalThis as unknown as { __socketIO?: Server }).__socketIO || null;
}

export function emitToGame(gameId: number, event: string, data: unknown) {
  const io = getIO();
  if (io) {
    io.to(`game:${gameId}`).emit(event, data);
  }
}

export function emitToStaff(event: string, data: unknown) {
  const io = getIO();
  if (io) {
    io.to("staff").emit(event, data);
  }
}

export function emitToAll(event: string, data: unknown) {
  const io = getIO();
  if (io) {
    io.emit(event, data);
  }
}
