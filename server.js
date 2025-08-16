const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // change this to your frontend origin in production
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 4000;

// health check
app.get("/", (req, res) => {
  res.send("WebRTC signaling server is running");
});

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("join-room", ({ roomId, userName }) => {
    socket.join(roomId);
    console.log(`${socket.id} joined room ${roomId}`);

    // Notify existing members in the room about the new user
    socket.to(roomId).emit("other-user", { socketId: socket.id });
  });

  // Relay offer
  socket.on("offer", (payload) => {
    // payload: { to, from, sdp }
    console.log(`Offer from ${payload.from} to ${payload.to}`);
    io.to(payload.to).emit("offer", payload);
  });

  // Relay answer
  socket.on("answer", (payload) => {
    // payload: { to, from, sdp }
    console.log(`Answer from ${payload.from} to ${payload.to}`);
    io.to(payload.to).emit("answer", payload);
  });

  // Relay ICE candidates
  socket.on("ice-candidate", (payload) => {
    // payload: { to, from, candidate }
    io.to(payload.to).emit("ice-candidate", payload);
  });

  // Handle leaving a room
  socket.on("leave-room", ({ roomId }) => {
    socket.leave(roomId);
    socket.to(roomId).emit("user-left", { socketId: socket.id });
    console.log(`${socket.id} left room ${roomId}`);
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Signaling server running on http://localhost:${PORT}`);
});

