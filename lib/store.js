/* Where QuestPulse keeps accounts, sessions, password-reset links, surveys, responses, voice notes and coupons.
   STORAGE=firestore uses Cloud Firestore (for Cloud Run, where local files are lost on restart);
   anything else uses a SQLite file in data/ (for local development and the tests).
   Both backends have the same methods and return times as "YYYY-MM-DD HH:MM:SS" in UTC.

   A survey is a draft or published (status). type, title, config and reward are what players get once it is
   published; for a draft they are the working copy and are never served. Edits made after publishing wait in
   draft (the working copy) until the next publish. editor holds builder-only extras for reopening the editor.

   A voice note is a respondent's recorded answer to a text question, saved while they play (one per play token and
   question, so recording again replaces it) with its transcript. It expires VOICE_NOTE_DAYS after recording unless
   the response it belongs to is saved, which keeps it (expiresAt cleared). */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const SESSION_DAYS = 30;
const VOICE_NOTE_DAYS = 2;   // as long as a play token lasts
const parse = text => (text ? JSON.parse(text) : null);

function sqliteStore() {
    const sqlite3 = require('sqlite3');
    const { promisify } = require('util');
    const dataDir = path.join(__dirname, '..', 'data');
    fs.mkdirSync(dataDir, { recursive: true });
    const database = new sqlite3.Database(path.join(dataDir, 'questpulse.sqlite'));
    const run = promisify(database.run.bind(database));
    // Like run, but resolves with the number of rows changed.
    const change = (sql, ...params) => new Promise((resolve, reject) =>
        database.run(sql, ...params, function (error) { error ? reject(error) : resolve(this.changes); }));
    const get = promisify(database.get.bind(database));
    const all = promisify(database.all.bind(database));

    database.serialize(() => {
        database.run(`CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            password_salt TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);
        database.run(`CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            expires_at TEXT
        )`);
        // A published survey. code is the short link: /s/<code>
        database.run(`CREATE TABLE IF NOT EXISTS surveys (
            code TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            config TEXT NOT NULL,
            reward TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);
        // One completed game. coupon_code is set when the survey offers a reward.
        database.run(`CREATE TABLE IF NOT EXISTS responses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            survey_code TEXT NOT NULL,
            record TEXT NOT NULL,
            coupon_code TEXT UNIQUE,
            redeemed_at TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            play_nonce TEXT
        )`);
        // Databases made before these columns existed. The callback swallows "duplicate column" on later starts.
        database.run('ALTER TABLE sessions ADD COLUMN expires_at TEXT', () => {});
        // A business makes surveys; a player plays them and keeps their coupons. Older accounts (NULL) are businesses.
        database.run('ALTER TABLE users ADD COLUMN role TEXT', () => {});
        database.run('ALTER TABLE responses ADD COLUMN play_nonce TEXT', () => {});
        // The latest AI summary of the survey's answers, as JSON.
        database.run('ALTER TABLE surveys ADD COLUMN insights TEXT', () => {});
        // Drafts and unpublished edits. Surveys made before these columns existed are published (status NULL).
        database.run('ALTER TABLE surveys ADD COLUMN status TEXT', () => {});
        database.run('ALTER TABLE surveys ADD COLUMN draft TEXT', () => {});
        database.run('ALTER TABLE surveys ADD COLUMN editor TEXT', () => {});
        database.run('ALTER TABLE surveys ADD COLUMN updated_at TEXT', () => {});
        database.run('ALTER TABLE surveys ADD COLUMN published_at TEXT', () => {});
        database.run('CREATE INDEX IF NOT EXISTS responses_by_survey ON responses (survey_code)');
        // One saved response per play token, so a token can't be replayed for more coupons.
        database.run('CREATE UNIQUE INDEX IF NOT EXISTS responses_by_play ON responses (play_nonce)');
        // A coupon a player saved to their account: claim_hash is the SHA-256 of the one-time claim token given to the
        // browser that earned it, player_id the account it was saved to, coupon_info the reward as it was when issued.
        database.run('ALTER TABLE responses ADD COLUMN claim_hash TEXT', () => {
            database.run('CREATE UNIQUE INDEX IF NOT EXISTS responses_by_claim ON responses (claim_hash)');
        });
        database.run('ALTER TABLE responses ADD COLUMN player_id TEXT', () => {
            database.run('CREATE INDEX IF NOT EXISTS responses_by_player ON responses (player_id)');
        });
        database.run('ALTER TABLE responses ADD COLUMN coupon_info TEXT', () => {});
        database.run(`CREATE TABLE IF NOT EXISTS voice_notes (
            id TEXT PRIMARY KEY,
            survey_code TEXT NOT NULL,
            question_id TEXT NOT NULL,
            mime TEXT NOT NULL,
            audio BLOB NOT NULL,
            transcript TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            expires_at TEXT
        )`);
        database.run('CREATE INDEX IF NOT EXISTS voice_notes_by_survey ON voice_notes (survey_code)');
        // Password-reset links: token_hash is the SHA-256 of the token in the emailed link. Each works once, until expires_at.
        database.run(`CREATE TABLE IF NOT EXISTS password_resets (
            token_hash TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            expires_at TEXT NOT NULL
        )`);
    });

    // Sessions from before expires_at existed count from when they were created.
    const SESSION_LIVE = `COALESCE(sessions.expires_at, datetime(sessions.created_at, '+${SESSION_DAYS} days')) > datetime('now')`;
    const survey = row => row && { code: row.code, userId: row.user_id, type: row.type, title: row.title,
        config: parse(row.config), reward: parse(row.reward), insights: parse(row.insights), createdAt: row.created_at,
        status: row.status || 'published', draft: parse(row.draft), editor: parse(row.editor),
        updatedAt: row.updated_at || row.created_at, publishedAt: row.status === 'draft' ? null : row.published_at || row.created_at };
    // updateSurvey fields and their columns. JSON fields are stored as text; updatedAt and publishedAt take the current time.
    const COLUMNS = { type: 'type', title: 'title', config: 'config', reward: 'reward', insights: 'insights', status: 'status', draft: 'draft', editor: 'editor' };

    return {
        name: 'SQLite',

        async createUser({ id, name, email, passwordHash, passwordSalt, role = 'business' }) {
            try {
                await run('INSERT INTO users (id, name, email, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?, ?)', id, name, email, passwordHash, passwordSalt, role);
                return true;
            } catch (error) {
                if (/UNIQUE/.test(error.message)) return false;
                throw error;
            }
        },
        userByEmail: email => get('SELECT * FROM users WHERE email = ?', email).then(u => u || null),

        createSession: (token, userId) =>
            run(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+${SESSION_DAYS} days'))`, token, userId),
        userForSession: token =>
            get(`SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token = ? AND ${SESSION_LIVE}`, token).then(u => u || null),
        deleteSession: token => run('DELETE FROM sessions WHERE token = ?', token),
        removeExpiredSessions: () => run(`DELETE FROM sessions WHERE NOT (${SESSION_LIVE})`),

        async createPasswordReset(tokenHash, userId, minutes) {
            await run(`DELETE FROM password_resets WHERE expires_at <= datetime('now')`);
            await run(`INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, datetime('now', '+${Number(minutes)} minutes'))`, tokenHash, userId);
        },
        // Uses up a reset link (and any other the user still has). Returns the user id, or null if it's unknown, used or expired.
        async takePasswordReset(tokenHash) {
            const row = await get(`SELECT user_id FROM password_resets WHERE token_hash = ? AND expires_at > datetime('now')`, tokenHash);
            // Deleting it first means two requests with the same link can't both use it.
            if (!row || !(await change('DELETE FROM password_resets WHERE token_hash = ?', tokenHash))) return null;
            await run('DELETE FROM password_resets WHERE user_id = ?', row.user_id);
            return row.user_id;
        },
        setPassword: (userId, passwordHash, passwordSalt) => run('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?', passwordHash, passwordSalt, userId),
        deleteSessionsForUser: userId => run('DELETE FROM sessions WHERE user_id = ?', userId),

        async createSurvey({ code, userId, type, title, config, reward, status = 'published', editor = null }) {
            try {
                await run(`INSERT INTO surveys (code, user_id, type, title, config, reward, status, editor, updated_at, published_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ${status === 'published' ? 'CURRENT_TIMESTAMP' : 'NULL'})`,
                    code, userId, type, title, JSON.stringify(config), reward ? JSON.stringify(reward) : null, status, editor ? JSON.stringify(editor) : null);
                return true;
            } catch (error) {
                if (/UNIQUE/.test(error.message)) return false;
                throw error;
            }
        },
        // Newest first, with response and coupon counts.
        async surveysForUser(userId) {
            const rows = await all(`SELECT s.*, COUNT(r.id) AS responses, COUNT(r.coupon_code) AS coupons, COUNT(r.redeemed_at) AS redeemed,
                    MAX(r.created_at) AS last_response
                FROM surveys s LEFT JOIN responses r ON r.survey_code = s.code
                WHERE s.user_id = ? GROUP BY s.code ORDER BY s.created_at DESC`, userId);
            return rows.map(row => ({ ...survey(row), responses: row.responses, coupons: row.coupons, redeemed: row.redeemed, lastResponse: row.last_response }));
        },
        getSurvey: code => get('SELECT * FROM surveys WHERE code = ?', code).then(survey),
        // Sets any of: type, title, config, reward, insights, status, draft, editor (null clears), and updatedAt / publishedAt: true for now.
        updateSurvey(code, fields) {
            const sets = [], values = [];
            for (const [key, value] of Object.entries(fields)) {
                if (key === 'updatedAt' || key === 'publishedAt') { if (value) sets.push(`${key === 'updatedAt' ? 'updated_at' : 'published_at'} = CURRENT_TIMESTAMP`); continue; }
                if (!COLUMNS[key] || value === undefined) continue;
                sets.push(`${COLUMNS[key]} = ?`);
                values.push(value === null || typeof value === 'string' ? value : JSON.stringify(value));
            }
            return sets.length ? run(`UPDATE surveys SET ${sets.join(', ')} WHERE code = ?`, ...values, code) : Promise.resolve();
        },
        // Deletes a survey with all its responses and coupons, if userId owns it. Returns whether it did.
        // The survey goes first, so its link and dashboard card stop at once; then its responses (coupons are on them).
        async deleteSurvey(code, userId) {
            if (!(await change('DELETE FROM surveys WHERE code = ? AND user_id = ?', code, userId))) return false;
            await run('DELETE FROM responses WHERE survey_code = ?', code);
            await run('DELETE FROM voice_notes WHERE survey_code = ?', code);
            return true;
        },

        // The coupon of the response saved with this play token, or null when none was saved.
        responseByNonce: nonce => get('SELECT coupon_code FROM responses WHERE play_nonce = ?', nonce)
            .then(row => row ? { couponCode: row.coupon_code } : null),
        // Returns 'ok', 'nonce-taken' (this token already saved a response) or 'coupon-taken' (pick another code).
        async createResponse({ surveyCode, record, couponCode, playNonce, claimHash = null, couponInfo = null }) {
            try {
                await run('INSERT INTO responses (survey_code, record, coupon_code, play_nonce, claim_hash, coupon_info) VALUES (?, ?, ?, ?, ?, ?)',
                    surveyCode, JSON.stringify(record), couponCode, playNonce, claimHash, couponInfo ? JSON.stringify(couponInfo) : null);
                return 'ok';
            } catch (error) {
                if (!/UNIQUE/.test(error.message)) throw error;
                return /play_nonce/.test(error.message) ? 'nonce-taken' : 'coupon-taken';
            }
        },
        // Oldest first.
        responsesFor: code => all('SELECT record, coupon_code, redeemed_at, created_at FROM responses WHERE survey_code = ? ORDER BY id', code)
            .then(rows => rows.map(r => ({ record: parse(r.record), couponCode: r.coupon_code, redeemedAt: r.redeemed_at, createdAt: r.created_at }))),

        // Saves or replaces a voice note (audio is a Buffer). Unkept until keepVoiceNotes.
        saveVoiceNote: ({ id, surveyCode, questionId, mime, audio, transcript }) =>
            run(`INSERT OR REPLACE INTO voice_notes (id, survey_code, question_id, mime, audio, transcript, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+${VOICE_NOTE_DAYS} days'))`, id, surveyCode, questionId, mime, audio, transcript),
        // Keeps these notes for good, now that their response is saved. Resolves with the ids that exist.
        async keepVoiceNotes(ids) {
            if (!ids.length) return [];
            const marks = ids.map(() => '?').join(', ');
            await run(`UPDATE voice_notes SET expires_at = NULL WHERE id IN (${marks})`, ...ids);
            return (await all(`SELECT id FROM voice_notes WHERE id IN (${marks})`, ...ids)).map(r => r.id);
        },
        voiceNote: id => get('SELECT survey_code, mime, audio FROM voice_notes WHERE id = ?', id)
            .then(r => r ? { surveyCode: r.survey_code, mime: r.mime, audio: r.audio } : null),
        // Notes from games that were never finished.
        removeExpiredVoiceNotes: () => run(`DELETE FROM voice_notes WHERE expires_at <= datetime('now')`),

        // Saves a coupon to a player's account. Returns 'ok', 'not-found', or 'used' (the claim token was spent before).
        async claimCoupon(claimHash, playerId) {
            const row = await get('SELECT id, player_id FROM responses WHERE claim_hash = ?', claimHash);
            if (!row) return { status: 'not-found' };
            if (row.player_id) return { status: 'used', yours: row.player_id === playerId };
            // The player_id check stops two claims with the same token both succeeding.
            return (await change('UPDATE responses SET player_id = ? WHERE id = ? AND player_id IS NULL', playerId, row.id)) ? { status: 'ok' } : this.claimCoupon(claimHash, playerId);
        },
        // The coupons a player has saved, newest first.
        couponsForPlayer: playerId => all('SELECT coupon_code, coupon_info, redeemed_at, created_at FROM responses WHERE player_id = ? AND coupon_code IS NOT NULL ORDER BY id DESC', playerId)
            .then(rows => rows.map(r => ({ code: r.coupon_code, ...parse(r.coupon_info), redeemedAt: r.redeemed_at, earnedAt: r.created_at }))),

        // Marks a coupon used. Only the company whose survey issued it can redeem it.
        async redeemCoupon(couponCode, userId) {
            const row = await get(`SELECT r.id, r.redeemed_at, s.reward, s.title FROM responses r JOIN surveys s ON s.code = r.survey_code
                WHERE r.coupon_code = ? AND s.user_id = ?`, couponCode, userId);
            if (!row) return { status: 'not-found' };
            const reward = parse(row.reward)?.title || '';
            if (row.redeemed_at) return { status: 'already-used', redeemedAt: row.redeemed_at, reward, survey: row.title };
            // The redeemed_at check in the WHERE clause stops two tills redeeming the same code at once.
            if (!(await change('UPDATE responses SET redeemed_at = CURRENT_TIMESTAMP WHERE id = ? AND redeemed_at IS NULL', row.id))) {
                return this.redeemCoupon(couponCode, userId);
            }
            return { status: 'redeemed', reward, survey: row.title };
        }
    };
}

function firestoreStore() {
    const { Firestore, FieldValue, Timestamp } = require('@google-cloud/firestore');
    const db = new Firestore({ ignoreUndefinedProperties: true });
    const users = db.collection('users');
    const userEmails = db.collection('userEmails');   // one doc per email, so two sign-ups can't share an email
    const sessions = db.collection('sessions');
    const passwordResets = db.collection('passwordResets');   // doc id is the SHA-256 of the token in the emailed link
    const surveys = db.collection('surveys');          // doc id is the short code
    const responses = db.collection('responses');      // doc id is the play token's nonce, so each token saves once
    const coupons = db.collection('coupons');          // doc id is the coupon code, so codes are unique
    const voiceNotes = db.collection('voiceNotes');    // doc id is the note's id (one per play token and question)

    const ALREADY_EXISTS = 6;
    const sqlTime = ts => (ts ? ts.toDate().toISOString().slice(0, 19).replace('T', ' ') : null);
    // Emails can contain characters Firestore doesn't allow in doc ids, so the doc id is a hash.
    const emailKey = email => crypto.createHash('sha256').update(email).digest('hex');
    const survey = doc => {
        if (!doc.exists) return null;
        const d = doc.data();
        return { code: doc.id, userId: d.userId, type: d.type, title: d.title, config: parse(d.config), reward: parse(d.reward),
            insights: parse(d.insights), createdAt: sqlTime(d.createdAt), status: d.status || 'published', draft: parse(d.draft), editor: parse(d.editor),
            updatedAt: sqlTime(d.updatedAt || d.createdAt), publishedAt: d.status === 'draft' ? null : sqlTime(d.publishedAt || d.createdAt) };
    };
    const user = doc => doc.exists ? { id: doc.id, ...doc.data() } : null;
    // Deletes every doc a query matches, in batches.
    async function deleteAll(query) {
        for (;;) {
            const page = await query.limit(400).get();
            if (page.empty) return;
            const batch = db.batch();
            page.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }
    }

    return {
        name: 'Firestore',

        async createUser({ id, name, email, passwordHash, passwordSalt, role = 'business' }) {
            const batch = db.batch();
            batch.create(userEmails.doc(emailKey(email)), { userId: id });
            batch.create(users.doc(id), { name, email, password_hash: passwordHash, password_salt: passwordSalt, role, createdAt: FieldValue.serverTimestamp() });
            try {
                await batch.commit();
                return true;
            } catch (error) {
                if (error.code === ALREADY_EXISTS) return false;
                throw error;
            }
        },
        async userByEmail(email) {
            const link = await userEmails.doc(emailKey(email)).get();
            return link.exists ? user(await users.doc(link.data().userId).get()) : null;
        },

        createSession: (token, userId) => sessions.doc(token).set({
            userId, createdAt: FieldValue.serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now() + SESSION_DAYS * 864e5)
        }),
        async userForSession(token) {
            const session = await sessions.doc(token).get();
            if (!session.exists || session.data().expiresAt.toMillis() <= Date.now()) return null;
            return user(await users.doc(session.data().userId).get());
        },
        deleteSession: token => sessions.doc(token).delete(),
        async removeExpiredSessions() {
            for (;;) {
                const expired = await sessions.where('expiresAt', '<', Timestamp.now()).limit(400).get();
                if (expired.empty) return;
                const batch = db.batch();
                expired.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            }
        },

        async createPasswordReset(tokenHash, userId, minutes) {
            await passwordResets.doc(tokenHash).set({ userId, expiresAt: Timestamp.fromMillis(Date.now() + minutes * 60000) });
        },
        // In a transaction, so the same link can't be used twice. Other links the user has are deleted afterwards.
        async takePasswordReset(tokenHash) {
            const userId = await db.runTransaction(async tx => {
                const doc = await tx.get(passwordResets.doc(tokenHash));
                if (!doc.exists) return null;
                tx.delete(doc.ref);
                return doc.data().expiresAt.toMillis() > Date.now() ? doc.data().userId : null;
            });
            if (userId) await deleteAll(passwordResets.where('userId', '==', userId));
            return userId;
        },
        setPassword: (userId, passwordHash, passwordSalt) => users.doc(userId).update({ password_hash: passwordHash, password_salt: passwordSalt }),
        deleteSessionsForUser: userId => deleteAll(sessions.where('userId', '==', userId)),

        async createSurvey({ code, userId, type, title, config, reward, status = 'published', editor = null }) {
            try {
                // The counts are kept on the survey so the dashboard doesn't have to count every response.
                await surveys.doc(code).create({ userId, type, title, config: JSON.stringify(config), reward: reward ? JSON.stringify(reward) : null,
                    status, editor: editor ? JSON.stringify(editor) : null, draft: null,
                    createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), publishedAt: status === 'published' ? FieldValue.serverTimestamp() : null,
                    responseCount: 0, couponCount: 0, redeemedCount: 0, lastResponseAt: null });
                return true;
            } catch (error) {
                if (error.code === ALREADY_EXISTS) return false;
                throw error;
            }
        },
        async surveysForUser(userId) {
            const snap = await surveys.where('userId', '==', userId).get();
            return snap.docs.map(doc => {
                const d = doc.data();
                return { ...survey(doc), responses: d.responseCount, coupons: d.couponCount, redeemed: d.redeemedCount, lastResponse: sqlTime(d.lastResponseAt) };
            }).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        },
        getSurvey: async code => survey(await surveys.doc(code).get()),
        updateSurvey(code, fields) {
            const update = {};
            for (const [key, value] of Object.entries(fields)) {
                if (key === 'updatedAt' || key === 'publishedAt') { if (value) update[key] = FieldValue.serverTimestamp(); continue; }
                if (!['type', 'title', 'config', 'reward', 'insights', 'status', 'draft', 'editor'].includes(key) || value === undefined) continue;
                update[key] = value === null || typeof value === 'string' ? value : JSON.stringify(value);
            }
            return Object.keys(update).length ? surveys.doc(code).update(update) : Promise.resolve();
        },
        // The survey goes first, so its link and dashboard card stop at once; then its responses and their coupons.
        async deleteSurvey(code, userId) {
            const doc = await surveys.doc(code).get();
            if (!doc.exists || doc.data().userId !== userId) return false;
            await surveys.doc(code).delete();
            await deleteAll(voiceNotes.where('surveyCode', '==', code));
            for (;;) {
                const page = await responses.where('surveyCode', '==', code).limit(200).get();
                if (page.empty) return true;
                const batch = db.batch();
                page.docs.forEach(r => { batch.delete(r.ref); if (r.data().couponCode) batch.delete(coupons.doc(r.data().couponCode)); });
                await batch.commit();
            }
        },

        async responseByNonce(nonce) {
            const doc = await responses.doc(nonce).get();
            return doc.exists ? { couponCode: doc.data().couponCode } : null;
        },
        async createResponse({ surveyCode, record, couponCode, playNonce, claimHash = null, couponInfo = null }) {
            const batch = db.batch();
            batch.create(responses.doc(playNonce), { surveyCode, record: JSON.stringify(record), couponCode, redeemedAt: null, createdAt: FieldValue.serverTimestamp(),
                claimHash, playerId: null, couponInfo: couponInfo ? JSON.stringify(couponInfo) : null });
            if (couponCode) batch.create(coupons.doc(couponCode), { responseId: playNonce, surveyCode });
            batch.update(surveys.doc(surveyCode), { responseCount: FieldValue.increment(1), couponCount: FieldValue.increment(couponCode ? 1 : 0),
                lastResponseAt: FieldValue.serverTimestamp() });
            try {
                await batch.commit();
                return 'ok';
            } catch (error) {
                if (error.code !== ALREADY_EXISTS) throw error;
                return (await responses.doc(playNonce).get()).exists ? 'nonce-taken' : 'coupon-taken';
            }
        },
        async responsesFor(code) {
            const snap = await responses.where('surveyCode', '==', code).get();
            return snap.docs.map(doc => {
                const d = doc.data();
                return { record: parse(d.record), couponCode: d.couponCode, redeemedAt: sqlTime(d.redeemedAt), createdAt: sqlTime(d.createdAt) };
            }).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
        },
        // Audio is stored as bytes; a 90-second note is well under Firestore's 1 MB document limit.
        saveVoiceNote: ({ id, surveyCode, questionId, mime, audio, transcript }) => voiceNotes.doc(id).set({
            surveyCode, questionId, mime, audio, transcript: transcript || null, createdAt: FieldValue.serverTimestamp(),
            expiresAt: Timestamp.fromMillis(Date.now() + VOICE_NOTE_DAYS * 864e5)
        }),
        async keepVoiceNotes(ids) {
            if (!ids.length) return [];
            const docs = (await db.getAll(...ids.map(id => voiceNotes.doc(id)))).filter(doc => doc.exists);
            if (docs.length) {
                const batch = db.batch();
                docs.forEach(doc => batch.update(doc.ref, { expiresAt: null }));
                await batch.commit();
            }
            return docs.map(doc => doc.id);
        },
        async voiceNote(id) {
            const doc = await voiceNotes.doc(id).get();
            return doc.exists ? { surveyCode: doc.data().surveyCode, mime: doc.data().mime, audio: Buffer.from(doc.data().audio) } : null;
        },
        // Kept notes have expiresAt null, which a range query never matches.
        removeExpiredVoiceNotes: () => deleteAll(voiceNotes.where('expiresAt', '<', Timestamp.now())),

        // In a transaction, so the same claim token can't save the coupon twice.
        async claimCoupon(claimHash, playerId) {
            const found = await responses.where('claimHash', '==', claimHash).limit(1).get();
            if (found.empty) return { status: 'not-found' };
            return db.runTransaction(async tx => {
                const doc = await tx.get(found.docs[0].ref);
                if (doc.data().playerId) return { status: 'used', yours: doc.data().playerId === playerId };
                tx.update(doc.ref, { playerId });
                return { status: 'ok' };
            });
        },
        async couponsForPlayer(playerId) {
            const snap = await responses.where('playerId', '==', playerId).get();
            return snap.docs.map(doc => doc.data()).filter(d => d.couponCode)
                .map(d => ({ code: d.couponCode, ...parse(d.couponInfo), redeemedAt: sqlTime(d.redeemedAt), earnedAt: sqlTime(d.createdAt) }))
                .sort((a, b) => (b.earnedAt || '').localeCompare(a.earnedAt || ''));
        },

        // In a transaction, so two tills redeeming the same code at once can't both succeed.
        redeemCoupon: (couponCode, userId) => db.runTransaction(async tx => {
            const coupon = await tx.get(coupons.doc(couponCode));
            if (!coupon.exists) return { status: 'not-found' };
            const surveyRef = surveys.doc(coupon.data().surveyCode), responseRef = responses.doc(coupon.data().responseId);
            const [surveyDoc, responseDoc] = await Promise.all([tx.get(surveyRef), tx.get(responseRef)]);
            if (!surveyDoc.exists || surveyDoc.data().userId !== userId || !responseDoc.exists) return { status: 'not-found' };
            const reward = parse(surveyDoc.data().reward)?.title || '', title = surveyDoc.data().title;
            if (responseDoc.data().redeemedAt) return { status: 'already-used', redeemedAt: sqlTime(responseDoc.data().redeemedAt), reward, survey: title };
            tx.update(responseRef, { redeemedAt: FieldValue.serverTimestamp() });
            tx.update(surveyRef, { redeemedCount: FieldValue.increment(1) });
            return { status: 'redeemed', reward, survey: title };
        })
    };
}

module.exports = { createStore: () => (process.env.STORAGE === 'firestore' ? firestoreStore() : sqliteStore()) };
