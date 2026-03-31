// ─────────────────────────────────────────────
// server.js — Serveur Express + HTTP polling
// Timer scénique temps réel
// ─────────────────────────────────────────────

const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());

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

// ─── Recalcule remaining si le timer tourne ───
function refreshRemaining() {
  if (timerState.status === 'running' && timerState.startedAt) {
    const elapsed = Math.floor((Date.now() - timerState.startedAt) / 1000);
    timerState.remaining = Math.max(0, timerState.duration - elapsed);
    if (timerState.remaining <= 0) {
      timerState.remaining = 0;
      timerState.status = 'finished';
      console.log('[TIMER] Temps écoulé !');
    }
  }
}

// ─── API : récupérer l'état (polling) ───
app.get('/api/state', (req, res) => {
  refreshRemaining();
  res.json(timerState);
});

// ─── API : envoyer une action ───
app.post('/api/action', (req, res) => {
  const { action, duration } = req.body;

  switch (action) {
    case 'set': {
      const dur = parseInt(duration, 10);
      if (!dur || dur <= 0) return res.status(400).json({ error: 'Durée invalide' });
      timerState = {
        status: 'set',
        duration: dur,
        startedAt: null,
        remaining: dur
      };
      console.log(`[TIMER] Temps réglé : ${dur}s`);
      break;
    }

    case 'start': {
      if (timerState.status !== 'set') return res.status(400).json({ error: 'Timer pas réglé' });
      timerState.status = 'running';
      timerState.startedAt = Date.now();
      console.log('[TIMER] Décompte lancé');
      break;
    }

    case 'reset': {
      timerState = {
        status: 'idle',
        duration: 0,
        startedAt: null,
        remaining: 0
      };
      console.log('[TIMER] Réinitialisé');
      break;
    }

    default:
      return res.status(400).json({ error: 'Action inconnue' });
  }

  refreshRemaining();
  res.json(timerState);
});

// ─── Démarrage du serveur ───
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
  console.log(`Accueil : http://localhost:${PORT}/`);
  console.log(`Timer   : http://localhost:${PORT}/timer`);
  console.log(`Admin   : http://localhost:${PORT}/admin`);
});
