// Import required modules
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const cors = require("cors"); // Import the CORS package
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: true, // Allow any origin
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors()); // Use CORS middleware for handling CORS issues
app.use(bodyParser.json());

// Store connected clients by userId
const connectedClients = {};

// Login endpoint to authenticate user and provide a token
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  console.log(
    `Login attempt with username: ${username}, password: ${password}`
  );

  // Simple user validation (replace this with database validation for real implementation)
  if (username === "testuser" && password === "password") {
    const userId = "12345"; // Simulate a user ID
    console.log(`Authentication successful for userId: ${userId}`);

    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    console.log(`Generated token for userId: ${userId}: ${token}`);

    return res.json({ userId, token });
  } else {
    console.log("Authentication failed: Invalid username or password");
    return res.status(401).json({ message: "Invalid username or password" });
  }
});

// Middleware to authenticate socket connections
io.use((socket, next) => {
  const token = socket.handshake.query.token;
  console.log(`Socket connection attempt with token: ${token}`);

  if (!token) {
    console.log("Authentication error: Token missing");
    return next(new Error("Authentication error"));
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log("Authentication error: Invalid token");
      return next(new Error("Authentication error"));
    }
    socket.userId = decoded.userId; // Attach userId to socket
    console.log(`Token validated. User ID ${socket.userId} connected`);
    next();
  });
});

// WebSocket connection handling
io.on("connection", (socket) => {
  const userId = socket.userId;
  console.log(`WebSocket connection established for userId: ${userId}`);

  // Save the connected socket for the authenticated user
  connectedClients[userId] = socket;
  console.log(`User ${userId} added to connected clients`);

  // Emit an event to notify the user upon connection
  socket.emit("connected", { message: "You are connected!" });
  socket.on("ping", () => {
    socket.emit("pong"); // Respond back with a pong
  });
  socket.on("disconnect", () => {
    console.log(`User ${userId} disconnected`);
    delete connectedClients[userId];
    console.log(`User ${userId} removed from connected clients`);
  });
});

app.post("/api/notify", (req, res) => {
  const { userId, message } = req.body;
  console.log(
    `Notification request received for userId: ${userId} with message: ${message}`
  );

  // Check if the user is connected
  if (connectedClients[userId]) {
    // Emit notification using the socket ID
    io.to(connectedClients[userId].id).emit("notification", {
      userId: userId, // You can send the actual userId here
      message: message,
    });

    console.log(`Notification sent to userId: ${userId}`);
    return res.json({ message: "Notification sent" });
  } else {
    console.log(`Notification failed: User ${userId} not connected`);
    return res.status(404).json({ message: "User not connected" });
  }
});

// Start the server
const PORT = process.env.PORT || 3030;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
