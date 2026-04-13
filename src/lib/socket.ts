"use client";

import { io, type Socket } from "socket.io-client";

export const socket: Socket = typeof window !== "undefined"
  ? io({ autoConnect: false })
  : ({} as Socket);
