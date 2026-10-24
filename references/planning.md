# Planning a series

## Contents
1. Learn the system first
2. Who is watching
3. The episode template
4. A series is one session
5. The persona and the data
6. The plan to show the user

## 1. Learn the system first

Before writing a line, know what a newcomer will actually meet:

- **Read** the README, architecture notes, any demo/seed-data doc, the role and
  permission model, the nav (sidebar/menu source), and the app's translation
  files — the on-screen labels you will quote come from there.
- **Run it** with realistic data. A seeded demo dataset beats an empty dev DB:
  empty states make poor teaching material. If the project has a demo seed,
  use it; if not, plan one (see `stack.md`).
- **Walk it as the audience** with `scripts/explore.mjs <project> --user <login> / /page …`.
  Read the screenshots for what's worth showing and the outline for how to
  target it: `data-slot`, `data-testid`, roles and accessible names are stable
  selectors; utility classes are not.
- **Note what happens automatically** — a check-in on sign-in, a welcome tour
  on first login, a timer that switches — those are teaching moments and also
  traps (a tour that appears only once changes the flow on re-recording).

## 2. Who is watching

Ask, or infer and confirm: new staff vs customers, their role (one role per
series — an employee doesn't need admin screens), language and dialect,
where they'll watch (onboarding portal, WhatsApp, LMS), and how much they
already know. Role and language decide everything downstream.

## 3. The episode template

- **One job per episode**, named by the outcome: "Request leave", not "The
  leave page". 30–90 seconds. If it needs more, split it.
- **Shape**: orient (where we are, one line) → do the task (the cursor does it,
  narration says what and why) → confirm (show the result on screen) → bridge
  (the outro names the next episode automatically).
- **Point before you click**: highlight what matters, then act. A `point` with
  no action is fine; an action with no narration is not.
- **Show results, not just clicks**: after submitting, point at the new row,
  the toast, the changed status.
- 3–10 script lines per episode. Every line earns its place.

Typical "getting started" order for a staff tool:

1. Account setup / first sign-in (invitation link, password, first-run tour)
2. Daily start (sign in, attendance/check-in, where status shows)
3. The home screen (what each tile means, what to look at first)
4. The core task (the thing they're hired to do in the app)
5. Notes/approvals/alerts addressed to them
6. Communication (messages, mentions, notifications)
7. Requests (leave, expenses, access)
8. End of day (check-out, reviewing their own record)

Customer-facing products swap 4–8 for their core flows (create, share, pay,
settings, getting help).

## 4. A series is one session

Episodes run in order against one database and the state carries forward:
the account created in episode 1 is the one signing in later; the stage
finished in episode 4 is finished in episode 8. Give each episode an `at`
time on the demo clock so the day progresses (07:50 → 16:05). Consequences:

- A full `npm run record` starts from a fresh copy; re-recording one episode
  alone runs against whatever the last run left (use `--fresh` when that's wrong).
- An episode that mutates something a later one relies on must stay before it.

## 5. The persona and the data

Pick the demo user whose data makes every screen meaningful: assigned work,
something overdue, a note awaiting acknowledgement, unread messages. A new
hire created live in episode 1 shows the first-run experience; switching to
an established persona afterwards is normal and nobody minds.

Never record real customer data. If only production-like data exists, seed a
fictional dataset first.

## 6. The plan to show the user

Before recording, show a table — episode, outcome, key screens, `at` time —
plus the language decision (register, dialect, who speaks). It's cheap to
change here and expensive after a 20-minute recording run.
