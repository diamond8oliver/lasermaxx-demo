"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { socket } from "@/lib/socket";
import type { Socket } from "socket.io-client";

const SocketContext = createContext<Socket | null>(null);

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({
  room,
  children,
}: {
  room: "staff" | "kiosk";
  children: ReactNode;
}) {
  const connected = useRef(false);

  useEffect(() => {
    if (!connected.current) {
      socket.connect();
      socket.emit(`join:${room}`);
      connected.current = true;
    }

    const handleConnect = () => {
      socket.emit(`join:${room}`);
    };

    socket.on("connect", handleConnect);

    return () => {
      socket.off("connect", handleConnect);
    };
  }, [room]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}
