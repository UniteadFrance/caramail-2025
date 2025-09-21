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

// --- Présence ultra simple (HTTP polling) ---
app.use(express.json()); // si déjà présent, ne pas dupliquer

const presence = new Map(); // key -> { nick, room, color, last }

// Nettoyage des présences trop anciennes (inactive > 40s)
function prunePresence() {
  const now = Date.now();
  for (const [k, v] of presence.entries()) {
    if (now - v.last > 40000) presence.delete(k);
  }
}

// POST /presence  { nick, room, color }
// Identifie un "utilisateur" par IP + nick (simple et suffisant)
app.post('/presence', (req, res) => {
  const nick  = String(req.body?.nick  || 'invité').trim().slice(0, 32);
  const room  = String(req.body?.room  || '#general').trim().slice(0, 64);
  const color = String(req.body?.color || 'blue').trim().slice(0, 16);
  const key   = `${req.ip}|${nick.toLowerCase()}`;

  presence.set(key, { nick, room, color, last: Date.now() });
  prunePresence();
  res.json({ ok: true });
});

// GET /presence -> { list: [...] }
app.get('/presence', (req, res) => {
  prunePresence();
  res.json({ list: Array.from(presence.values()) });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log("Serveur CaraMail lancé sur http://localhost:" + PORT);
});
// --- Présence simple (HTTP polling) ---
app.use(express.json()); // ne pas dupliquer si déjà présent

const presence = new Map(); // key -> { nick, room, color, last }

// Nettoyer les entrées inactives depuis > 40s
function prunePresence() {
  const now = Date.now();
  for (const [k, v] of presence.entries()) {
    if (now - v.last > 40000) presence.delete(k);
  }
}

// Un client "ping" ici pour dire "je suis en ligne"
app.post('/presence', (req, res) => {
  const nick  = String(req.body?.nick  || 'invité').trim().slice(0, 32);
  const room  = String(req.body?.room  || '#general').trim().slice(0, 64);
  const color = String(req.body?.color || 'blue').trim().slice(0, 16);

  // Clé simple: IP + nick (suffisant pour une V1)
  const key = `${req.ip}|${nick.toLowerCase()}`;

  presence.set(key, { nick, room, color, last: Date.now() });
  prunePresence();
  res.json({ ok: true });
});

// La page "Connecté(e)s" lit ici la liste
app.get('/presence', (req, res) => {
  prunePresence();
  res.json({ list: Array.from(presence.values()) });
});
