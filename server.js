// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

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
