import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:8000";

let socket: Socket | null = null;

/** Return (or create) the shared Socket.io client singleton. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      // Allow polling fallback in case raw WebSocket is blocked by proxy
      transports: ["websocket", "polling"],
      autoConnect: false,
    });
  }
  return socket;
}

/** Connect and join the teacher's classroom room — emits join_classroom after connect confirms. */
export function connectTeacher(sessionId: string, jwt: string): Socket {
  const s = getSocket();
  const doJoin = () =>
    s.emit("join_classroom", { session_id: sessionId, teacher_jwt: `Bearer ${jwt}` });
  if (s.connected) {
    doJoin();
  } else {
    s.once("connect", doJoin);
    s.connect();
  }
  return s;
}

/** Connect and join the student's session room — emits join_session after connect confirms. */
export function connectStudent(token: string): Socket {
  const s = getSocket();
  const doJoin = () => {
    console.log("[Socket] connected — emitting join_session");
    s.emit("join_session", { token });
  };
  if (s.connected) {
    doJoin();
  } else {
    s.once("connect", doJoin);
    s.connect();
  }
  return s;
}

/** Disconnect and null out the singleton (call on page unmount). */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
