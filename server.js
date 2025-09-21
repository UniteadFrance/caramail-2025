// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- présence ultra simple (global) ---
const online = new Map(); // socket.id -> { nick, color, room }

function broadcastOnline() {
  const list = [...online.values()];
  io.emit('online:list', list); // tout le monde reçoit la liste
}

io.on('connection', (socket) => {
  // Valeurs par défaut si la page ne les envoie pas
  const nick  = (socket.handshake.query?.nick  || 'invité-' + socket.id.slice(-4)).toString();
  const color = (socket.handshake.query?.color || 'blue').toString();
  const room  = (socket.handshake.query?.room  || '#general').toString();

  online.set(socket.id, { nick, color, room });
  broadcastOnline();

  // (optionnel) si une page nous envoie des infos plus précises
  socket.on('presence:update', (data = {}) => {
    online.set(socket.id, {
      nick:  data.nick  || nick,
      color: data.color || color,
      room:  data.room  || room
    });
    broadcastOnline();
  });

  socket.on('disconnect', () => {
    online.delete(socket.id);
    broadcastOnline();
  });
});

// Sert tes fichiers HTML/CSS/JS (mets-les dans un dossier "public")
app.use(express.static("public"));

// Quand un client se connecte
io.on("connection", (socket) => {
  console.log("Un utilisateur est connecté");

  // Réception d’un message
	socket.on("chat message", (msg) => {
	  socket.broadcast.emit("chat message", msg);
	});

  socket.on("disconnect", () => {
    console.log("Un utilisateur est parti");
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log("Serveur CaraMail lancé sur http://localhost:" + PORT);
});
