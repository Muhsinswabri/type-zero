# TypeZero

**Start at Zero. Type Like a Pro.**

A touch-typing trainer for people who have never learned to type. Structured lessons, a real-time typing engine, an interactive keyboard with finger guidance, speed tests, practice modes, XP, achievements and analytics.

Everything runs in the browser. There is no backend, database, account, or paid service. Progress is stored in `localStorage` on the current device.

## Commands

```bash
npm install
npm run dev        # development server at http://localhost:5173
npm run test       # Vitest (unit + component tests)
npm run typecheck  # tsc --noEmit
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build locally
```

## Stack

React 18, Vite 5, TypeScript (strict), Tailwind CSS 3, React Router 6, Recharts (lazy-loaded), Lucide icons, Vitest + React Testing Library.

## What is in it

| Area | Notes |
| --- | --- |
| Onboarding | Starting level, daily goal, layout. Optional 30-second quick test that suggests a level. No registration. |
| Curriculum | 9 modules, 46 lessons, 139 exercises, all data-driven in `src/data/curriculum.ts`. |
| Progression | Linear prerequisites, completion by accuracy (and WPM where set), retry any time, replay completed lessons without extra XP. Settings can unlock everything. |
| Keyboard | QWERTY with finger zones, next-key highlight, Shift hand hint, correct/error flash, physical and on-screen input, ten-finger guide. |
| Speed test | 15/30/60/120 s, six passage categories (including custom text), results with comparison to the previous best. |
| Practice | Individual keys, rows, words, sentences, punctuation, weak keys (from your own mistakes), free typing, custom text. |
| Gamification | XP, levels, daily challenge (deterministic per date), streaks, 15 achievements. All reward numbers live in `src/data/rewards.ts`. |
| Analytics | Speed/accuracy trends, daily minutes, weakest keys, common errors, curriculum completion, 7d/30d/all-time filters. Empty states instead of fake data. |
| Data | Export/import JSON with validation, reset with confirmation, corruption recovery, quota handling. |

## Project structure

```
src/
  components/
    layout/      AppShell (sidebar, mobile nav, storage banner)
    keyboard/    Keyboard, FingerGuide
    typing/      TypingPane, TypingText, ResultSummary
    lessons/     KeyExplorer
    charts/      Charts (Recharts), LazyCharts
    ui/          ProgressBar, Dialog, Toast, Segmented, Switch, ErrorBoundary...
  pages/         Welcome, Home, Learn, Lesson, Test, Practice, Progress, Achievements, Settings, NotFound
  data/          curriculum, passages, words, achievements, challenges, rewards, keyboard
  hooks/         useTypingEngine, useTimer, useProgress (state + persistence), useLeaveGuard
  lib/           typingEngine, typingMetrics, progression, levels, dates, storage, validation,
                 fingerMapping, textGen, drills, analytics, sessionBuilder, defaults, rng, sound
  test/          Vitest suites and helpers
```

Responsibilities are split deliberately: `lib/typingEngine.ts` and `lib/progression.ts` are pure functions with no React or storage, so the rules are easy to test. `hooks/useProgress.tsx` is the only place that touches storage.

## Metric conventions

These are used consistently by lessons, tests, practice and analytics (`src/lib/typingMetrics.ts`).

- **Typed**: every character keystroke. Backspace is not counted. Mistakes that are later corrected still count.
- **Correct / incorrect**: whether the keystroke matched the expected character at that moment.
- **Uncorrected errors**: characters still wrong in the final input.
- **Gross WPM** = `(typed / 5) / minutes`
- **Net WPM** (the primary score) = `max(0, (typed / 5 − uncorrected errors) / minutes)`, i.e. gross WPM minus uncorrected errors per minute.
- **Accuracy** = `correct / typed × 100`, capped to 0–100. This is keystroke accuracy, so a mistake you fix still costs accuracy. With nothing typed it reports 100.
- Elapsed time is floored at 1 second so very short sessions never divide by ~zero. It is computed from monotonic timestamps (`performance.now`), not from counting ticks, and the timer starts at the first keystroke.
- A session ends exactly at its time limit. Keystrokes that arrive after the limit are not counted.
- **Speed records** (best/average WPM, speed achievements, personal bests) need at least 20 keystrokes over at least 10 seconds, so tiny bursts cannot set records. Accuracy achievements need at least 20 keystrokes.
- Free typing has no target text, so it records speed only. Accuracy is stored as `null` and excluded from accuracy averages.

Typing difficulty (Settings):

- **Easy**: a wrong key is counted but the cursor waits for the right key.
- **Medium**: mistakes move on and Backspace works.
- **Hard**: mistakes move on and Backspace is disabled.

Speed tests always use the medium rules so results are comparable.

## XP, levels and anti-farming

- Level formula: cumulative XP to reach level `L` is `50 × (L − 1) × L` (100 XP for level 2, 300 for level 3, 600 for level 4…).
- Lesson XP is awarded once per lesson, on first completion. Replays give none.
- Practice and speed-test XP require a minimum length and are capped per day (5 each). Sessions are only saved when finished, so restarting an exercise never earns XP.
- Accuracy milestones (95% and 100%) and every achievement reward are one-time. The daily challenge pays once per date. Personal bests only pay when a previous test best exists and is beaten.
- A session id that was already recorded is ignored, so React re-renders, double effects or double clicks cannot duplicate rewards.
- Streaks use local calendar dates (`YYYY-MM-DD`). Several sessions on one date count once, a gap resets to 1, and a clock that moves backwards leaves the streak untouched.

## Local data

Saved under the `typezero:state` key as one versioned object (`version: 1`). A backup of anything unreadable is kept under `typezero:backup`.

- Each section is validated on load, so one malformed field does not wipe the rest. Invalid sections reset to defaults, the raw data is backed up, and a notice is shown.
- Data from a newer schema version is never overwritten.
- If storage is unavailable, the app keeps working in memory and shows a warning. If a write fails because storage is full, older sessions are trimmed from the stored copy and retried once.
- **Retention**: the latest 500 sessions are kept in detail. Lifetime totals, best scores, per-key statistics, daily activity (last 730 days), lesson progress, XP, achievements and streaks are kept beyond that.
- Export produces a JSON file (`app`, `schemaVersion`, `exportedAt`, settings, lessons, sessions, stats, XP, achievements, streak, daily activity, challenges). Import validates structure, ignores prototype-pollution keys, never evaluates content, and asks for confirmation before replacing progress.

## Input handling

There are no global key listeners. A focused (visually hidden) `<input>` over the text receives the keystrokes, so buttons, navigation, dialogs and form fields behave normally. Printable keys are handled once on `keydown` (auto-repeat ignored), and an `input` fallback covers software keyboards. If the tab is hidden during a running session, the session restarts and nothing is saved.

## Accessibility

Semantic landmarks and skip link, visible focus rings, labelled controls, accessible dialog (focus trap, Escape, focus return), `prefers-reduced-motion` support plus a manual setting, errors shown with underline as well as colour, a screen-reader copy of the text to type, and a single "finished" announcement instead of per-keystroke chatter. The on-screen keyboard buttons are mouse/touch targets and are skipped by Tab, since physical typing is the main interaction.

## Deploying to Vercel

It is a static Vite app.

1. Push the repository to GitHub/GitLab/Bitbucket (or use the Vercel CLI).
2. Import the project in Vercel. The framework preset is detected as **Vite**.
3. Build command `npm run build`, output directory `dist`. No environment variables.

`vercel.json` already contains the SPA fallback (all paths rewrite to `/index.html`) so deep links like `/learn/m2-left` work.

Other static hosts work too. Serve `dist/` and rewrite unknown paths to `index.html`.

## Adding content

- **Lessons**: add a spec to `MODULES` in `src/data/curriculum.ts`. Keys, allowed characters and ids are derived automatically, and the curriculum tests check that early lessons only use keys already taught.
- **Passages**: edit `src/data/passages.ts`.
- **Achievements / challenges / XP**: `src/data/achievements.ts`, `challenges.ts`, `rewards.ts`.
- **Keyboard layouts**: add a layout to `LAYOUTS` in `src/data/keyboard.ts`. Finger mapping and the on-screen keyboard are built from it.

## Limitations

- QWERTY (US) is the only layout implemented. The layout data structure is ready for more.
- Progress is per browser profile and is not synced between devices. Use Export/Import to move it.
- On touch devices a software keyboard works for typing, but touch-typing training is intended for a physical keyboard.
- Sound effects are minimal synthesized tones (off by default).
