require('dotenv').config();
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const compression = require('compression');
const { createStore } = require('./lib/store');
const mailer = require('./lib/mailer');
const { firstAnswer } = require('./lib/firstAnswer');
const assist = require('./lib/assist');
const gamePrompts = require('./lib/gamePrompts');
const sceneryPrompts = require('./lib/scenery');
const { validateGame, repairArt, castMainCharacter, GAME_TYPES, QUESTION_RANGE } = require('./public/games/core/validators.js');

const app = express();
// Gzip every response; the game pages and their scripts shrink to about a third.
app.use(compression());
app.use(express.json());
// A request without a JSON body still gets req.body, so a route reading a field never throws.
app.use((req, res, next) => { if (!req.body || typeof req.body !== 'object') req.body = {}; next(); });

const store = createStore();
console.log(`Storing data in ${store.name}.`);

// Short codes skip look-alike characters (0/O, 1/l/I) so they can be read aloud or typed from a poster.
const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomCode = (length, alphabet = CODE_ALPHABET) => Array.from({ length }, () => alphabet[crypto.randomInt(alphabet.length)]).join('');
// One line of plain text, at most max characters.
const cleanText = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
// For text put into HTML emails.
const escapeHtml = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Logins last 30 days (SESSION_DAYS in lib/store.js).
async function createSession(userId) {
    const token = crypto.randomBytes(24).toString('base64url');
    await store.createSession(token, userId);
    return token;
}

// Also clears voice notes from games that were never finished.
const removeExpiredSessions = () => Promise.all([
    store.removeExpiredSessions().catch(error => console.error('Session cleanup error:', error.message)),
    store.removeExpiredVoiceNotes().catch(error => console.error('Voice note cleanup error:', error.message))
]);
setInterval(removeExpiredSessions, 24 * 60 * 60 * 1000).unref();

const bearerToken = req => String(req.get('authorization') || '').replace(/^Bearer\s+/i, '');

async function requireUser(req, res, next) {
    const token = bearerToken(req);
    if (!token) return res.status(401).json({ error: 'Please log in.' });
    try {
        const user = await store.userForSession(token);
        if (!user) return res.status(401).json({ error: 'Your session has ended. Please log in again.' });
        req.user = user;
        next();
    } catch (error) {
        console.error('Session error:', error.message);
        res.status(500).json({ error: 'Unable to check your session.' });
    }
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
    return new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, 64, (error, derivedKey) => {
            if (error) return reject(error);
            resolve({ hash: derivedKey.toString('hex'), salt });
        });
    });
}

async function passwordsMatch(password, hash, salt) {
    const candidate = await hashPassword(password, salt);
    const expected = Buffer.from(hash, 'hex');
    const actual = Buffer.from(candidate.hash, 'hex');
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function publicUser(user) {
    return { id: user.id, name: user.name, email: user.email, role: user.role || 'business' };
}
// Businesses make surveys and see their answers; players only keep the coupons they earn. Accounts made before roles
// existed are businesses.
const ROLES = ['business', 'player'];
const roleOf = user => user.role || 'business';
const requireRole = role => [requireUser, (req, res, next) => (roleOf(req.user) === role ? next()
    : res.status(403).json({ error: role === 'player' ? 'Coupons are saved to player accounts.' : 'This needs a business account.' }))];
const requireBusiness = requireRole('business'), requirePlayer = requireRole('player');

app.post('/api/auth/signup', async (req, res) => {
    const name = cleanText(req.body.name, 80);
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const role = ROLES.includes(req.body.role) ? req.body.role : 'business';

    if (!name || !email || password.length < 6) {
        return res.status(400).json({ error: 'Name, email, and a password of at least 6 characters are required.' });
    }
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });

    try {
        const { hash, salt } = await hashPassword(password);
        const user = { id: crypto.randomUUID(), name, email, role };
        if (!(await store.createUser({ ...user, passwordHash: hash, passwordSalt: salt }))) {
            return res.status(409).json({ error: 'Email is already registered.' });
        }
        res.status(201).json({ user: publicUser(user), token: await createSession(user.id) });
    } catch (error) {
        console.error('Signup error:', error.message);
        res.status(500).json({ error: 'Unable to create account.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    try {
        const user = await store.userByEmail(email);
        // An account without a password (an empty hash never matches) sets one with "Forgot password?".
        if (user && !user.password_hash) {
            return res.status(401).json({ error: 'This account has no password yet. Use "Forgot password?" to set one.' });
        }
        if (!user || !(await passwordsMatch(password, user.password_hash, user.password_salt))) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        res.json({ user: publicUser(user), token: await createSession(user.id) });
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({ error: 'Unable to log in.' });
    }
});

// Settings the page needs before anyone signs in.
app.get('/api/auth/config', (req, res) => res.json({ passwordReset: mailer.ready }));

/* Forgotten passwords. "Forgot password?" emails a link with a one-time token (only its hash is stored) that works
   for an hour. The answer is the same whether or not the email has an account, so the form can't be used to find out
   who has one. Setting a new password ends every other login of that account. */
const RESET_MINUTES = 60;
const tokenHash = token => crypto.createHash('sha256').update(String(token)).digest('hex');
const forgotLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: 'Too many reset requests. Please wait a while and try again.' });
const forgotPerEmail = createLimiter({ windowMs: 60 * 60 * 1000, max: 3 });
// Setting the password has its own, looser limit, so a mistyped password or two never locks anyone out.
const resetLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: 'Too many tries. Please wait a while and try again.' });

app.post('/api/auth/forgot', forgotLimit, async (req, res) => {
    if (!mailer.ready) return res.status(503).json({ error: 'Password reset is not set up on this server yet.' });
    const email = String(req.body.email || '').trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
    // Answered before the email goes out, so the reply takes the same time whether or not the email has an account.
    res.json({ ok: true });
    try {
        const user = await store.userByEmail(email);
        // No account, or this email asked a few times already: nothing is sent.
        if (!user || forgotPerEmail(email)) return;
        const token = crypto.randomBytes(32).toString('base64url');
        await store.createPasswordReset(tokenHash(token), user.id, RESET_MINUTES);
        const link = `${mailer.publicUrl}/#reset/${token}`;
        await mailer.send({
            to: user.email,
            subject: 'Reset your QuestPulse password',
            text: `Hi ${user.name},\n\nSomeone (hopefully you) asked to reset the password for your QuestPulse account.\n\n`
                + `Choose a new password here:\n${link}\n\nThe link works once and expires in ${RESET_MINUTES} minutes. `
                + `If you didn't ask for this, ignore this email; your password stays the same.\n\nQuestPulse`,
            html: `<p>Hi ${escapeHtml(user.name)},</p><p>Someone (hopefully you) asked to reset the password for your QuestPulse account.</p>`
                + `<p><a href="${link}">Choose a new password</a></p><p>The link works once and expires in ${RESET_MINUTES} minutes. `
                + `If you didn't ask for this, ignore this email; your password stays the same.</p><p>QuestPulse</p>`
        });
    } catch (error) {
        console.error('Password reset email error:', error.message);
    }
});

app.post('/api/auth/reset', resetLimit, async (req, res) => {
    const token = String(req.body.token || ''), password = String(req.body.password || '');
    if (password.length < 6) return res.status(400).json({ error: 'Choose a password of at least 6 characters.' });
    try {
        const userId = token && await store.takePasswordReset(tokenHash(token));
        if (!userId) return res.status(400).json({ error: 'This reset link has expired or was already used. Ask for a new one.' });
        const { hash, salt } = await hashPassword(password);
        await store.setPassword(userId, hash, salt);
        await store.deleteSessionsForUser(userId);
        // Signed in straight away on this device.
        const session = await createSession(userId);
        res.json({ user: publicUser(await store.userForSession(session)), token: session });
    } catch (error) {
        console.error('Password reset error:', error.message);
        res.status(500).json({ error: 'Unable to reset the password.' });
    }
});

// Ends this login on the server too, so a copied token stops working once the user logs out.
app.post('/api/auth/logout', async (req, res) => {
    const token = bearerToken(req);
    if (token) await store.deleteSession(token).catch(error => console.error('Logout error:', error.message));
    res.json({ ok: true });
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

const preferredModels = [
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.8-flash'
];

// Tried after the Gemini models fail, which mostly happens when they are all overloaded. Gemma is slower
// (it always reasons before answering) but often has capacity when Gemini doesn't. BACKUP_MODELS overrides the list.
const backupModels = () => (process.env.BACKUP_MODELS ? process.env.BACKUP_MODELS.split(',') : ['gemma-4-26b-a4b-it', 'gemma-4-31b-it'])
    .map(m => m.trim()).filter(Boolean);
const isGemma = model => /^gemma/.test(model);

// The answer text of a response. Gemma sends its reasoning as "thought" parts first; those are skipped.
const answerText = data => (data.candidates?.[0]?.content?.parts || []).filter(part => !part.thought && part.text).map(part => part.text).join('');

// Thinking tokens count against maxOutputTokens and truncate the JSON; lite models don't think and reject a budget of 0.
function generationConfigFor(model, maxTokens, json) {
    const config = { maxOutputTokens: maxTokens || 1000 };
    // Gemma rejects any thinking setting, and its reasoning counts against the output limit, so give it room.
    if (isGemma(model)) config.maxOutputTokens = Math.max(config.maxOutputTokens * 2, 4096);
    else if (/flash/.test(model) && !/lite/.test(model)) config.thinkingConfig = { thinkingBudget: 0 };
    if (json) config.responseMimeType = 'application/json';
    return config;
}

let availableModelsCache = { models: [], expiresAt: 0 };

function mergeUniqueModels(...sets) {
    const seen = new Set();
    const ordered = [];
    for (const list of sets) {
        for (const value of list || []) {
            const model = String(value || '').trim();
            if (!model || seen.has(model)) continue;
            seen.add(model);
            ordered.push(model);
        }
    }
    return ordered;
}

// Models named in the environment come first, in this order.
const getConfiguredModels = () => mergeUniqueModels(...['GEMMA_MODELS', 'GOOGLE_CLOUD_MODELS', 'GEMINI_MODELS', 'GEMMA_MODEL', 'GOOGLE_CLOUD_MODEL', 'GEMINI_MODEL']
    .map(name => (process.env[name] || '').split(',')));

async function discoverGeminiModels(apiKey) {
    if (availableModelsCache.expiresAt > Date.now()) {
        if (availableModelsCache.failed) throw new Error('model discovery failed recently');
        return availableModelsCache.models;
    }
    // A failed lookup is remembered for a minute, so a slow API doesn't add 10 seconds to every request.
    availableModelsCache = { models: [], expiresAt: Date.now() + 60 * 1000, failed: true };

    const discoveredModels = [];
    let pageToken = '';
    do {
        const query = new URLSearchParams({ key: apiKey });
        if (pageToken) query.set('pageToken', pageToken);
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?${query}`, { signal: AbortSignal.timeout(10000) });
        const data = await response.json();
        if (!response.ok || data.error) {
            throw new Error(data.error?.message || `Gemini model discovery returned HTTP ${response.status}`);
        }
        discoveredModels.push(...(data.models || [])
            .filter(model => model.supportedGenerationMethods?.includes('generateContent'))
            .map(model => model.name?.replace(/^models\//, ''))
            .filter(Boolean));
        pageToken = data.nextPageToken || '';
    } while (pageToken);

    availableModelsCache = { models: discoveredModels, expiresAt: Date.now() + 5 * 60 * 1000 };
    return discoveredModels;
}

// The model list is refreshed in the background and requests use the last list, so no request waits on it.
let knownModels = [], modelRefresh = null;
function refreshModels(apiKey) {
    if (!apiKey || modelRefresh || availableModelsCache.expiresAt > Date.now()) return;
    modelRefresh = discoverGeminiModels(apiKey)
        .then(models => { knownModels = models; })
        .catch(error => console.warn(`Gemini model discovery failed: ${error.message}`))
        .finally(() => { modelRefresh = null; });
}

async function getGeminiModels(apiKey) {
    refreshModels(apiKey);
    const configuredModels = getConfiguredModels();
    return knownModels.length
        ? mergeUniqueModels(configuredModels, preferredModels.filter(model => knownModels.includes(model)), knownModels)
        : mergeUniqueModels(configuredModels, preferredModels);
}

// One generateContent call to Gemini or Google Cloud. Returns the answer text. media: optional { mimeType, data (base64) }
// sent after the text, for a voice note.
async function callModel({ url, headers = {}, what, model, system, user, media, maxTokens, json, signal }) {
    const response = await fetch(url, {
        signal, method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: user }, ...(media ? [{ inline_data: { mime_type: media.mimeType, data: media.data } }] : [])] }],
            generationConfig: generationConfigFor(model, maxTokens, json)
        })
    });
    const data = await response.json();
    if (!response.ok || data.error) throw modelError(response, data, what);
    const text = answerText(data);
    if (!text) throw new Error(`${what} returned an empty response.`);
    return text;
}

// Keeps the HTTP and API status on the error so generateText can tell "try another model" from "stop".
function modelError(response, data, what) {
    return Object.assign(new Error(data.error?.message || `${what} returned HTTP ${response.status}`),
        { httpStatus: response.status, apiStatus: data.error?.status });
}

// Busy or briefly broken: Google's random 500 "Internal error" counts too, since the next model usually works.
function isCapacityError(error) {
    return error.name === 'TimeoutError' || [429, 500, 503].includes(error.httpStatus)
        || ['RESOURCE_EXHAUSTED', 'UNAVAILABLE', 'INTERNAL'].includes(error.apiStatus)
        || /high demand|rate limit|temporarily unavailable|quota/i.test(error.message);
}

// Worth trying a different model: busy, slow, or this model name doesn't exist (any more).
function isRetryableModelError(error) {
    return isCapacityError(error) || error.httpStatus === 404 || /no longer available|not found|does not exist|not supported|empty response/i.test(error.message);
}

class AIError extends Error {
    constructor(message, status) { super(message); this.status = status; }
}

const MAX_MODEL_ATTEMPTS = 3;          // Gemini models tried before the backups
const CALL_TIMEOUT_MS = 30 * 1000;     // one Gemini call
const GENERATION_BUDGET_MS = 120 * 1000;
const BACKUP_RESERVE_MS = 45 * 1000;   // kept back for the backup models, so slow Gemini calls can't use it all
const HEDGE_MS = 12 * 1000;            // a healthy model answers in 2-5 s; after this, the next model is asked too
// Buttons the user waits on ("Write it with AI", "New question") must answer within 5 seconds in the browser:
// fast Gemini models only, the next one asked after 1.5 s, and a 4.3 s limit that leaves room for the network.
const QUICK = { budgetMs: 4300, backups: false, hedgeMs: 1500 };

// Tries up to 3 Gemini models (and Google Cloud, if set up), then the Gemma backups, until one returns text.
// budgetMs is the overall time limit. Quick helpers pass backups: false, because Gemma is too slow for them.
async function generateText({ system, user, media, maxTokens, json = false, budgetMs = GENERATION_BUDGET_MS, backups = true, hedgeMs }) {
    const apiKey = process.env.GEMINI_API_KEY;

    const call = { system, user, media, maxTokens, json };
    const providerAttempts = [];
    if (apiKey) {
        providerAttempts.push({ type: 'gemini', fn: (model, signal) => callModel({ ...call, model, signal, what: 'Gemini API',
            url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}` }) });
    }
    const { GOOGLE_CLOUD_PROJECT: project, GOOGLE_CLOUD_ACCESS_TOKEN: cloudToken, GOOGLE_CLOUD_LOCATION: location = 'us-central1' } = process.env;
    if (project && cloudToken) {
        providerAttempts.push({ type: 'google-cloud', fn: (model, signal) => callModel({ ...call, model, signal, what: 'Google Cloud model request',
            headers: { Authorization: `Bearer ${cloudToken}` },
            url: `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent` }) });
    }

    if (!providerAttempts.length) {
        throw new AIError('Missing GEMINI_API_KEY or Google Cloud fallback credentials in environment variables.', 500);
    }

    const backupList = backups ? backupModels() : [];
    const primary = (await getGeminiModels(apiKey || '')).filter(m => !backupList.includes(m) && (backups || !isGemma(m))).slice(0, MAX_MODEL_ATTEMPTS);
    const models = [...primary, ...backupList];
    if (!models.length) {
        throw new AIError('No supported model names are available for the current setup.', 502);
    }

    // Each model and provider pair is one candidate. A slow one gets a head start of HEDGE_MS, then the next is asked too.
    const candidates = models.flatMap(model => providerAttempts.map(provider => ({
        label: `${provider.type} ${model}`, provider: provider.type, backup: backupList.includes(model), run: signal => provider.fn(model, signal)
    })));
    try {
        const { text, label, failures } = await firstAnswer(candidates, {
            budgetMs, reserveMs: backupList.length ? Math.min(BACKUP_RESERVE_MS, budgetMs / 2) : 0,
            hedgeMs: hedgeMs || Math.min(HEDGE_MS, budgetMs / 3), callTimeoutMs: CALL_TIMEOUT_MS, isRetryable: isRetryableModelError,
            onFailure: (c, error) => console.warn(`${c.label} failed (${error.name === 'TimeoutError' ? 'timed out' : error.message}); trying another model.`)
        });
        if (failures.length || label !== candidates[0].label) console.warn(`${label} answered${failures.length ? ` after ${failures.length} failed attempt(s)` : ' first'}.`);
        return text;
    } catch (error) {
        const failures = error.failures || [];
        console.error('AI generation failed:', error.message);
        // Busy, overloaded or out of time: tell the user to try again rather than showing an API message.
        if (error.timedOut || (failures.length && failures.every(f => isCapacityError(f.error)))) {
            throw new AIError('The AI service is busy right now. Please try again in a minute.', 503);
        }
        throw new AIError(error.message || 'AI model generation failed.', 502);
    }
}

// Cloud Run and App Engine sit behind one Google proxy, so req.ip must come from X-Forwarded-For there.
// Locally there is no proxy, and trusting the header would let anyone pick their own IP.
if (process.env.K_SERVICE || process.env.GAE_ENV) app.set('trust proxy', 1);

// Counts uses per key in a sliding window. take(key) records a use and returns 0, or, when the key is
// already at max, records nothing and returns the seconds until it frees up. In memory, so each server
// instance keeps its own counts and a restart clears them.
function createLimiter({ windowMs, max }) {
    const hits = new Map();
    setInterval(() => {
        const cutoff = Date.now() - windowMs;
        for (const [key, times] of hits) if (times[times.length - 1] < cutoff) hits.delete(key);
    }, windowMs).unref();
    return key => {
        const now = Date.now();
        const times = (hits.get(key) || []).filter(t => t > now - windowMs);
        if (times.length >= max) return Math.ceil((times[0] + windowMs - now) / 1000);
        times.push(now);
        hits.set(key, times);
        return 0;
    };
}

// Allows max requests per key (the visitor's IP unless given) in each window.
function rateLimit({ windowMs, max, message, key = req => req.ip }) {
    const take = createLimiter({ windowMs, max });
    return (req, res, next) => {
        const wait = take(key(req));
        if (!wait) return next();
        res.set('Retry-After', String(wait));
        res.status(429).json({ ok: false, error: message });
    };
}

// Scenery for a business no hand-drawn setting covers. Returns null if it can't be made; the game then uses its plain look.
async function generateScenery(inputs, config) {
    const { system, user } = sceneryPrompts.sceneryPrompts(inputs, config);
    try {
        return sceneryPrompts.readScenery(await generateText({ system, user, maxTokens: 6000, json: true, budgetMs: 60000 }));
    } catch (error) {
        console.warn(`Scenery for ${config.id || inputs.company} could not be made: ${error.message}`);
        return null;
    }
}

// Languages the games have button and label text for. The value is the code stored on the config.
const LANGUAGES = { English: 'en', Hindi: 'hi' };
const slugify = value => cleanText(value, 60).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'survey';

function parseGameInputs(body) {
    const errors = [];
    const type = String(body.type || '');
    if (!GAME_TYPES.includes(type)) errors.push(`type must be one of: ${GAME_TYPES.join(', ')}`);
    const goal = String(body.goal || '').trim();
    if (goal.length < 10) errors.push('Describe the survey goal in at least 10 characters.');
    if (goal.length > 2000) errors.push('Keep the survey goal under 2000 characters.');
    const [min, max] = QUESTION_RANGE[type] || [3, 15];
    const questionCount = Number.parseInt(body.questionCount, 10);
    if (!(questionCount >= min && questionCount <= max)) errors.push(`questionCount must be between ${min} and ${max} for this game.`);
    return {
        errors,
        inputs: {
            type, goal, questionCount,
            company: cleanText(body.company, 80) || 'Our team',
            language: LANGUAGES[body.language] ? body.language : 'English',
            tone: ['playful', 'warm', 'professional'].includes(body.tone) ? body.tone : 'playful'
        }
    };
}

// Each generation is up to two 8k-token Gemini calls, so cap how many one visitor can run.
const generateLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: 'You have made a lot of games in the last hour. Please wait a while and try again.' });

/* Asks Gemini for a whole game config, checks it, and gives Gemini one chance to fix what fails. finish(config) sets the
   fields the server decides (id, company, language...) before checking. Returns { config } or { errors }. */
async function writeGame(inputs, user, finish) {
    const system = gamePrompts.systemPrompt(inputs.type), started = Date.now();
    const attempt = async prompt => {
        const text = await generateText({ system, user: prompt, maxTokens: 8192, json: true });
        let config;
        try { config = assist.parseJson(text); }
        catch (error) { return { text, errors: [`The response was not valid JSON: ${error.message}`] }; }
        if (config && typeof config === 'object' && !Array.isArray(config)) {
            if (typeof config.intro === 'string') config.intro = [config.intro];
            finish(config);
            castMainCharacter(inputs.type, config);
            const fixes = repairArt(inputs.type, config);
            if (fixes.length) console.warn(`Repaired ${fixes.length} decorative field(s) without asking Gemini again:\n  ${fixes.join('\n  ')}`);
        }
        // American words like "county" or "sheriff" count as errors, so Gemini gets one chance to rewrite them.
        return { text, config, errors: [...validateGame(inputs.type, config), ...gamePrompts.localeIssues(config, inputs.company)] };
    };
    let result = await attempt(user);
    // One correction round, if there's time: the page gives up after 4 minutes.
    if (result.errors.length && Date.now() - started < 90000) {
        console.warn(`Game config failed validation (${result.errors.length} errors); asking Gemini to fix it once:\n  ${result.errors.slice(0, 5).join('\n  ')}`);
        result = await attempt(gamePrompts.fixPrompt(user, result.text, result.errors));
    }
    return result.errors.length ? { errors: result.errors } : { config: result.config };
}
const notWritten = errors => ({ ok: false, errors,
    error: 'Gemini could not produce a valid game, even after one correction. Please try again or simplify the survey goal.' });

// Generates a game config from the builder's inputs.
app.post('/api/games/generate', generateLimit, async (req, res) => {
    const { errors, inputs } = parseGameInputs(req.body || {});
    if (errors.length) return res.status(400).json({ ok: false, error: 'Please check the inputs.', errors });
    const id = `${slugify(inputs.company)}-${inputs.type}-${Date.now().toString(36)}`, started = Date.now();
    try {
        const result = await writeGame(inputs, gamePrompts.userPrompt(inputs), config => {
            Object.assign(config, { id, company: inputs.company, lang: LANGUAGES[inputs.language] });
            // "office" is for a company's own staff; Gemini sometimes picks it for customers of software or service firms.
            if (config.setting === 'office' && !/\b(employees?|staff|team|colleagues?|workforce|workers?)\b/i.test(inputs.goal)) config.setting = 'none';
        });
        if (result.errors) return res.status(422).json(notWritten(result.errors));
        if (result.config.setting === 'custom' && Date.now() - started < 150000) {
            const scenery = await generateScenery(inputs, result.config);
            if (scenery) result.config.scenery = scenery;
        }
        res.json({ ok: true, type: inputs.type, config: result.config });
    } catch (error) {
        res.status(error.status || 502).json({ ok: false, error: error.message || 'AI model generation failed.' });
    }
});

/* Changes the game type in the Game Editor: the business's questions stay exactly as they are (Gemini only writes the
   new game's story around them), and so do the survey name, setting, scenery, colour palette and fonts. */
const QUESTION_FIELDS = ['id', 'type', 'prompt', 'options', 'labels', 'scale', 'optional'];
app.post('/api/games/convert', generateLimit, async (req, res) => {
    const body = req.body || {}, from = body.config;
    if (!from || typeof from !== 'object' || !Array.isArray(from.questions)) return res.status(400).json({ ok: false, error: 'Send the game to change.' });
    const { errors, inputs } = parseGameInputs({ ...body.inputs, type: body.type, questionCount: from.questions.length });
    if (errors.length) return res.status(400).json({ ok: false, error: 'This game can\'t take these questions.', errors });
    const questions = from.questions.map(q => Object.fromEntries(QUESTION_FIELDS.filter(k => q[k] !== undefined).map(k => [k, q[k]])));
    try {
        const result = await writeGame(inputs, gamePrompts.convertPrompt(inputs, from, questions), config => {
            // Each question keeps the business's wording; Gemini's story fields for it (witness, round title...) stay.
            const story = Array.isArray(config.questions) ? config.questions : [];
            config.questions = questions.map((q, i) => {
                const lines = { ...(story.find(s => s && s.id === q.id) || story[i]) };
                QUESTION_FIELDS.forEach(k => delete lines[k]);
                return { ...lines, ...q };
            });
            if (Array.isArray(config.stops)) config.stops.forEach((st, i) => { if (st && questions[i]) st.questionId = questions[i].id; });
            Object.assign(config, { id: from.id, company: from.company || inputs.company, lang: from.lang || LANGUAGES[inputs.language], title: from.title,
                setting: from.setting || 'none' });
            for (const key of ['scenery', 'palette', 'fonts', 'ui']) if (from[key] !== undefined) config[key] = from[key]; else delete config[key];
        });
        if (result.errors) return res.status(422).json(notWritten(result.errors));
        res.json({ ok: true, type: inputs.type, config: result.config });
    } catch (error) {
        res.status(error.status || 502).json({ ok: false, error: error.message || 'AI model generation failed.' });
    }
});

/* ---------- AI helpers for the builder: brief feedback, brief writing, one-question regeneration ---------- */

const assistLimit = (max, message) => rateLimit({ windowMs: 60 * 60 * 1000, max, message });
const briefInputs = body => ({ goal: cleanText(body.goal, 2000), company: cleanText(body.company, 80) });

// One line of feedback on the survey brief, shown under the box while the user types.
app.post('/api/assist/review-brief', assistLimit(120, 'Feedback is paused for a while. You can still generate your questions.'), async (req, res) => {
    const inputs = briefInputs(req.body || {});
    if (inputs.goal.length < 15) return res.status(400).json({ error: 'Type a little more first.' });
    try {
        const { system, user } = assist.reviewBriefPrompts(inputs);
        res.json(assist.readBriefReview(await generateText({ system, user, maxTokens: 200, json: true, budgetMs: 8000, backups: false })));
    } catch (error) {
        res.status(error.status || 502).json({ error: 'Feedback is not available right now.' });
    }
});

// Writes or improves the survey brief from whatever the user has typed so far.
app.post('/api/assist/write-brief', assistLimit(30, 'You have used the brief writer a lot in the last hour. Please try again later.'), async (req, res) => {
    const inputs = briefInputs(req.body || {});
    if (!inputs.goal && !inputs.company) return res.status(400).json({ error: 'Type a few words about your survey, or your company name, first.' });
    const type = String((req.body || {}).type || '');
    try {
        const { system, user } = assist.writeBriefPrompts({ ...inputs, gameLabel: GAME_TYPES.includes(type) ? type : '' });
        res.json(assist.readWrittenBrief(await generateText({ system, user, maxTokens: 400, json: true, ...QUICK })));
    } catch (error) {
        res.status(error.status || 502).json({ error: error.status === 503 ? error.message : 'The brief could not be written right now. Please try again.' });
    }
});

// Rewrites one question of a generated game (with its story lines) and checks the whole game still validates.
app.post('/api/games/question', assistLimit(40, 'You have regenerated a lot of questions in the last hour. Please try again later.'), async (req, res) => {
    const body = req.body || {};
    const config = body.config, index = Number.parseInt(body.index, 10);
    if (!config || typeof config !== 'object' || !Array.isArray(config.questions) || !(index >= 0 && index < config.questions.length)) {
        return res.status(400).json({ ok: false, error: 'Send the game and the number of the question to replace.' });
    }
    const { errors, inputs } = parseGameInputs({ ...body.inputs, type: body.type, questionCount: config.questions.length });
    if (errors.length) return res.status(400).json({ ok: false, error: 'Please check the inputs.', errors });
    const { system, user } = assist.questionPrompts(inputs.type, inputs, config, index);
    const started = Date.now();
    const attempt = async (prompt, budgetMs = QUICK.budgetMs) => {
        const text = await generateText({ system, user: prompt, maxTokens: 2048, json: true, ...QUICK, budgetMs });
        let next;
        try { next = assist.applyQuestion(inputs.type, config, index, text); }
        catch (error) { return { text, errors: [error.message] }; }
        repairArt(inputs.type, next);
        return { text, next, errors: [...validateGame(inputs.type, next), ...gamePrompts.localeIssues(next, inputs.company)] };
    };
    try {
        let result = await attempt(user);
        // A correction round gets only the time left of the 4.3 s, since the user is waiting on the button.
        const left = QUICK.budgetMs - (Date.now() - started);
        if (result.errors.length && left >= 2000) {
            result = await attempt(`${user}\n\nYour previous answer failed these checks:\n${result.errors.slice(0, 8).map(e => `- ${e}`).join('\n')}\n\nPREVIOUS ANSWER\n${result.text}\n\nReturn the corrected JSON only.`, left);
        }
        if (result.errors.length) return res.status(422).json({ ok: false, error: 'A new question could not be written this time. Please try again.', errors: result.errors });
        res.json({ ok: true, question: result.next.questions[index], ...(inputs.type === 'rpg' && { stop: result.next.stops[index] }) });
    } catch (error) {
        res.status(error.status || 502).json({ ok: false, error: error.message || 'AI model generation failed.' });
    }
});

// Spare questions for the review screen, fetched in the background right after a game is generated. Not time-critical:
// "New question" uses a spare instantly when one is ready, and asks the AI live (within 5 seconds) when not.
app.post('/api/games/spares', assistLimit(20, 'Too many requests for spare questions. Please try again later.'), async (req, res) => {
    const body = req.body || {}, config = body.config;
    if (!config || typeof config !== 'object' || !Array.isArray(config.questions)) return res.status(400).json({ ok: false, error: 'Send the game.' });
    const { errors, inputs } = parseGameInputs({ ...body.inputs, type: body.type, questionCount: config.questions.length });
    if (errors.length) return res.status(400).json({ ok: false, error: 'Please check the inputs.', errors });
    const { system, user } = assist.sparesPrompts(inputs.type, inputs, config);
    try {
        const text = await generateText({ system, user, maxTokens: 8192, json: true, budgetMs: 60000 });
        const check = next => { repairArt(inputs.type, next); return [...validateGame(inputs.type, next), ...gamePrompts.localeIssues(next, inputs.company)]; };
        res.json({ ok: true, spares: assist.readSpares(inputs.type, config, text, check) });
    } catch (error) {
        res.status(error.status || 502).json({ ok: false, error: 'Spare questions are not available right now.' });
    }
});

/* ---------- published surveys, responses and coupons ---------- */

const surveyLink = code => `/s/${code}`;
function parseReward(body) {
    const title = cleanText(body && body.title, 80);
    if (!title) return null;
    const prefix = cleanText(body.prefix, 12).toUpperCase().replace(/[^A-Z0-9]/g, '');
    return { title, detail: cleanText(body.detail, 160), prefix };
}

const rewardFor = (body, config) => {
    const reward = parseReward(body);
    if (reward && !reward.prefix) reward.prefix = cleanText(config.company, 40).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'QUEST';
    return reward;
};

// Builder-only extras kept with a draft so the editor reopens as it was: the brief the game was generated from (for
// "New question" and changing the game type).
function editorExtras(body) {
    if (!body || typeof body !== 'object') return null;
    const inputs = body.inputs && typeof body.inputs === 'object' ? {
        goal: cleanText(body.inputs.goal, 2000), company: cleanText(body.inputs.company, 80), language: cleanText(body.inputs.language, 20),
        tone: cleanText(body.inputs.tone, 20), questionCount: Number.parseInt(body.inputs.questionCount, 10) || undefined
    } : null;
    return { inputs: inputs && inputs.goal ? inputs : null };
}

/* The game the editor sends: { type, config, reward, editor }. Checked and repaired the same way for drafts and
   for publishing. problems lists what QP.validateGame finds: publishing refuses them, a draft is saved anyway so
   half-finished work isn't lost, and the problems come back for the editor to show. */
function readGame(body) {
    const type = String(body.type || ''), config = body.config;
    if (!GAME_TYPES.includes(type) || !config || typeof config !== 'object' || Array.isArray(config) || !Array.isArray(config.questions)) {
        return { error: 'A game type and config are required.' };
    }
    repairArt(type, config);
    return { type, config, title: cleanText(config.title, 120), reward: rewardFor(body.reward, config), editor: editorExtras(body.editor),
        problems: validateGame(type, config) };
}
// The part of a survey players see, for telling whether a working copy differs from what's live.
const liveKey = g => JSON.stringify([g.type, g.title, g.config, g.reward || null]);
const isDraft = survey => survey.status === 'draft';
// For the editor: the working copy, and whether it differs from what's live.
const editorView = survey => {
    const working = survey.draft || survey;
    return { code: survey.code, url: isDraft(survey) ? null : surveyLink(survey.code), status: survey.status, type: working.type, title: working.title,
        config: working.config, reward: working.reward || null, editor: survey.editor, updatedAt: survey.updatedAt, publishedAt: survey.publishedAt,
        hasUnpublishedChanges: !!survey.draft, live: survey.draft ? { type: survey.type, config: survey.config, reward: survey.reward || null } : null };
};
async function ownSurvey(req, res) {
    const survey = await store.getSurvey(req.params.code).catch(() => null);
    if (!survey || survey.userId !== req.user.id) { res.status(404).json({ error: 'Survey not found.' }); return null; }
    return survey;
}
async function freshCode(create) {
    for (let attempt = 0; attempt < 5; attempt++) {
        const code = randomCode(6);
        if (await create(code)) return code;
    }
    throw new Error('Could not find a free short code.');
}

// Publish a game config as a new survey. Returns its short link.
app.post('/api/surveys', requireBusiness, async (req, res) => {
    const game = readGame(req.body || {});
    if (game.error) return res.status(400).json({ error: game.error });
    if (game.problems.length) return res.status(400).json({ error: 'The game has problems that need fixing first.', errors: game.problems });
    try {
        const code = await freshCode(code => store.createSurvey({ code, userId: req.user.id, ...game, status: 'published' }));
        res.status(201).json({ code, url: surveyLink(code) });
    } catch (error) {
        console.error('Publish error:', error.message);
        res.status(500).json({ error: 'Unable to publish the survey.' });
    }
});

// Publish the editor's current game at an existing code: a draft's first publish, or "Publish again", which puts the
// edits live at the same link. Earlier responses and coupons stay; the AI summary is rewritten when the questions change.
app.put('/api/surveys/:code', requireBusiness, async (req, res) => {
    const survey = await ownSurvey(req, res);
    if (!survey) return;
    const game = readGame(req.body || {});
    if (game.error) return res.status(400).json({ error: game.error });
    if (game.problems.length) return res.status(400).json({ error: 'The game has problems that need fixing first.', errors: game.problems });
    try {
        const questionsChanged = JSON.stringify(survey.config.questions) !== JSON.stringify(game.config.questions);
        await store.updateSurvey(survey.code, { type: game.type, title: game.title, config: game.config, reward: game.reward, editor: game.editor,
            status: 'published', draft: null, updatedAt: true, publishedAt: true, ...(questionsChanged && survey.insights && { insights: null }) });
        res.json({ code: survey.code, url: surveyLink(survey.code), ...editorView(await store.getSurvey(survey.code)) });
    } catch (error) {
        console.error('Publish error:', error.message);
        res.status(500).json({ error: 'Unable to publish the survey.' });
    }
});

/* Drafts. Saving never changes what players see: a draft is never served, and a published survey's edits are kept
   as its working copy until "Publish again". */
app.post('/api/drafts', requireBusiness, async (req, res) => {
    const game = readGame(req.body || {});
    if (game.error) return res.status(400).json({ error: game.error });
    try {
        const code = await freshCode(code => store.createSurvey({ code, userId: req.user.id, ...game, status: 'draft' }));
        res.status(201).json({ ...editorView(await store.getSurvey(code)), problems: game.problems });
    } catch (error) {
        console.error('Draft save error:', error.message);
        res.status(500).json({ error: 'Unable to save the draft.' });
    }
});

app.put('/api/drafts/:code', requireBusiness, async (req, res) => {
    const survey = await ownSurvey(req, res);
    if (!survey) return;
    const game = readGame(req.body || {});
    if (game.error) return res.status(400).json({ error: game.error });
    try {
        if (isDraft(survey)) {
            await store.updateSurvey(survey.code, { type: game.type, title: game.title, config: game.config, reward: game.reward, editor: game.editor, updatedAt: true });
        } else {
            const working = { type: game.type, title: game.title, config: game.config, reward: game.reward };
            // Edits that end up matching what's live again clear the "Unpublished changes" state.
            await store.updateSurvey(survey.code, { draft: liveKey(working) === liveKey(survey) ? null : working, editor: game.editor, updatedAt: true });
        }
        res.json({ ...editorView(await store.getSurvey(survey.code)), problems: game.problems });
    } catch (error) {
        console.error('Draft save error:', error.message);
        res.status(500).json({ error: 'Unable to save the draft.' });
    }
});

// Reopens a draft or a published survey's working copy in the editor. Owner only.
app.get('/api/drafts/:code', requireBusiness, async (req, res) => {
    const survey = await ownSurvey(req, res);
    if (survey) res.json(editorView(survey));
});

// Deletes a survey or draft for good, owner only: its link stops working, and its answers, AI summary and coupons
// (including ones players saved) are removed.
app.delete('/api/surveys/:code', requireBusiness, async (req, res) => {
    try {
        if (!(await store.deleteSurvey(String(req.params.code), req.user.id))) return res.status(404).json({ error: 'Survey not found.' });
        res.json({ ok: true });
    } catch (error) {
        console.error('Survey delete error:', error.message);
        res.status(500).json({ error: 'Unable to delete the survey.' });
    }
});

// The signed-in company's surveys and drafts, newest first, with response and coupon counts.
app.get('/api/surveys', requireBusiness, async (req, res) => {
    try {
        const rows = await store.surveysForUser(req.user.id);
        res.json({ surveys: rows.map(row => {
            const working = row.draft || row, config = working.config;
            return { code: row.code, url: isDraft(row) ? null : surveyLink(row.code), status: row.status, hasUnpublishedChanges: !!row.draft,
                type: working.type, title: working.title, company: config.company, setting: config.setting || 'none', lang: config.lang || 'en',
                questions: Array.isArray(config.questions) ? config.questions.length : 0, reward: row.reward,
                createdAt: row.createdAt, updatedAt: row.updatedAt, publishedAt: row.publishedAt,
                responses: row.responses || 0, coupons: row.coupons || 0, redeemed: row.redeemed || 0, lastResponse: row.lastResponse,
                aiHeadline: row.insights ? row.insights.summary.headline : null, aiUpToDate: !!row.insights && row.insights.responses === row.responses };
        }) });
    } catch (error) {
        console.error('Survey list error:', error.message);
        res.status(500).json({ error: 'Unable to load your surveys.' });
    }
});

/* Play tokens. Loading a survey hands out a signed token (survey code, random nonce, time issued), and saving
   answers needs one. Each token saves one response, and the time it was issued tells the server how long the
   game really took, which the respondent's browser can't fake. Set PLAY_TOKEN_SECRET wherever more than one
   server instance runs, or a token from one instance fails on another. */
const PLAY_TOKEN_SECRET = process.env.PLAY_TOKEN_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.PLAY_TOKEN_SECRET && (process.env.K_SERVICE || process.env.GAE_ENV)) {
    console.warn('PLAY_TOKEN_SECRET is not set; play tokens stop working when this instance restarts.');
}
const PLAY_TOKEN_DAYS = 2;
const signPlay = payload => crypto.createHmac('sha256', PLAY_TOKEN_SECRET).update(payload).digest('base64url');

function issuePlayToken(code) {
    const payload = Buffer.from(JSON.stringify({ c: code, n: crypto.randomBytes(12).toString('base64url'), t: Date.now() })).toString('base64url');
    return `${payload}.${signPlay(payload)}`;
}

// Returns { nonce, issuedAt } for a genuine, unexpired token for this survey, otherwise null.
function readPlayToken(token, code) {
    const [payload, signature] = String(token || '').split('.');
    if (!payload || !signature) return null;
    const expected = Buffer.from(signPlay(payload)), actual = Buffer.from(signature);
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
    let data;
    try { data = JSON.parse(Buffer.from(payload, 'base64url').toString()); } catch { return null; }
    if (data.c !== code || !(Date.now() - data.t < PLAY_TOKEN_DAYS * 864e5)) return null;
    return { nonce: data.n, issuedAt: data.t };
}

// Coupons only go to answers that took at least this long per question, measured from when the game loaded.
const MIN_MS_PER_QUESTION = 1000;
// One device or network can earn this many coupons per survey per day. Answers past the limit are still saved.
const takeCoupon = createLimiter({ windowMs: 24 * 60 * 60 * 1000, max: 5 });
// Stops one visitor flooding a survey with responses. Counted per survey, so other surveys stay open to them.
const responseLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 30, key: req => `${req.ip} ${req.params.code}`,
    message: 'Too many answers from this device. Please try again later.' });

// What a respondent's game loads. Public: anyone with the link can play.
// Only the last published version: never a draft, never unpublished edits.
const publishedSurvey = code => store.getSurvey(code).then(row => (row && !isDraft(row) ? row : null), () => null);

app.get('/api/surveys/:code', async (req, res) => {
    const row = await publishedSurvey(req.params.code);
    if (!row) return res.status(404).json({ error: 'Survey not found.' });
    const reward = row.reward;
    res.json({ type: row.type, config: row.config, reward: reward && { title: reward.title, detail: reward.detail },
        playToken: issuePlayToken(req.params.code) });
});

// Why a response gets no coupon, or null when it earns one.
function couponWithheld(req, config, record, play) {
    const answered = Object.keys(record.answers).length;
    const rushed = Array.isArray(record.flags?.tooFast) ? record.flags.tooFast.length : 0;
    if (Date.now() - play.issuedAt < config.questions.length * MIN_MS_PER_QUESTION || rushed * 2 > answered) return 'too-fast';
    if (takeCoupon(`${req.ip} ${req.params.code}`)) return 'limit';
    return null;
}

// A respondent finished the game. Saves the record and hands out a coupon if the survey offers one and the
// answers weren't rushed. Sending the same play token again returns the first save's coupon instead of a new one.
app.post('/api/surveys/:code/responses', responseLimit, async (req, res) => {
    const row = await publishedSurvey(req.params.code);
    if (!row) return res.status(404).json({ error: 'Survey not found.' });
    const config = row.config, record = req.body && req.body.record;
    const ids = new Set(config.questions.map(q => q.id));
    if (!record || typeof record !== 'object' || !record.answers || typeof record.answers !== 'object' || Array.isArray(record.answers)) {
        return res.status(400).json({ error: 'The response does not match this survey.' });
    }
    // Someone who started before the survey was published again may answer questions that have since been removed.
    // Those answers are dropped; the rest are kept, as long as at least one question still matches.
    // Answers are a choice or text (clipped), a number, or null for a skip; anything else is dropped.
    const answers = Object.fromEntries(Object.entries(record.answers).filter(([id, a]) => ids.has(id) && (a === null || ['string', 'number'].includes(typeof a)))
        .map(([id, a]) => [id, typeof a === 'string' ? a.slice(0, 2000) : a]));
    if (Object.keys(record.answers).length && !Object.keys(answers).length) return res.status(400).json({ error: 'The response does not match this survey.' });
    record.answers = answers;
    // Voice notes the game says go with a text answer, kept below once the play token checks out.
    const voiceClaims = record.voice && typeof record.voice === 'object' && !Array.isArray(record.voice) ? record.voice : {};
    delete record.voice;
    if (record.msPerQuestion && typeof record.msPerQuestion === 'object') record.msPerQuestion = Object.fromEntries(Object.entries(record.msPerQuestion).filter(([id]) => ids.has(id)));
    if (record.flags && Array.isArray(record.flags.tooFast)) record.flags.tooFast = record.flags.tooFast.filter(id => ids.has(id));
    const play = readPlayToken(req.body.playToken, req.params.code);
    if (!play) return res.status(403).json({ error: 'This game session has expired. Please reload the survey link and play again.' });
    const reward = row.reward;
    const couponFor = code => reward && code ? { code, title: reward.title, detail: reward.detail, company: config.company } : null;
    const savedBefore = () => store.responseByNonce(play.nonce);
    try {
        const earlier = await savedBefore();
        if (earlier) return res.json({ ok: true, coupon: couponFor(earlier.couponCode) });
        // A note's id comes from the play token and question, so a response can only bring its own notes.
        const claimed = Object.entries(voiceClaims).filter(([id, note]) => typeof answers[id] === 'string' && note === voiceNoteId(play.nonce, id));
        const kept = await store.keepVoiceNotes(claimed.map(([, note]) => note));
        if (kept.length) record.voice = Object.fromEntries(claimed.filter(([, note]) => kept.includes(note)));
        const withheld = reward ? couponWithheld(req, config, record, play) : null;
        for (let attempt = 0; attempt < 5; attempt++) {
            const couponCode = reward && !withheld ? `${reward.prefix}-${randomCode(5, 'ABCDEFGHJKMNPQRSTUVWXYZ23456789')}` : null;
            // Only the browser that earned a coupon can save it to a player account: it alone gets the claim token.
            const claimToken = couponCode ? crypto.randomBytes(24).toString('base64url') : null;
            const saved = await store.createResponse({ surveyCode: req.params.code, record, couponCode, playNonce: play.nonce,
                claimHash: claimToken && claimHash(claimToken), couponInfo: couponCode && { title: reward.title, detail: reward.detail, company: config.company, survey: row.title } });
            if (saved === 'ok') return res.status(201).json({ ok: true, coupon: couponFor(couponCode), ...(claimToken && { claimToken }), ...(withheld && { couponWithheld: withheld }) });
            // Two saves with one token raced each other; the other one won.
            if (saved === 'nonce-taken') return res.json({ ok: true, coupon: couponFor((await savedBefore())?.couponCode) });
        }
        throw new Error('Could not find a free coupon code.');
    } catch (error) {
        console.error('Response save error:', error.message);
        res.status(500).json({ error: 'Unable to save your answers.' });
    }
});

const claimHash = token => crypto.createHash('sha256').update(String(token)).digest('hex');

/* Voice notes. A respondent can answer a text question by speaking instead of typing. The game uploads the recording
   when it stops, Gemini writes it down, and the transcript goes back into the answer box for the respondent to check.
   The response then names the note (record.voice), which keeps it; notes from unfinished games expire with the token. */
const MAX_VOICE_BYTES = 1024 * 1024;   // a 90-second note at the game's bitrate is about 400 KB
const voiceBody = express.raw({ type: 'audio/*', limit: MAX_VOICE_BYTES });
const voiceNoteId = (nonce, questionId) => crypto.createHash('sha256').update(`${nonce}\n${questionId}`).digest('hex').slice(0, 32);
const voiceLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 60, key: req => `${req.ip} ${req.params.code}`,
    message: 'Too many voice notes from this device. Please type your answer instead.' });
const testVoiceLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 30, key: req => req.user.id,
    message: 'You have tried a lot of voice notes in the last hour. Please try again later.' });

// The uploaded recording and its type (without codec details), or null after answering 400.
function readAudio(req, res) {
    const mime = String(req.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!Buffer.isBuffer(req.body) || !req.body.length || !/^audio\/[a-z0-9.+-]+$/.test(mime)) {
        res.status(400).json({ error: 'Send the voice note as audio.' });
        return null;
    }
    return { mime, audio: req.body };
}

// The words in a voice note, '' when none could be made out, or null when the AI couldn't be reached.
async function transcribe(config, question, { mime, audio }) {
    const { system, user } = assist.transcriptPrompts(config, question);
    try {
        return assist.readTranscript(await generateText({ system, user, media: { mimeType: mime, data: audio.toString('base64') },
            maxTokens: 2048, json: true, budgetMs: 20000, backups: false, hedgeMs: 8000 }));
    } catch (error) {
        console.warn(`Voice note could not be written down: ${error.message}`);
        return null;
    }
}

// A respondent recorded an answer to a text question. Recording again replaces the note.
app.post('/api/surveys/:code/questions/:questionId/voice', voiceLimit, voiceBody, async (req, res) => {
    const row = await publishedSurvey(req.params.code);
    if (!row) return res.status(404).json({ error: 'Survey not found.' });
    const question = row.config.questions.find(q => q.id === req.params.questionId && q.type === 'text');
    if (!question) return res.status(400).json({ error: 'That question does not take voice notes.' });
    const play = readPlayToken(req.get('x-play-token'), req.params.code);
    if (!play) return res.status(403).json({ error: 'This game session has expired. Please reload the survey link and play again.' });
    const clip = readAudio(req, res);
    if (!clip) return;
    const id = voiceNoteId(play.nonce, question.id), transcript = await transcribe(row.config, question, clip);
    try {
        await store.saveVoiceNote({ id, surveyCode: row.code, questionId: question.id, mime: clip.mime, audio: clip.audio, transcript });
        res.status(201).json({ id, transcript });
    } catch (error) {
        console.error('Voice note save error:', error.message);
        res.status(500).json({ error: 'Unable to save your voice note.' });
    }
});

// The Game Editor's test play writes a voice note down without saving it, so a business can hear how it works.
app.post('/api/voice/transcribe', requireBusiness, testVoiceLimit, voiceBody, async (req, res) => {
    const clip = readAudio(req, res);
    if (!clip) return;
    const transcript = await transcribe({ title: 'Test play', company: '' }, { prompt: cleanText(req.query.question, 300) }, clip);
    res.json({ transcript });
});

// Plays a voice note on the analytics page. Owner only.
app.get('/api/surveys/:code/voice-notes/:id', requireBusiness, async (req, res) => {
    const survey = await ownSurvey(req, res);
    if (!survey) return;
    const note = await store.voiceNote(String(req.params.id)).catch(() => null);
    if (!note || note.surveyCode !== survey.code) return res.status(404).json({ error: 'Voice note not found.' });
    res.set({ 'Content-Type': note.mime, 'Cache-Control': 'private, no-store' }).send(note.audio);
});

// A signed-in player saves a coupon they just earned, with the one-time claim token their game was given.
app.post('/api/coupons/claim', requirePlayer, async (req, res) => {
    const token = String(req.body.claimToken || '');
    if (!token) return res.status(400).json({ error: 'Send the claim token.' });
    try {
        const result = await store.claimCoupon(claimHash(token), req.user.id);
        if (result.status === 'not-found') return res.status(404).json({ error: 'That coupon could not be found.' });
        if (result.status === 'used') return res.status(409).json({ yours: result.yours, error: result.yours ? 'This coupon is already in your coupons.' : 'This coupon has already been saved.' });
        res.json({ ok: true });
    } catch (error) {
        console.error('Coupon claim error:', error.message);
        res.status(500).json({ error: 'Unable to save the coupon.' });
    }
});

// The signed-in player's saved coupons, newest first, with whether each has been redeemed.
app.get('/api/me/coupons', requirePlayer, async (req, res) => {
    try { res.json({ coupons: await store.couponsForPlayer(req.user.id) }); }
    catch (error) {
        console.error('Coupon list error:', error.message);
        res.status(500).json({ error: 'Unable to load your coupons.' });
    }
});

// Add, change or remove the coupon reward on a published survey. Owner only; applies to people who finish from now on.
app.put('/api/surveys/:code/reward', requireBusiness, async (req, res) => {
    const survey = await ownSurvey(req, res);
    if (!survey) return;
    if (isDraft(survey)) return res.status(404).json({ error: 'Survey not found.' });
    const reward = rewardFor(req.body.reward, survey.config);
    if (req.body.reward && !reward) return res.status(400).json({ error: 'Please describe the reward.' });
    try {
        // An unpublished working copy follows the reward change too, so the next publish doesn't undo it.
        await store.updateSurvey(survey.code, { reward, ...(survey.draft && { draft: { ...survey.draft, reward } }) });
        res.json({ ok: true, reward });
    } catch (error) {
        console.error('Reward save error:', error.message);
        res.status(500).json({ error: 'Unable to save the reward.' });
    }
});

// Everything the analytics dashboard needs for one survey. Owner only.
app.get('/api/surveys/:code/analytics', requireBusiness, async (req, res) => {
    const survey = await ownSurvey(req, res);
    if (!survey) return;
    if (isDraft(survey)) return res.status(404).json({ error: 'Drafts have no analytics until they are published.' });
    try {
        const rows = await store.responsesFor(survey.code);
        res.json({
            survey: { code: survey.code, url: surveyLink(survey.code), type: survey.type, title: survey.title, createdAt: survey.createdAt,
                config: survey.config, reward: survey.reward },
            responses: rows.map(r => ({ record: r.record, coupon: r.couponCode, redeemedAt: r.redeemedAt, createdAt: r.createdAt }))
        });
    } catch (error) {
        console.error('Analytics error:', error.message);
        res.status(500).json({ error: 'Unable to load the answers.' });
    }
});

/* AI summary of a survey's answers, for its analytics page. Owner only. Summaries are cached per survey and
   response count, so reopening the page doesn't call Gemini again until new answers arrive. */
const MIN_INSIGHT_RESPONSES = 3;
const insightLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 30, key: req => req.user.id,
    message: 'You have asked for a lot of summaries in the last hour. Please try again later.' });
app.post('/api/surveys/:code/insights', requireBusiness, insightLimit, async (req, res) => {
    const survey = await ownSurvey(req, res);
    if (!survey) return;
    if (isDraft(survey)) return res.status(404).json({ error: 'Drafts have no analytics until they are published.' });
    try {
        const records = (await store.responsesFor(survey.code)).map(r => r.record);
        if (records.length < MIN_INSIGHT_RESPONSES) {
            return res.json({ ok: false, reason: 'too-few', needed: MIN_INSIGHT_RESPONSES, responses: records.length });
        }
        const cached = survey.insights;
        if (cached && cached.responses === records.length && cached.summary) return res.json({ ok: true, ...cached });
        const { system, user } = assist.insightsPrompts(survey.config, records);
        const { summary, dropped } = assist.readInsights(await generateText({ system, user, maxTokens: 4096, json: true }), survey.config, records);
        if (dropped) console.warn(`AI summary for ${survey.code}: dropped ${dropped} quote(s) that weren't in the answers.`);
        const entry = { summary, responses: records.length, generatedAt: new Date().toISOString() };
        await store.updateSurvey(survey.code, { insights: entry });
        res.json({ ok: true, ...entry });
    } catch (error) {
        console.error('Insights error:', error.message);
        res.status(error.status || 502).json({ error: error.status === 503 ? error.message : 'The AI summary could not be written right now. Please try again.' });
    }
});

// A shop checks a respondent's coupon at the till. Each code works once, and only for the company that issued it.
app.post('/api/coupons/redeem', requireBusiness, async (req, res) => {
    const code = cleanText(req.body.code, 40).toUpperCase();
    try {
        const result = await store.redeemCoupon(code, req.user.id);
        if (result.status === 'not-found') return res.status(404).json({ status: 'not-found', error: 'No coupon with that code was issued by your surveys.' });
        res.json(result);
    } catch (error) {
        console.error('Redeem error:', error.message);
        res.status(500).json({ error: 'Unable to check that coupon.' });
    }
});

// Short survey links: /s/Ab3x9K opens the right game.
app.get('/s/:code', async (req, res) => {
    const row = await publishedSurvey(req.params.code);
    if (!row) return res.redirect(302, '/?missing=1');
    res.redirect(302, `/games/${row.type}.html?s=${encodeURIComponent(req.params.code)}`);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    refreshModels(process.env.GEMINI_API_KEY);
    removeExpiredSessions();
});
