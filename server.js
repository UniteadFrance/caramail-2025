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

// --- Helpers pour DM -------------------------------------------------
function normNick(s){ return String(s||'').trim().slice(0,32); }
function dmRoomName(a,b){
  const A = normNick(a).toLowerCase();
  const B = normNick(b).toLowerCase();
  return 'dm:' + [A,B].sort().join('|'); // ex: dm:alex|mika
}

// --- Socket.IO : DM ---------------------------------------------------
io.on('connection', (socket) => {
  // nick actuel associé à ce socket (tu peux reprendre ta logique existante)
  const myNick = normNick(socket.handshake.query?.nick || 'invité-' + socket.id.slice(-4));

  // Le client rejoint une room DM avec quelqu’un
  socket.on('dm:join', ({ peer }) => {
    const room = dmRoomName(myNick, peer);
    socket.join(room);
    // Optionnel: informer l’autre que je suis arrivé
    io.to(room).emit('dm:info', { room, who: myNick, type:'join' });
  });

  // Envoi d’un message privé
  socket.on('dm:send', ({ peer, text }) => {
    const msg = String(text||'').slice(0, 2000); // sécurité longueur
    if (!msg) return;
    const room = dmRoomName(myNick, peer);
    io.to(room).emit('dm:msg', {
      room, from: myNick, text: msg, ts: Date.now()
    });
  });

  // Optionnel: quitter la room DM (pas obligatoire)
  socket.on('dm:leave', ({ peer }) => {
    const room = dmRoomName(myNick, peer);
    socket.leave(room);
    io.to(room).emit('dm:info', { room, who: myNick, type:'leave' });
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
