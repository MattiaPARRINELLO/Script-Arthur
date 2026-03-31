// ─────────────────────────────────────────────
// server.js — Serveur Express + WebSocket
// Timer scénique temps réel
// ─────────────────────────────────────────────

const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Sert les fichiers statiques du dossier /public
app.use(express.static(path.join(__dirname, 'public')));

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
  const message = JSON.stringify(timerState);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  });
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

// ─── Gestion des connexions WebSocket ───
wss.on('connection', (ws) => {
  console.log('[WS] Client connecté — total :', wss.clients.size);

  // Envoie l'état actuel au nouveau client (resynchronisation)
  if (timerState.status === 'running' && timerState.startedAt) {
    const elapsed = Math.floor((Date.now() - timerState.startedAt) / 1000);
    timerState.remaining = Math.max(0, timerState.duration - elapsed);
  }
  ws.send(JSON.stringify(timerState));

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return; // Message invalide, on ignore
    }

    switch (msg.action) {
      // ── Définir le temps ──
      case 'set': {
        const duration = parseInt(msg.duration, 10);
        if (!duration || duration <= 0) return;
        stopTick();
        timerState = {
          status: 'set',
          duration: duration,
          startedAt: null,
          remaining: duration
        };
        console.log(`[TIMER] Temps réglé : ${duration}s`);
        broadcast();
        break;
      }

      // ── Lancer le décompte ──
      case 'start': {
        if (timerState.status !== 'set') return;
        timerState.status = 'running';
        timerState.startedAt = Date.now();
        console.log('[TIMER] Décompte lancé');
        broadcast();
        startTick();
        break;
      }

      // ── Réinitialiser ──
      case 'reset': {
        stopTick();
        timerState = {
          status: 'idle',
          duration: 0,
          startedAt: null,
          remaining: 0
        };
        console.log('[TIMER] Réinitialisé');
        broadcast();
        break;
      }
    }
  });

  ws.on('close', () => {
    console.log('[WS] Client déconnecté — total :', wss.clients.size);
  });
});

// ─── Démarrage du serveur ───
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
  console.log(`Timer : http://localhost:${PORT}/timer.html`);
  console.log(`Admin  : http://localhost:${PORT}/admin.html`);
});
