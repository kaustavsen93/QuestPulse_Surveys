/* Scenery for a "custom" business (one no hand-drawn setting covers). Gemini describes the scene: which hand-drawn
   parts stand where, and up to three objects of the business's own drawn as lists of simple shapes. It never writes
   markup; the game draws everything in its own style (public/games/core/banners.js). */
const { SCENERY, cleanScenery } = require('../public/games/core/validators.js');
const { parseJson } = require('./assist');

const PALETTE_MOODS = 'office (cool blue and grey), clinic (calm teal), hotel (cream and gold), school (soft green), cafe (warm brown), bakery (pink and cream), ' +
  'restaurant (deep red), retail (turmeric and green), fashion (cream and pink), petshop (sky blue and orange), salon (rose), gym (grey and lime)';

const ATM_EXAMPLE = JSON.stringify({ id: 'atm', zone: 'floor', w: 60, h: 100, shapes: [
  { t: 'rect', x: 0, y: 8, w: 60, h: 90, rx: 4, fill: 'grey' }, { t: 'rect', x: 0, y: 0, w: 60, h: 16, rx: 3, fill: 'blue' },
  { t: 'rect', x: 10, y: 24, w: 40, h: 26, rx: 2, fill: 'glass' }, { t: 'path', d: 'M16 32h28M16 40h18', fill: 'none', outline: 'thin' },
  { t: 'rect', x: 14, y: 56, w: 22, h: 18, rx: 2, fill: 'light-grey' }, { t: 'circle', cx: 19, cy: 61, r: 1.6, fill: 'dark-grey', outline: 'none' },
  { t: 'rect', x: 40, y: 58, w: 10, h: 4, fill: 'dark-grey' }, { t: 'rect', x: 12, y: 82, w: 36, h: 5, rx: 1, fill: 'dark-grey' }] });

function sceneryPrompts(inputs, config) {
  const hindi = inputs.language === 'Hindi';
  const stops = Array.isArray(config.stops)
    ? config.stops.map(s => `  ${s.questionId}: ${s.place} (drawn as ${s.kind})`).join('\n') : '  none (this game has no map stops)';
  return {
    system: `You design the scene for a survey game set inside a business. You never draw freely: you choose hand-drawn parts and,
for things only this business has, describe up to ${SCENERY.maxProps} objects as simple shapes. The game draws everything in its own flat, hand-drawn style.
Return ONLY one JSON object:
{
  "palette": one of ${SCENERY.palettes.map(p => `"${p}"`).join(' | ')}; pick the mood that suits the business: ${PALETTE_MOODS},
  "floor": "planks" | "tiles" | "carpet",
  "wallStripes": true | false,
  "columns": exactly 5 items, left to right: { "wall": a wall part, "prop:<id>" of a wall object, or null; "floor": a floor part, "prop:<id>" of a floor object, or null },
  "props": 0 to ${SCENERY.maxProps} objects only this business has: { "id": short-kebab-case-id, "zone": "wall" | "floor", "tall": true only for a floor object taller than a person,
             "w": width 20 to 160, "h": height 20 to 150, "shapes": [...] },
  "stopIcons": 0 to ${SCENERY.maxStopIcons} icons for map stops that no listed drawing shows well: { "questionId": the stop's question id, "shapes": [...] inside a 44 wide by 40 high box, standing on its bottom edge },
  "label": one sentence for screen readers, at most 200 characters, starting "Inside the <place>:" and naming only things you actually placed in the columns, in Indian English with British spellings (tyre, colour)"${hindi ? ',\n  "labelHi": the same sentence in simple Hindi' : ''}
}

PARTS
- Wall: ${SCENERY.wallParts.join(', ')} (window shows a garden, city-window shows buildings, picture is a framed landscape, noticeboard has pinned papers).
- Floor: ${SCENERY.floorParts.join(', ')} (counter is a shop counter with a till, reception-desk is a curved desk with a monitor and bell, waiting-chairs is a row of three, desk has a computer and chair, bookshelf is floor to ceiling).
- The middle column's floor is where visitors are served: ${SCENERY.centreParts.join(', ')}, or one of your floor objects.
- A tall floor item (bookshelf, or an object with "tall": true) hides the wall item above it, so leave that wall null.

SHAPES (coordinates inside the object's own w by h box; y grows downwards; a floor object's bottom edge is the floor)
- {"t":"rect","x","y","w","h","rx" optional,"fill"} · {"t":"circle","cx","cy","r","fill"} · {"t":"ellipse","cx","cy","rx","ry","fill"} · {"t":"path","d","fill"}
- "d" uses only the commands M L H V Q C A Z and numbers.
- "fill" is one of: ${Object.keys(SCENERY.colours).join(', ')}, or "none" for a plain line.
- "outline": "normal" (the default), "thin" for small details, or "none" for highlights and tiny dots.

STYLE (break these and the object looks out of place)
- A children's picture book in flat vector: a few large, simple shapes. 6 to 25 shapes per object, never more than ${SCENERY.maxShapes}.
- Seen straight on: no perspective, no shadows, no gradients, no shine.
- No text, letters, numbers or logos anywhere. No people or animals; characters are added separately.
- 2 to 4 colours per object: light colours on big areas, strong colours for small details. Keep every detail at least 3 units wide.
- Each object must be recognisable from its outline alone, at small size.

EXAMPLE floor object (a cash machine):
${ATM_EXAMPLE}

Make the scene look like a real, tidy room of this business: about 3 wall items and 4 or 5 floor items, its own objects near the middle,
nothing repeated more than twice. Only add objects that a visitor would recognise as belonging to this kind of business.`,
    user: `Company: ${inputs.company}
What the survey is about: ${inputs.goal}
Game title: ${config.title || ''}
Map stops:
${stops}`
  };
}

// The cleaned scenery, or null when too little of it survived the checks to be worth drawing.
function readScenery(text) {
  const scenery = cleanScenery(parseJson(text));
  const filled = scenery ? scenery.columns.filter(c => c.wall || c.floor).length : 0;
  if (filled < 3) throw new Error('The scenery description was too empty to draw.');
  return scenery;
}

module.exports = { sceneryPrompts, readScenery };
