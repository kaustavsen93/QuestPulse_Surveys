# QuestPulse

QuestPulse turns a survey into a short story game. A business says what it wants to learn, Gemini writes the questions and a game around them, and people answer by playing from a short link. Games work in English and Hindi and are written for audiences in India, including villages and small towns.

## How it works

1. **Create.** The business describes its goal, picks a game, and chooses the number of questions, the language and the tone. `POST /api/games/generate` asks Gemini for a game config (prompts in `lib/gamePrompts.js`). The server checks it (`public/games/core/validators.js`), repairs small art slips itself, rejects American wording, and gives Gemini one chance to fix anything else.
2. **Edit.** The Game Editor shows the questions on the left, a live preview of the real game in the middle, and **Styles** on the right: heading and body fonts (each "Game default" or a Google Font that also writes Hindi) and a colour palette. The palette colours the whole game (buttons, options, cards, headings, progress, map or HUD, end screen) and is kept at WCAG AA contrast whatever is picked. Prev / Next steps through every screen. **New question** rewrites one question with AI. **Game type** switches to another game: the questions and survey name stay exactly as they are, the AI writes the new story around them (`POST /api/games/convert`), and the palette and fonts carry over; **Undo** puts the previous game back. **Test game** plays the whole game in the page; test plays are never saved and never give a coupon.
3. **Publish.** Signed in, drafts save on the server (**Save draft**, and automatically 30 seconds after an edit) and are never shown to players. **Publish** gives a short link such as `/s/k7Mfq2`, with an optional coupon reward. Publishing again puts edits live at the same link and keeps earlier answers. Signed out, the draft stays on the device until the user signs in. On a phone the editor's top bar keeps **Test** and **Publish**; Change game type, Save draft and Take the tour are under the three dots.
4. **Play.** The link opens the game in `public/games/`. Story text never comments on answers, so the game doesn't steer them. Each finished game saves one response and can earn a coupon.
   - **Voice notes.** Every open-answer question has **Speak your answer** above the answer box, so people who'd rather not type can talk instead (up to 90 seconds). The recording is uploaded when they tap Stop (`POST /api/surveys/:code/questions/:id/voice`, with the play token), Gemini writes down what was said in the language it was said in, and the words fill the answer box for them to check or fix. They can play it back, record again or remove it. In a test play, a signed-in business hears the same flow without anything being saved (`POST /api/voice/transcribe`).
5. **Coupons.** The end screen shows the coupon code once, with Copy; nothing is kept on the device. **Sign in to save this coupon** opens sign-in in a new tab, and once the player signs in the coupon is saved to their account. A player who is already signed in saves it straight away. Saving uses a one-time claim token that only the browser that earned the coupon gets (`POST /api/coupons/claim`), so it can't be claimed twice. Players see their coupons, and whether each has been used, under **My coupons** (`GET /api/me/coupons`).
6. **Results.** The analytics page shows each question's answers, an AI summary once 3 people have finished, and a CSV download. Answers given by voice show their transcript with **Play voice note** (`GET /api/surveys/:code/voice-notes/:id`, owner only). The transcript is the answer, so the AI summary and the CSV include it. Coupons are checked and redeemed there.

### Accounts

There are two kinds of account, chosen at sign-up with an email and password:

- **Business** accounts build, publish and analyse games and redeem coupons. They never see My coupons.
- **Player** accounts only keep coupons and see My coupons. Every business route answers 403 to a player, and the coupon routes answer 403 to a business.

**Forgot password?** on the log-in page emails a link to choose a new password (`POST /api/auth/forgot`, then `POST /api/auth/reset`). It needs an SMTP account (see below); running locally without one, the link is printed in the server log instead.

**Deleting a survey:** each card on the dashboard has a delete button (`DELETE /api/surveys/:code`, owner only). After a warning that it can't be undone, the survey or draft is deleted with its link, every response and voice note, the analytics and AI summary, and its coupons, including ones players saved.

## The games

| Game | What happens | Questions |
| --- | --- | --- |
| Detective | Witnesses trade clues for answers until the case is solved | 3 to 12 |
| RPG quest | A walk across a storybook map; each stop's inhabitant asks one question and gives an item | 3 to 15 |
| Quiz show | A TV host runs a round per question; every answer scores the same | 3 to 10 |
| Platformer | Run and jump to checkpoints; no lives, no timer, and the running can be skipped | 3 to 10 |

Each game is drawn in a setting that fits the business: bakery, café, restaurant, shop, clothes shop, pet shop, salon, gym, clinic, hotel, office, school or village. For a place none of these fits (a bank branch, a garage), Gemini describes a **custom** scene from a fixed kit of hand-drawn parts and simple shapes; it never writes markup. Online services get each game's own plain look.

## Setup

Requires Node.js 18 or later (`app.yaml` deploys on Node 20).

```bash
npm install
cp .env.example .env
```

Put your Gemini API key in `.env`, then:

```bash
npm start
```

Open http://localhost:8080.

### Environment variables

| Variable | Needed | What it does |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes | Key for the Gemini API |
| `GEMINI_MODELS` | No | Models to try first, in order, comma-separated |
| `BACKUP_MODELS` | No | Models tried when the Gemini ones fail. Defaults to `gemma-4-26b-a4b-it,gemma-4-31b-it` |
| `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `GOOGLE_CLOUD_ACCESS_TOKEN`, `GOOGLE_CLOUD_MODELS` | No | Also try models on Vertex AI |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | When deployed, for password reset | The email account reset links are sent from, e.g. Gmail with an app password (`smtp.gmail.com`, port 465) |
| `PUBLIC_URL` | When deployed, for password reset | The address people open the site at, used for links in emails. Never taken from the request |
| `PLAY_TOKEN_SECRET` | When deployed | Signs play tokens. Use the same long random value on every server instance |
| `STORAGE` | No | `firestore` to store data in Cloud Firestore instead of SQLite |
| `PORT` | No | Defaults to 8080 |

The server tries up to 3 Gemini models per request, starting the next one if the first is slow, and keeps time in reserve for the backup models. A whole generation is limited to 2 minutes. "Write it with AI" and a live "New question" answer within 5 seconds or say the AI is busy.

## Storage

`lib/store.js` has two backends with the same methods:

- **SQLite** (the default): a file at `data/questpulse.sqlite`, created on first run and not committed. Good for local development.
- **Firestore** (`STORAGE=firestore`): for Cloud Run or App Engine, where local files are lost on restart. The server uses its own Google Cloud credentials; `firestore.rules` refuses every direct browser request.

It keeps accounts (with their role), sessions, surveys (drafts and published), responses, voice notes and coupons. A voice note is kept once its response is saved; notes from games nobody finished are deleted after 2 days. A coupon's claim token is stored only as a SHA-256 hash, along with the player who saved it.

## Security and limits

- Passwords are salted `scrypt` hashes. Logins last 30 days; logging out ends the session on the server.
- Password-reset links work once and for an hour; only their SHA-256 is stored. "Forgot password?" answers the same way, and in the same time, whether or not the email has an account, and sends at most 3 links an hour per email (5 requests an hour per IP address). A new password ends every other login of the account.
- Rate limits per hour: voice notes 60 per survey per IP address (up to 1 MB each), test-play voice notes 30 per account, game generation 10 per IP address, brief feedback 120, brief writing 30, new questions 40, spare questions 20, AI summaries 30 per account, and 30 responses per survey per IP address.
- Loading a survey gives the game a signed play token, and saving answers needs one. Each token saves one response.
- Coupons go only to games that took at least 1 second per question (timed on the server) with no more than half the answers rushed, and at most 5 per survey per IP address per day. Answers past these limits are still saved.

Rate limits live in memory, so they reset on restart and each server instance counts separately.

## Deploying

`app.yaml` is set up for App Engine:

```bash
gcloud app deploy
```

Set `STORAGE=firestore` and keep `GEMINI_API_KEY` and `PLAY_TOKEN_SECRET` in Secret Manager, never in `app.yaml` or source files. `.gcloudignore` keeps tests, local data and `.env` out of the upload.

## Tests

The tests use Playwright and need the server running (on port 8080, or set `BASE`):

```bash
npm start
npm run test:games
npm run test:detective-visual
```

`test:games` plays every game with the keyboard, checks accessibility with axe-core, and tests the published-survey API. `test:detective-visual` compares the detective game pixel for pixel with `reference/detective-survey.html`. Screenshots go to `tests/screens/`, which isn't committed.

## Project structure

```text
server.js                 Express server: accounts, AI generation, drafts, surveys, responses, coupons
lib/store.js              Storage: SQLite, or Firestore with STORAGE=firestore
lib/gamePrompts.js        Prompts and schema for each game type
lib/assist.js             Brief feedback, brief writing, new questions and AI summaries
lib/scenery.js            Prompt for custom scenes
lib/firstAnswer.js        Runs AI calls across models and takes the first good answer
lib/mailer.js             Sends emails (password-reset links) through SMTP
public/index.html         The business app: builder, Game Editor, dashboard, analytics
public/games/             The four games: detective, rpg, quiz, platformer
public/games/core/        Shared game code: validation, scenes and art, Hindi text, voice notes, saving answers and coupons
public/games/samples/     Sample games for every setting
tests/                    Playwright tests
reference/                The original detective design, used by the visual test
```
