# Pomodoro

A focus timer I built to stop myself from doom-scrolling between work blocks. It does the usual Pomodoro thing (work, short break, long break), but it also keeps track of what you actually got done, so you can look back at your week and see where the hours went.

Live version: https://pomodoro-green-chi.vercel.app

## What it does

- Three timer modes: Pomodoro, Short Break and Long Break, with the long break kicking in after every four focus sessions.
- Pick your focus length. Go with 25 minutes for classic Pomodoro, 50 if you want longer deep-work blocks (a 50 counts as two pomodoros), or drop into a plain count-up stopwatch when you don't feel like a fixed timer.
- Tag each session with a subject (Work, AI, Math, whatever you're on) so the stats aren't just one big undifferentiated pile.
- A reports view with Summary and Detail tabs: total pomodoros, hours focused, how many days you actually showed up, and a monthly focus-hours chart.
- A Ranking tab that puts everyone who uses the app side by side. It ranks on four things — focus hours, active days, best single day and longest streak — because ranking on volume alone just rewards whoever has the most free time. Each of the four tiles names its current champion and re-sorts the board when you tap it.
- Three themes. Classic Red, a darker Cyberpunk HUD, and a pastel Kitty Pink one, and your pick sticks between visits.
- Sign in with Google. Nothing to remember, and the session stays put after you close the tab.
- A bell rings when a block ends, the browser tab title counts down while you work, and the favicon changes so you can tell at a glance whether the timer is running.

One bit I'm a little proud of: the countdown runs inside a Web Worker (`public/timer-worker.js`) instead of a regular `setInterval`. Browsers throttle timers in background tabs, sometimes all the way down to once a minute, which would make a Pomodoro timer pretty useless the second you switch away. The worker doesn't get throttled, so the count stays honest even when the app isn't the tab you're looking at.

## Built with

- Next.js 15 (App Router, plus a handful of Pages-Router API routes) and React 19
- TypeScript and Tailwind CSS
- shadcn/ui components, with Radix doing the heavy lifting underneath
- Redux Toolkit for the stats state
- NextAuth for Google sign-in
- MongoDB, through both Mongoose and the native driver
- Chart.js and Recharts for the report charts
- Howler for the bell

## Running it locally

You'll need Node 18.18 or newer (I'm on 22) and a MongoDB database. A free Atlas cluster works fine.

This repo uses Yarn. There's a leftover `package-lock.json` in here too, but `yarn.lock` is the one that's actually kept current, so stick with Yarn or the two will drift apart.

```bash
git clone https://github.com/quocanhto85/Pomodoro.git
cd Pomodoro
yarn install
cp .env.example .env.local   # then fill it in, see below
yarn dev
```

That brings the app up on http://localhost:3000.

Small heads up about the `dev` script: it runs a cleanup task, starts Next, and tries to pop open a browser tab all in one go. The browser-open part uses the Mac `open` command, so on Linux or Windows that piece just fails quietly and you open the URL yourself.

### Environment variables

Everything lives in `.env.local`, and you don't need to wrap the values in quotes.

| Variable | What it's for |
| --- | --- |
| `MONGODB_URI` | Connection string for your Mongo database |
| `NEXTAUTH_SECRET` | Signs the session cookie. Make one with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Your site's base URL, e.g. `http://localhost:3000` while developing |
| `GOOGLE_CLIENT_ID` | From your Google OAuth credentials |
| `GOOGLE_CLIENT_SECRET` | Same place |
| `ALLOWED_EMAILS` | Optional. Comma-separated allowlist. Leave it empty to let any Google account sign in |
| `OWNER_EMAIL` / `OWNER_USER_ID` | Optional. Pins a specific account to a fixed data id |

### Setting up Google sign-in

1. In the Google Cloud Console, create an OAuth client ID and choose "Web application".
2. Add the redirect URI `<your-url>/api/auth/callback/google`. Locally that's `http://localhost:3000/api/auth/callback/google`. Add your production URL the same way.
3. Paste the client ID and secret into `.env.local`.

There's no separate sign-up screen. The first time someone signs in with Google, their account gets created right then.

## How the code is laid out

```
src/
  app/            App Router pages, the root layout, the NextAuth route, the login screen
  pages/api/      Pomodoro data endpoints (sessions, stats, subjects, and so on)
  components/     timer, report, common, and the ui (shadcn) pieces
  store/          Redux Toolkit slice for stats
  db/mongodb/     Mongo client and the PomodoroSession model
  providers/      Auth, Redux and Theme context
  hooks/          useTimer and the smaller hooks
  helpers/        constants and little utilities
public/           bell_sound.wav and the timer Web Worker
server.ts         a Socket.io server that only runs in local dev
```

Your focus history sits in MongoDB keyed to your Google account, so it travels with you across devices.

A quick word on `server.ts`: it's a small Socket.io server that exists only for local development, where it tells the open browser tab when the dev server is restarting. Vercel runs serverless and can't hold a long-lived socket open, so it's left out of the deploy and the app runs perfectly well without it.

## Scripts

```bash
yarn dev      # start the local dev server
yarn build    # production build
yarn start    # run the built app
yarn lint     # eslint
```

## Deploying

It's wired up for Vercel. Push to `main`, set the same environment variables in the Vercel dashboard (and remember to register your production redirect URI with Google), and it deploys itself.

## License

MIT. See [LICENSE](LICENSE) for the details.
