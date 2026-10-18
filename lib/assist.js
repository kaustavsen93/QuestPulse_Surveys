/* The smaller AI helpers around game generation: checking a survey brief, writing one, regenerating a single
   question, and summarising a survey's answers. Each returns the prompts to send and checks what comes back. */
const { systemPrompt, userPrompt } = require('./gamePrompts');

const clip = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
// Model answers are JSON, sometimes wrapped in a ``` code fence.
const parseJson = text => JSON.parse(String(text).trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, ''));

/* ---------- survey brief: feedback while typing, and "write it for me" ---------- */

const BRIEF_RULES = `A good brief says who is being asked (customers, staff, students, villagers...) and what the organisation wants
to learn, with enough detail to write focused survey questions. One or two sentences is enough.`;

function reviewBriefPrompts({ goal, company }) {
    return {
        system: `You give one line of feedback on a short survey brief that a business or organisation typed.
${BRIEF_RULES}
Return ONLY JSON: {"status": "good" | "tip", "message": string of at most 110 characters}.
- "good" when the brief already says who is being asked and has a clear topic. The message says so in a few friendly words, for example "Looks good: clear audience and topic."
- Otherwise "tip": give the ONE change that would help most, as a friendly suggestion starting with a verb, for example "Try adding who you are asking, such as recent customers or staff." or "Try naming what you want to learn about, such as prices or waiting times."
- Never rewrite the brief and never ask more than one thing. Write in English.`,
        user: `Company: ${clip(company, 80) || 'not given'}\nBrief: ${clip(goal, 2000)}`
    };
}

function readBriefReview(text) {
    const data = parseJson(text);
    const status = data.status === 'good' ? 'good' : 'tip';
    const message = clip(data.message, 140);
    if (!message) throw new Error('The review had no message.');
    return { status, message };
}

function writeBriefPrompts({ goal, company, gameLabel }) {
    return {
        system: `You write the brief for a survey that QuestPulse turns into a short story game.
${BRIEF_RULES}
Return ONLY JSON: {"brief": string of at most 280 characters}.
- Write the brief in the first person plural ("We want to know..."), plain text, no lists.
- Keep every detail from the draft. Add the missing parts (who is asked, what to learn) in a way that fits the company.
- Do not invent facts such as prices, product names, dates or numbers that the draft doesn't give.
- If the draft is in Hindi, write the brief in Hindi; otherwise in Indian English, with British spellings (flavour, colour, centre).`,
        user: `Company: ${clip(company, 80) || 'not given'}\nGame: ${gameLabel || 'any'}\nDraft: ${clip(goal, 2000) || 'empty'}`
    };
}

function readWrittenBrief(text) {
    const data = parseJson(text);
    const brief = clip(data.brief, 400);
    if (brief.length < 10) throw new Error('The brief was too short.');
    return { brief };
}

/* ---------- regenerate one question ---------- */

function questionPrompts(type, inputs, config, index) {
    const q = config.questions[index];
    const rpgStop = type === 'rpg' ? `, "stop": the matching stop object (same schema as "stops", with "questionId": "${q.id}")` : '';
    return {
        system: systemPrompt(type),
        user: `${userPrompt(inputs)}

CURRENT GAME
${JSON.stringify(config)}

TASK
Replace question ${index + 1} (id "${q.id}") with a different question that still serves the survey goal for this audience.
- Ask about something the other questions don't already cover, or ask the same thing in a clearer way. Never repeat another question.
- Keep the id "${q.id}" and the type "${q.type}", so the survey keeps its mix of questions (its 0 to 10 recommendation score stays a score, an open question stays open).
- Rewrite the story fields that belong to this question so they fit the new question and still flow from the question before it to the one after it, and toward the ending.
- Change nothing else.
Return ONLY JSON: {"question": the new question object with all its fields${rpgStop}}.`
    };
}

// Puts the new question (and RPG stop) into a copy of the config, ready for validation.
function applyQuestion(type, config, index, text) {
    const data = parseJson(text);
    if (!data || typeof data.question !== 'object') throw new Error('The response had no "question" object.');
    const next = JSON.parse(JSON.stringify(config));
    const id = next.questions[index].id;
    next.questions[index] = { ...data.question, id };
    if (type === 'rpg') {
        if (!data.stop || typeof data.stop !== 'object') throw new Error('The response had no "stop" object.');
        next.stops[index] = { ...data.stop, questionId: id };
    }
    return next;
}

/* Spare questions: one ready-made alternative for every question, fetched in the background while the review
   screen is open, so "New question" can swap one in instantly instead of waiting on the AI. */
function sparesPrompts(type, inputs, config) {
    const rpgStop = type === 'rpg' ? ', "stop": the matching stop object (same schema as "stops", with the same "questionId")' : '';
    return {
        system: systemPrompt(type),
        user: `${userPrompt(inputs)}

CURRENT GAME
${JSON.stringify(config)}

TASK
For EVERY question in the game, write one alternative question that could replace it.
- Each alternative serves the survey goal for this audience and asks about something the other questions don't cover, or asks the same thing more clearly. Never repeat a question already in the game.
- Keep each question's id and type, so the survey keeps its mix of questions (its 0 to 10 recommendation score stays a score, an open question stays open).
- Rewrite the story fields that belong to that question so they fit the alternative and still flow from the question before it to the one after it.
Return ONLY JSON: {"spares": [ { "questionId": the id it replaces, "question": the full question object with all its fields${rpgStop} } ] } with one item per question, in order.`
    };
}

// Each spare checked on its own: swapped into a copy of the game, repaired and validated. Only spares that pass are kept.
function readSpares(type, config, text, check) {
    const data = parseJson(text);
    const spares = Array.isArray(data && data.spares) ? data.spares : [];
    const kept = [];
    for (const spare of spares) {
        const index = config.questions.findIndex(q => q.id === (spare && spare.questionId));
        if (index < 0 || !spare.question || spare.question.type !== config.questions[index].type) continue;
        try {
            const next = applyQuestion(type, config, index, JSON.stringify(spare));
            if (!check(next).length) kept.push({ index, question: next.questions[index], ...(type === 'rpg' && { stop: next.stops[index] }) });
        } catch { /* a malformed spare is simply skipped */ }
    }
    return kept;
}

/* ---------- analytics summary ---------- */

const answered = v => v !== null && v !== undefined && v !== '';

// The numbers for each question, worked out here so the model never has to count.
function surveyStats(config, records) {
    const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
    return config.questions.map(q => {
        // Only people who were shown the question: one added when the survey was published again is missing from older answers.
        const shown = records.filter(r => r.answers && Object.prototype.hasOwnProperty.call(r.answers, q.id));
        const given = shown.map(r => r.answers[q.id]).filter(answered);
        const base = { id: q.id, type: q.type, prompt: q.prompt, answered: given.length, skipped: shown.length - given.length };
        if (q.type === 'choice') return { ...base, options: q.options.map(o => { const count = given.filter(a => a === o).length; return { option: o, count, percent: pct(count, given.length) }; }) };
        if (q.type === 'rating') {
            const nums = given.map(Number);
            return { ...base, scale: q.scale, labels: q.labels, average: nums.length ? +(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : null,
                counts: Object.fromEntries(Array.from({ length: q.scale }, (_, k) => [k + 1, nums.filter(n => n === k + 1).length])) };
        }
        if (q.type === 'nps') {
            const nums = given.map(Number), pro = nums.filter(v => v >= 9).length, det = nums.filter(v => v <= 6).length;
            return { ...base, npsScore: pct(pro, nums.length) - pct(det, nums.length), promoters: pro, passives: nums.length - pro - det, detractors: det };
        }
        return base;
    });
}

// Every text answer with an id like "r3" (the third response), so quotes can be traced back. Newest first, at most 300.
function textAnswers(config, records) {
    const textQs = config.questions.filter(q => q.type === 'text');
    const out = [];
    records.forEach((r, i) => textQs.forEach(q => {
        const a = (r.answers || {})[q.id];
        if (typeof a === 'string' && a.trim()) out.push({ responseId: `r${i + 1}`, questionId: q.id, text: a.trim().slice(0, 500),
            rushed: ((r.flags && r.flags.tooFast) || []).includes(q.id) });
    }));
    return out.reverse().slice(0, 300);
}

function insightsPrompts(config, records) {
    const rushedOf = r => ((r.flags && r.flags.tooFast) || []).length;
    const rushedAnswers = records.reduce((n, r) => n + rushedOf(r), 0);
    const rushedPeople = records.filter(r => rushedOf(r) > 0).length;
    const ids = new Set(config.questions.map(q => q.id));
    const totalAnswers = records.reduce((n, r) => n + Object.keys(r.answers || {}).filter(id => ids.has(id)).length, 0);
    return {
        system: `You summarise the results of a survey for the small business or organisation in India that ran it.
Return ONLY JSON with this shape:
{
  "headline": one sentence of at most 160 characters: the single most important finding,
  "themes": 1 to 4 items [{ "title": at most 40 characters, "summary": at most 220 characters, "sentiment": "positive" | "mixed" | "negative",
              "quotes": 0 to 2 items [{ "responseId": "r3", "text": copied word for word from TEXT ANSWERS, "translation": English translation, only when the text isn't English }] }],
  "perQuestion": one item per question [{ "questionId": "q1", "takeaway": at most 140 characters }],
  "actions": 1 to 3 items [{ "text": a concrete next step, at most 160 characters, "priority": "high" | "medium" | "low", "because": the evidence, at most 140 characters }],
  "dataQuality": at most 200 characters on how far to trust these results (number of responses, skipped or rushed answers)
}
RULES
- Base every statement on the STATS and TEXT ANSWERS given. Use their numbers; never invent responses, numbers or percentages.
- Quotes must be exact copies of a text answer, with that answer's responseId. Leave quotes empty if no answer fits.
- Rushed answers were given in under 1.5 seconds; trust them less.
- With fewer than 20 responses, call findings early signs rather than conclusions.
- Neutral, plain English. Don't praise or blame the company or the respondents.`,
        user: `SURVEY: ${clip(config.title, 120)} (${clip(config.company, 80)})
PEOPLE WHO RESPONDED: ${records.length}
PEOPLE WHO RUSHED AT LEAST ONE ANSWER: ${rushedPeople} of ${records.length}
RUSHED ANSWERS: ${rushedAnswers} of ${totalAnswers} answers in total
STATS
${JSON.stringify(surveyStats(config, records))}
TEXT ANSWERS
${JSON.stringify(textAnswers(config, records))}`
    };
}

/* Keeps only well-formed parts of the summary, and drops any quote that isn't word for word in the answers it cites.
   Returns the summary plus how many quotes were dropped, which the server logs. */
function readInsights(text, config, records) {
    const data = parseJson(text);
    const norm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const byResponse = new Map();
    textAnswers(config, records).forEach(a => byResponse.set(a.responseId, [...(byResponse.get(a.responseId) || []), norm(a.text)]));
    const ids = new Set(config.questions.map(q => q.id));
    const oneOf = (v, list, fallback) => (list.includes(v) ? v : fallback);
    let dropped = 0;

    const themes = (Array.isArray(data.themes) ? data.themes : []).slice(0, 4).map(t => ({
        title: clip(t.title, 60), summary: clip(t.summary, 300), sentiment: oneOf(t.sentiment, ['positive', 'mixed', 'negative'], 'mixed'),
        quotes: (Array.isArray(t.quotes) ? t.quotes : []).filter(q => {
            const ok = q && (byResponse.get(q.responseId) || []).some(answer => norm(q.text) && answer.includes(norm(q.text)));
            if (!ok) dropped++;
            return ok;
        }).slice(0, 2).map(q => ({ responseId: q.responseId, text: clip(q.text, 500), translation: clip(q.translation, 500) }))
    })).filter(t => t.title && t.summary);

    const summary = {
        headline: clip(data.headline, 220),
        themes,
        perQuestion: (Array.isArray(data.perQuestion) ? data.perQuestion : []).filter(p => p && ids.has(p.questionId))
            .map(p => ({ questionId: p.questionId, takeaway: clip(p.takeaway, 200) })).filter(p => p.takeaway),
        actions: (Array.isArray(data.actions) ? data.actions : []).slice(0, 3)
            .map(a => ({ text: clip(a.text, 200), priority: oneOf(a.priority, ['high', 'medium', 'low'], 'medium'), because: clip(a.because, 200) })).filter(a => a.text),
        dataQuality: clip(data.dataQuality, 260)
    };
    if (!summary.headline) throw new Error('The summary had no headline.');
    return { summary, dropped };
}

/* Writing down a respondent's voice note. The question gives the model context for names and words it might mishear;
   the answer stays in the language and script it was spoken in, so the AI summary quotes it as the person said it. */
function transcriptPrompts(config, question) {
    return {
        system: `You write down voice notes left as answers to a survey, word for word.
Return ONLY JSON: { "transcript": the words spoken }
RULES
- Write exactly what was said, in the language it was said in. Hindi goes in Devanagari; English words in a Hindi sentence stay in Latin letters. Never translate.
- Leave out filler sounds (um, uh, hmm) and false starts. Add normal punctuation.
- If nothing can be understood (silence, noise, music), return an empty transcript. Never guess or make up words.`,
        user: `SURVEY: ${clip(config.title, 120)} (${clip(config.company, 80)})
QUESTION THE PERSON WAS ANSWERING: ${clip(question.prompt, 300)}
The voice note follows.`
    };
}
const readTranscript = text => String(parseJson(text).transcript || '').replace(/\s+/g, ' ').trim().slice(0, 2000);

module.exports = { parseJson, transcriptPrompts, readTranscript, reviewBriefPrompts, readBriefReview, writeBriefPrompts, readWrittenBrief, questionPrompts, applyQuestion, sparesPrompts, readSpares, insightsPrompts, readInsights };
