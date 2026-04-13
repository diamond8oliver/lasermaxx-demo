import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  // Store globally for API routes to access
  globalThis.__socketIO = io;

  io.on("connection", (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on("join:staff", () => {
      socket.join("staff");
      console.log(`[Socket.IO] ${socket.id} joined staff room`);
    });

    socket.on("join:kiosk", () => {
      socket.join("kiosk");
      console.log(`[Socket.IO] ${socket.id} joined kiosk room`);
    });

    socket.on("join-game", (gameId) => {
      socket.join(`game:${gameId}`);
    });

    socket.on("leave-game", (gameId) => {
      socket.leave(`game:${gameId}`);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  httpServer.listen(port, () => {
    console.log(`\n  > LaserMaxx Codenames ready on http://${hostname}:${port}`);
    console.log(`  > Kiosk:  http://localhost:${port}/kiosk`);
    console.log(`  > Control: http://localhost:${port}/control\n`);
  });
});
