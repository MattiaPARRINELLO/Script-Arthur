// ─────────────────────────────────────────────
// server.js — Serveur Express + Socket.IO
// Timer scénique temps réel
// ─────────────────────────────────────────────

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Sert les fichiers statiques du dossier /public
app.use(express.static(path.join(__dirname, 'public')));

// ─── Routes propres ───
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/timer', (req, res) => res.sendFile(path.join(__dirname, 'public', 'timer.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// ─── État du timer en mémoire ───
let timerState = {
  status: 'idle',    // 'idle' | 'set' | 'running' | 'finished'
  duration: 0,       // secondes totales définies
  startedAt: null,   // timestamp ms du lancement
  remaining: 0       // secondes restantes
};

let tickInterval = null;

// ─── Broadcast l'état à tous les clients connectés ───
function broadcast() {
  io.emit('state', timerState);
}

// ─── Tick toutes les secondes quand le timer tourne ───
function startTick() {
  stopTick();
  tickInterval = setInterval(() => {
    if (timerState.status !== 'running') {
      stopTick();
      return;
    }

    // Calcul du temps restant basé sur le timestamp de départ
    const elapsed = Math.floor((Date.now() - timerState.startedAt) / 1000);
    timerState.remaining = Math.max(0, timerState.duration - elapsed);

    if (timerState.remaining <= 0) {
      timerState.remaining = 0;
      timerState.status = 'finished';
      stopTick();
      console.log('[TIMER] Temps écoulé !');
    }

    broadcast();
  }, 1000);
}

function stopTick() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}

// ─── Gestion des connexions Socket.IO ───
io.on('connection', (socket) => {
  console.log('[IO] Client connecté — total :', io.engine.clientsCount);

  // Envoie l'état actuel au nouveau client (resynchronisation)
  if (timerState.status === 'running' && timerState.startedAt) {
    const elapsed = Math.floor((Date.now() - timerState.startedAt) / 1000);
    timerState.remaining = Math.max(0, timerState.duration - elapsed);
  }
  socket.emit('state', timerState);

  // ── Définir le temps ──
  socket.on('set', (duration) => {
    const dur = parseInt(duration, 10);
    if (!dur || dur <= 0) return;
    stopTick();
    timerState = {
      status: 'set',
      duration: dur,
      startedAt: null,
      remaining: dur
    };
    console.log(`[TIMER] Temps réglé : ${dur}s`);
    broadcast();
  });

  // ── Lancer le décompte ──
  socket.on('start', () => {
    if (timerState.status !== 'set') return;
    timerState.status = 'running';
    timerState.startedAt = Date.now();
    console.log('[TIMER] Décompte lancé');
    broadcast();
    startTick();
  });

  // ── Réinitialiser ──
  socket.on('reset', () => {
    stopTick();
    timerState = {
      status: 'idle',
      duration: 0,
      startedAt: null,
      remaining: 0
    };
    console.log('[TIMER] Réinitialisé');
    broadcast();
  });

  socket.on('disconnect', () => {
    console.log('[IO] Client déconnecté — total :', io.engine.clientsCount);
  });
});

// ─── Démarrage du serveur ───
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
  console.log(`Accueil : http://localhost:${PORT}/`);
  console.log(`Timer   : http://localhost:${PORT}/timer`);
  console.log(`Admin   : http://localhost:${PORT}/admin`);
});
