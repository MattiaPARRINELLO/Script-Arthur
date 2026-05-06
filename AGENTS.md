# timer-thriller — AGENTS.md

## Stack
- **Server**: Node.js, Express, Socket.IO
- **No build step, no bundler, no tests, no linter**

## Quick start
```sh
npm start           # or: node server.js
# listens on http://localhost:3000
```

Port is configurable via `PORT` env var.

## Routes
| Path | Purpose |
|---|---|
| `/` | Landing page with links |
| `/timer` | Timer display (full-screen ready, `user-scalable=no`) |
| `/admin` | Admin panel to control the timer |

## Architecture
- **server.js** is the single entrypoint. Express serves static files from `public/` and provides clean routes for the 3 pages.
- **Socket.IO** handles real-time state sync. Server is the single source of truth.
- **Timer state is in-memory only** — restarting the server resets everything.
- All labels, UI text, comments, and commit messages are in **French**.

## Socket.IO events (server → client)
| Event | Payload | When |
|---|---|---|
| `state` | `{ status, duration, progressDuration, startedAt, remaining }` | On connect, and every tick / state change |

## Socket.IO events (client → server)
| Event | Payload | Effect |
|---|---|---|
| `set` | `duration` (seconds, int) | Set timer duration, status → `set` |
| `setProgress` | `duration` (seconds, int) | Set progress bar duration independently |
| `start` | — | Start countdown (only allowed from `set` status) |
| `reset` | — | Reset to `idle` |

## Timer state machine
```
idle → set → running → finished
       ↑______________↓
```
`reset` from any state goes back to `idle`.
