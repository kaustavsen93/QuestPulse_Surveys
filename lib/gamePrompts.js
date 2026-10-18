/* System prompts that make Gemini return one game config as JSON. Every game follows the same structure:
   schema with limits, story rules, survey integrity rules, then the inputs in the user message. */
const { ENUMS, QUESTION_RANGE, INDOOR_KINDS, detectSetting } = require('../public/games/core/validators.js');

const list = values => values.map(v => `"${v}"`).join(' | ');

const QUESTION_FIELDS = `    "id": "q1", "q2", ... in order,
    "type": "rating" | "choice" | "text" | "nps",
    "prompt": the question, max 120 characters, about one issue only,
    "scale": rating only, an integer from 3 to 10 (use 5 unless the company asks otherwise),
    "labels": rating and nps only, exactly 2 end labels [low end, high end], each max 30 characters,
    "options": choice only, 3 to 5 answers, each max 50 characters,
    "optional": text only, always true`;

// The main character's skin tone is chosen by the app (castMainCharacter in validators.js), so it isn't asked for.
const LOOK_COLOURS = 'hex colours like "#6B4F3A"';
const SETTING_FIELD = `"setting": ${list(ENUMS.setting)}, see SETTING RULES,`;
const APRON = '"apron": true or false, true when the character works in the business (bakery, kitchen, shop)';
const OUTFIT = `"outfit": ${list(ENUMS.outfit)}, what this character wears for their job`;

// One line per setting: which businesses it covers, then typical jobs with their outfit.
const SETTING_GUIDE = {
  bakery: ['a bakery, patisserie, cake or bread shop', 'head baker (chef), pastry chef (chef), cake decorator (apron), counter server (server), delivery driver (casual)'],
  cafe: ['a café, coffee shop or tea room', 'barista (apron), café manager (uniform), cook (chef), table server (server), regular customer (casual)'],
  restaurant: ['a restaurant, bistro, diner or takeaway', 'head chef (chef), line cook (chef), waiter (server), host at the door (suit), kitchen porter (apron)'],
  retail: ['a general shop: kirana, grocery or provision store, supermarket, electronics, hardware or stationery shop (not clothes or pet shops)', 'shopkeeper (apron), cashier (uniform), store manager (suit), stock handler (apron), delivery rider (casual), shopper (casual)'],
  fashion: ['a clothes, saree, shoe or fashion shop, boutique or tailor', 'sales assistant (uniform), tailor (apron), store manager (suit), cashier (uniform), shopper (casual)'],
  petshop: ['a pet shop, pet store or aquarium shop', 'shop owner (apron), pet groomer (apron), cashier (uniform), aquarium keeper (casual), visiting vet (scrubs), pet owner (casual)'],
  salon: ['a hair or beauty salon, barber, spa or nail studio', 'stylist (apron), colourist (apron), barber (apron), receptionist (uniform), salon owner (suit)'],
  gym: ['a gym, fitness, yoga or sports centre', 'personal trainer (sporty), class instructor (sporty), front desk (uniform), member (sporty), manager (suit)'],
  clinic: ['a clinic, dental or medical practice, pharmacy or vet', 'nurse (scrubs), dentist or doctor (scrubs), pharmacist (scrubs), receptionist (uniform), practice manager (suit)'],
  hotel: ['a hotel, inn, resort, B&B or hostel', 'receptionist (suit), concierge (suit), housekeeper (uniform), porter (uniform), hotel chef (chef), guest (casual)'],
  office: ['the company\'s own office, only when the audience is its employees (never for customers of a software or service company)', 'team lead (suit), office manager (suit), receptionist (uniform), engineer or analyst (casual), new starter (casual)'],
  school: ['a school, college, academy or training centre', 'teacher (casual), head teacher (suit), librarian (casual), caretaker (uniform), student (casual)'],
  custom: ['the company\'s own premises when it is a place people visit but no setting above fits: a bank branch, car garage, library, jewellery shop, travel agency, post office, showroom or similar', 'invent fitting staff and visitors (for a bank: cashier, loans officer, security guard, account holder) and dress each in the closest outfit: suit, uniform, casual, apron, scrubs or sporty'],
  village: ['a village, gram panchayat, farming community, self-help group, rural programme or NGO working in villages', 'farmer (kurta), ASHA worker (saree), anganwadi worker (saree), self-help group member (saree), sarpanch (kurta), schoolteacher (saree or kurta), kirana shopkeeper (kurta), dairy cooperative member (kurta), village resident (saree or kurta)']
};
// RPG items that fit each setting, from the icon list.
const SETTING_ICONS = {
  bakery: 'whisk, cupcake, croissant, piping-bag', cafe: 'coffee, croissant, cupcake, book', restaurant: 'plate, whisk, bell, scroll',
  retail: 'shopping-bag, price-tag, apple, key, water-bottle', fashion: 'shopping-bag, price-tag, boots, gem', petshop: 'rope, comb, towel, bell, seed', salon: 'scissors, comb, towel, shopping-bag', gym: 'dumbbell, water-bottle, towel, clipboard',
  clinic: 'clipboard, water-bottle, book, scroll', hotel: 'key, suitcase, towel, map', office: 'laptop, pencil, coffee, clipboard', school: 'pencil, book, apple, scroll',
  custom: 'key, book, scroll, clipboard, bell, map, pencil', village: 'wheat, matka, seed, bell, rope, book, lantern'
};
const settingGuide = withStops => Object.entries(SETTING_GUIDE)
  .map(([k, [where, jobs]]) => `  - "${k}": ${where}. Jobs: ${jobs}.${withStops ? ` RPG stops: ${INDOOR_KINDS[k].join(', ')}. Good item icons: ${SETTING_ICONS[k]}.` : ''}`).join('\n');
const FOOD_SETTINGS = '"bakery", "cafe", "restaurant"';

/* QuestPulse is used mainly with audiences in India, many of them in villages and small towns. Gemini drifts into
   American wording (county, sheriff, dollars), so the prompt steers it and the server rejects whatever slips through. */
const FOREIGN_WORDS = /\b(count(y|ies)|sheriffs?|marshals?|state troopers?|ranch(es|ers?)?|cowboys?|cowgirls?|saloons?|prairies?|barns?|diners?|dollars?|cents|zip ?codes?|main street|thanksgiving|halloween|prom|homecoming|quarterbacks?|bucks)\b|\$/gi;
const LOCALE_RULES = `LOCALE RULES (India)
- The players live in India, many in villages and small towns. Use Indian first names and surnames from different regions, Indian places and everyday things, and money in rupees (₹).
- Use Indian terms for local government and public services: gram panchayat, sarpanch, block office, tehsil, district, police station, inspector, constable, ASHA worker, anganwadi, ration shop, weekly haat.
- Never use these American or British words: county, sheriff, marshal, state trooper, ranch, cowboy, saloon, prairie, barn, diner, dollars, cents, zip code, Main Street, Thanksgiving, Halloween, prom, homecoming, quarterback. A detective is an "inspector" or a "detective", never a sheriff. Use a cowshed or godown, not a barn.`;

const GAMES = {
  detective: {
    name: 'DETECTIVE MYSTERY',
    idea: 'Witnesses each ask the player one survey question. Answering reveals a clue, a friendly detective comments on the clue, and the case is solved at the end.',
    schema: `{
  "caseNumber": "Case No. " followed by 4 digits,
  "title": the case title, 3 to 7 words, max 50 characters,
  "company": exactly the company name from the inputs,
  ${SETTING_FIELD}
  "detective": {
    "name": max 40 characters,
    "title": a playful job title, max 50 characters,
    "introLine": max 200 characters, first person, the detective introduces themself and asks for the player's help,
    "catchphrase": max 40 characters,
    "look": { "hat": ${list(ENUMS.detective.hat)}, "accessory": ${list(ENUMS.detective.accessory)}, "coatColor", "accentColor": ${LOOK_COLOURS}, ${APRON} }
  },
  "intro": an array of 2 or 3 strings (paragraphs), each max 160 characters; set the scene of the mystery,
  "questions": [ {
${QUESTION_FIELDS},
    "witness": { "name": max 30 characters, "role": max 40 characters, a job in the company's business, "initial": 1 or 2 characters, ${OUTFIT} },
    "setup": max 160 characters, the witness offers to share what they saw in return for an answer,
    "clue": max 120 characters, the clue revealed after answering; clues build toward the solution,
    "detectiveNote": max 90 characters, the detective's comment on the clue (never on the answer)
  } ],
  "ending": max 320 characters, the detective reveals a harmless, cheerful solution and says that what people shared helps decide what happens next
}`,
    extra: '- The mystery is always harmless: something moved, misplaced or prepared as a surprise. Nobody is accused of wrongdoing.'
  },

  rpg: {
    name: 'RPG QUEST',
    idea: 'A traveller walks a storybook map. At each stop an inhabitant asks one survey question; answering grants an item for the traveller\'s satchel. The traveller reaches a destination at the end and the guide delivers the ending.',
    schema: `{
  "title": the quest title, 3 to 7 words, max 50 characters,
  "company": exactly the company name from the inputs,
  ${SETTING_FIELD}
  "hero": {
    "name": the guide who travels with the player, max 40 characters,
    "introLine": max 200 characters, first person, the hero offers to guide the player,
    "look": { "outfitColor", "accentColor": ${LOOK_COLOURS}, "headgear": ${list(ENUMS.rpg.headgear)}, "item": ${list(ENUMS.rpg.item)}, ${APRON} }
  },
  "world": {
    "name": max 40 characters,
    "palette": ${list(ENUMS.rpg.palette)},
    "destination": { "name": max 30 characters, "kind": one of the stop kinds below }
  },
  "intro": an array of 2 or 3 strings (paragraphs), each max 160 characters; set out the journey,
  "questions": [ {
${QUESTION_FIELDS}
  } ],
  "stops": exactly one stop per question, in the same order: [ {
    "questionId": the matching question id,
    "place": max 30 characters,
    "kind": outdoor ${list(ENUMS.rpg.kind)} when the setting is "none"; otherwise one of that setting's RPG stops from SETTING RULES (vary them; the route reads from first to last stop),
    "inhabitant": { "name": max 30 characters, "role": max 40 characters, a job in the company's business, ${OUTFIT} },
    "line": max 160 characters, the inhabitant greets the player and offers their item in return for an answer (do not repeat the question; it is shown separately),
    "item": { "name": max 28 characters, "icon": ${list(ENUMS.rpg.icon)} },
    "guideNote": max 100 characters, the hero's comment about the item or the road ahead (never on the answer)
  } ],
  "ending": max 320 characters, the hero and player arrive at the destination and the hero delivers the ending
}`,
    extra: '- When the setting is not "none", every stop and the destination use that setting\'s RPG stops, and items are things from that place. For most settings this is a walk through the business itself; for "village" it is a walk around the village (fields, the well, the haat, the chaupal under the banyan).\n- Items are useful travel things for the road ahead. Pick the icon first, then name the item as the object that icon shows (icon "key" → "Gate key", icon "rope" → "Coil of rope"). Use each icon at most twice.'
  },

  quiz: {
    name: 'QUIZ SHOW',
    idea: 'A host presents each survey question as a round on a TV game show. Every answer earns the same participation points. A scoreboard fills as rounds are played and the show ends with a finale.',
    schema: `{
  "title": tonight's episode title, 2 to 6 words, max 50 characters,
  "company": exactly the company name from the inputs,
  ${SETTING_FIELD}
  "host": {
    "name": max 40 characters,
    "catchphrase": max 40 characters,
    "introLine": max 200 characters, first person, the host welcomes the player to the show,
    "look": { "suitColor", "accentColor": ${LOOK_COLOURS}, "hair": ${list(ENUMS.quiz.hair)}, "accessory": ${list(ENUMS.quiz.accessory)}, ${APRON} }
  },
  "show": { "name": an invented show name, max 30 characters, "palette": ${list(ENUMS.quiz.palette)} },
  "intro": an array of 1 or 2 strings (paragraphs), each max 160 characters; say every answer earns the same points,
  "questions": [ {
${QUESTION_FIELDS},
    "roundTitle": a fun name for this round, max 30 characters,
    "hostLine": max 140 characters, the host introduces the round's topic (never comments on any answer)
  } ],
  "ending": max 260 characters, the host's closing line for the finale
}`,
    extra: '- It is an opinion show. Never call answers correct, incorrect, right, wrong, winning or losing, and never suggest some answers score more. Never call it trivia, a test or an exam.'
  },

  platformer: {
    name: 'PLATFORMER',
    idea: 'A runner crosses a side-scrolling level. Each checkpoint pauses the game for one survey question; answering earns a star and the runner cheers about the checkpoint. The runner celebrates at the finish.',
    schema: `{
  "title": the level title, 2 to 5 words, max 40 characters,
  "company": exactly the company name from the inputs,
  ${SETTING_FIELD}
  "runner": {
    "name": max 20 characters,
    "introLine": max 180 characters, first person, the runner invites the player to run the level together,
    "look": { "bodyColor", "accentColor": ${LOOK_COLOURS}, "headgear": ${list(ENUMS.platformer.headgear)}, ${APRON} }
  },
  "level": { "name": max 30 characters, "theme": ${list(ENUMS.platformer.theme)} (when the setting is not "none" the level is drawn as that business; still pick one), "palette": ${list(ENUMS.platformer.palette)} },
  "intro": an array of 1 or 2 strings (paragraphs), each max 160 characters; mention there are no lives and no timer,
  "questions": [ {
${QUESTION_FIELDS},
    "checkpointName": a landmark that fits the level theme, max 24 characters,
    "cheerLine": max 110 characters, the runner's comment about the checkpoint scenery after answering (never about the answer)
  } ],
  "ending": max 220 characters, the runner's line at the finish
}`,
    extra: '- The runner and level are original. Never reference or imitate existing video games, their characters, power-ups, sounds or level designs.\n- Checkpoints are landmarks along the way. The finish arch comes after the last checkpoint, so no checkpoint is the finish and no cheerLine says the run is over; save that for the ending.'
  }
};

function systemPrompt(type) {
  const g = GAMES[type];
  const [min, max] = QUESTION_RANGE[type];
  return `You turn a company's survey goal into a ${g.name} survey game for QuestPulse. ${g.idea}
Return ONLY one valid JSON object that matches the schema below. No markdown, no comments, no extra keys.

SCHEMA (field: description and limits)
${g.schema}

STORY RULES
- Workplace-safe and light-hearted. No violence, harm, romance, politics, religion, health scares or anything frightening.
- Invent every character, place and name. Never use real people, celebrities, brands other than the company, or characters, catchphrases or storylines from existing books, films, TV shows or games, even when the company name or goal brings one to mind. A goal may ask for the feel of a genre or setting; capture it with original characters.
- The story progresses logically with every question and resolves in the ending.
- Plain text only in every field: no markdown, emoji or HTML. Stay within every character limit.
- Tone: follow the "Tone" input (playful = jokey and upbeat, warm = friendly and gentle, professional = light but restrained).
${g.extra}

${LOCALE_RULES}

SETTING RULES
- "setting" is where the game takes place. Pick the one that matches the company's business. Use "custom" for a place people visit that no other setting fits, and "none" for online services, apps and anything without a place to visit:
${settingGuide(type === 'rpg')}
- The "Setting" input comes from keywords in the company name and goal. Use it unless the company clearly runs a different kind of business.
- When the setting is not "none", the story happens inside that business: places, landmarks, items and round names come from it (for a gym: the treadmills, the weights rack, a water bottle). For "village" it happens around the village: the fields, the well, the handpump, the haat, the panchayat bhavan.
- Every supporting character has a real job in the company's business, or is one of its customers, or (in a village) one of the people who live there. Give each one the outfit listed with that job; "casual" fits anyone else.
- Only in ${FOOD_SETTINGS} may the main character wear "toque" (a chef's hat). The main character wears an apron only when their job would.

SURVEY INTEGRITY RULES
- Every question is neutral and asks about one issue. No leading or loaded wording, no double-barrelled questions, no assumptions about the respondent.
- Choice options are balanced, mutually exclusive and cover the likely range. Add a neutral or "not applicable" option when some people may not fit.
- Rating and nps end labels are plain, symmetric opposites (for example "Very poor" / "Excellent", "Very dissatisfied" / "Very satisfied"). No jokes, hype or story words in prompts, options or labels.
- Every question serves the survey goal for its audience.
- Match the type to what is measured: satisfaction, ease, quality or agreement → "rating" with scale 5 and end labels; likelihood to recommend → "nps"; frequency or category → "choice"; open feedback → "text" with "optional": true. Use at most one "nps" and at most two "text" questions.
- Story and character text never hints at a preferred answer, never praises the company or its products, never comments on the respondent's answers, and never implies right or wrong answers. Rewards are for answering, not for what is answered.
- The last intro paragraph tells the player their answers are anonymous and there are no right or wrong answers.
- Write exactly the number of questions requested (between ${min} and ${max}).
- Write every text field in the requested language.`;
}

const settingHint = hint => hint === 'none'
  ? '- Setting: no keyword match. Use one of the businesses in SETTING RULES if the company clearly runs one; "custom" if it runs a place people visit that none of them fits; otherwise "none"'
  : `- Setting: "${hint}" (use this setting)`;

function userPrompt(inputs) {
  return `INPUTS
- Company: ${inputs.company}
${settingHint(detectSetting(inputs.company, inputs.goal))}
- Survey goal: ${inputs.goal}
- Audience: work out from the survey goal and company who is being asked
- Number of questions: ${inputs.questionCount} (write exactly this many)
- Language: ${inputs.language === 'Hindi' ? 'Hindi, in Devanagari script. Use simple, everyday Hindi a general audience understands; common English loanwords (like "app" or "online") are fine. Keep every JSON key and every fixed option value (types, kinds, icons, colours, setting) exactly as listed in English.' : inputs.language}
- Tone: ${inputs.tone}`;
}

function fixPrompt(prompt, previousText, errors) {
  return `${prompt}

Your previous JSON failed validation with these errors:
${errors.map(e => `- ${e}`).join('\n')}

Return the complete corrected JSON object only.

PREVIOUS JSON
${previousText}`;
}

// Changing the game type in the Game Editor: a new game's story around questions the business has already written.
function convertPrompt(inputs, from, questions) {
  return `${userPrompt(inputs)}
- Setting: "${from.setting || 'none'}" (use this setting, whatever the line above says)

TASK
The business has already written and edited the survey questions below for a different kind of game. Write a complete game of the type in the schema around them:
- Use exactly these questions, in this order, with the same ids, types, prompts, options, end labels, scale and optional flags. Never reword, add or remove a question.
- Write every story field the schema asks for, for the game and for each question, so the story flows from question to question.
- Title: "${from.title}" (keep it exactly).
QUESTIONS
${JSON.stringify(questions)}`;
}

/* Lists foreign words in any story text Gemini wrote. The company name is the customer's own and is never flagged. */
function localeIssues(config, company) {
    const skip = new Set(['id', 'company', 'setting', 'lang', 'type', 'kind', 'icon', 'palette', 'theme', 'outfit', 'hat', 'accessory', 'headgear', 'item', 'hair']);
    const companyRe = company ? new RegExp(company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi') : null;
    const found = new Map();
    (function walk(v, path, key) {
        if (typeof v === 'string') {
            if (skip.has(key) || /Color$|Tone$/.test(key || '')) return;
            const text = companyRe ? v.replace(companyRe, '') : v;
            for (const m of text.matchAll(FOREIGN_WORDS)) if (!found.has(m[0].toLowerCase())) found.set(m[0].toLowerCase(), path);
        } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`, key));
        else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, path ? `${path}.${k}` : k, k));
    })(config, '', '');
    return [...found].map(([word, path]) => `${path}: "${word}" is not used in India. Rewrite it with an Indian word (see LOCALE RULES).`);
}

module.exports = { systemPrompt, userPrompt, fixPrompt, convertPrompt, localeIssues };
