"use client";

import { useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { getSocket } from "@/lib/socket";

type EventHandler = (data: unknown) => void;

/** Subscribe to a Socket.io event and auto-clean on unmount. */
export function useSocket(event: string, handler: EventHandler): Socket {
  const socket = getSocket();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const cb = (data: unknown) => handlerRef.current(data);
    socket.on(event, cb);
    return () => {
      socket.off(event, cb);
    };
  }, [socket, event]);

  return socket;
}
