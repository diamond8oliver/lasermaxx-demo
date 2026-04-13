"use client";

import { useEffect } from "react";
import { useSocket } from "@/components/shared/SocketProvider";

export function useSocketEvent<T = unknown>(
  event: string,
  handler: (data: T) => void
) {
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [socket, event, handler]);
}
