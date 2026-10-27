# Keyflow

A calm, endless typing experience. No timer, no end screen — a stream of words
fades in and out while you type, and every session is measured quietly in the
background.

Live: [keyflow-bay.vercel.app](https://keyflow-bay.vercel.app/)

## What it does

- **Endless typing.** Words are appended from a shuffle bag as you go; the text
  scrolls one line at a time behind a fixed mask, and the active line always
  sits in the second slot. The word list rebases every ~300 words, so the DOM
  stays bounded for runs of any length.
- **Three-tone text.** Upcoming words in the secondary colour, the current word
  in primary, typed text in tertiary, mistakes in the error colour with a soft
  glow. JetBrains Mono, no ligatures.
- **The notch.** A toolbar glued to the top edge — concave shoulders blending
  it into the screen, the `KEYFLOW` wordmark and five panels — text source,
  themes, sound, reports, account. It slides up out of the way while you type
  (stats take its place) and comes back on mouse move, `Esc`, or after 2.5 s
  without keys.
- **Live stats.** Rolling 10-second WPM and accuracy, digits rolling vertically,
  written straight to the DOM four times a second — no React render per tick.
- **Six themes** (Ember, Midnight, Moss, Plum, Paper, Mist), applied before the
  first paint and cross-faded with the View Transitions API.
- **Sound with zero assets.** Soft/Clicky/Thock packs are synthesised in Web
  Audio on the first keystroke — filtered noise plus a decaying sine.
- **Automatic sessions.** A session closes after 10 s idle, on restart, on a
  dataset change or when the tab is hidden. Guests keep them in IndexedDB;
  signed-in users also sync them to Postgres.
- **Reports** (`/reports`) — averages, best speed, accuracy, consistency, day
  streak, a WPM/accuracy chart, the sessions table with per-second detail, top
  5 problem keys, slowest keys, and JSON export or one-click deletion.
- **Guest-first accounts.** Username + password, inside the notch (no modal).
  Local sessions upload automatically after sign-in and merge by id.

Keyboard: `Tab` / `Shift+Enter` new text · `Enter` restart · `Backspace` ·
`Ctrl/Alt+Backspace` erase a word · `Esc` bring the toolbar back.

## Stack

- **Frontend** — React 19 + Vite 7, hand-written CSS, no UI, chart or animation
  library. `/reports` and the account panel are lazy chunks; keystrokes never
  cause a React render.
- **Backend** — Django 5, session auth with CSRF, Django ORM. SQLite locally,
  Postgres in production.
- **Hosting** — SPA on Vercel, API on Azure App Service, `/api` rewritten
  through Vercel so the browser sees a single origin and cookies stay
  first-party. See [DEPLOY.md](DEPLOY.md).

## Local development

Requires Node 20+ and Python 3.11+.

One command from the repo root starts both servers (creates the venv, installs
dependencies, migrates, then runs Django on `:8000` and Vite on `:5173`;
`Ctrl+C` stops both):

```bash
./startup.sh
```

`./startup.sh backend` or `./startup.sh frontend` runs just one side. The
manual steps below are what the script does for you.

### Backend

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver
```

API: `http://localhost:8000`. The example `.env` uses `DJANGO_DEBUG=True` and a
throwaway secret — never use those in production.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` to Django, so no environment
variables are needed. Leave `VITE_API_BASE_URL` empty if you create
`frontend/.env.local`.

## Checks

```bash
cd frontend
npm run test:metrics   # pure metrics formulas
npm run lint
npm run build

cd ../backend
python manage.py check
python manage.py test
```

### Perf harness

`npm run perf` drives headless Chrome against the production preview build at
`http://localhost:4173/?perf` (it starts `vite preview` for you): 300 synthetic
keystrokes at 12 ms intervals, reporting per-key handler time, frame gaps and
long tasks. With the **Flow glow** toggle switched on first, it also runs
alternating passes with the glow forced on and off so the two can be compared.
`PERF_ENDLESS=1` adds a 1400-key endless run that proves the rebase keeps the
DOM bounded; `PERF_GPU=1` asks Chrome for its GPU path.

## Layout

```
backend/
  keyflow/           models (User, TypingSession), API views, tests
  backend/           settings, URLs, WSGI, no-store middleware
  startup.sh         App Service: migrate, collectstatic, gunicorn
frontend/
  src/components/    TypingTest, Notch (panels), AccountPanel, Reports, Icons
  src/hooks/         useTypingTest (engine), useAuth, useTypingSound
  src/contexts/      themes, settings, open-panel state
  src/utils/         metrics, session recorder, storage, sync, router, layout,
                     rolling numbers, view transitions, perf harness
  src/styles/        index.css, reports.css
  scripts/           metrics tests, headless perf driver
infra/azure-setup.sh Azure resource + app setting setup
.github/workflows/   CI and backend deployment
```
