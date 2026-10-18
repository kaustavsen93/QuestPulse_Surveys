/* Bakery samples for every game (open any game with ?sample=bakery). Same shape Gemini returns with setting "bakery". */
(function (QP) {
  const questions = [
    { id: 'q1', type: 'choice', prompt: 'How often do you visit Crumb & Co?',
      options: ['Several times a week', 'About once a week', 'A few times a month', 'Rarely', 'This is my first visit'] },
    { id: 'q2', type: 'rating', scale: 5, labels: ['Very poor', 'Excellent'], prompt: 'How would you rate the freshness of our bread?' },
    { id: 'q3', type: 'rating', scale: 5, labels: ['Very dissatisfied', 'Very satisfied'], prompt: 'How satisfied are you with our cake selection?' },
    { id: 'q4', type: 'rating', scale: 5, labels: ['Very slow', 'Very quick'], prompt: 'How quick was the service at the counter?' },
    { id: 'q5', type: 'text', optional: true, prompt: 'What one thing would you like us to bake next?' },
    { id: 'q6', type: 'nps', labels: ['Not at all likely', 'Extremely likely'], prompt: 'How likely are you to recommend Crumb & Co to a friend?' }
  ];
  const withExtras = extras => questions.map((q, i) => Object.assign({}, q, extras[i]));
  const intro = 'Your answers are anonymous. There are no right or wrong answers.';

  QP.samples = QP.samples || {};
  QP.samples.bakery = {
    detective: {
      id: 'crumb-co-detective-bakery', setting: 'bakery', caseNumber: 'Case No. 0614',
      title: 'The case of the missing cake topper', company: 'Crumb & Co Bakery',
      detective: {
        name: 'Inspector Basil Crust', title: 'Head of pastry investigations',
        introLine: 'Good morning! I\'m Inspector Crust. The sugar bride and groom for today\'s wedding cake have vanished, and I could use your help.',
        catchphrase: 'Every crumb tells a story.',
        look: { hat: 'toque', accessory: 'magnifier', coatColor: '#E9E1D3', accentColor: '#C0392B', skinTone: '#A86F45', apron: true }
      },
      intro: [
        '6:15 a.m. The ovens are warm, the bread is rising, and the little sugar couple for the Hartley wedding cake is nowhere to be found.',
        'Six of the team saw something this morning. Each will share a clue once you answer their question.',
        intro
      ],
      questions: withExtras([
        { witness: { name: 'Marguerite', role: 'Head baker', initial: 'M', outfit: 'chef' },
          setup: 'Marguerite dusts flour from her hands. "I was first in this morning. Answer me this, and I\'ll tell you what I saw."',
          clue: 'The proofing cupboard door was left open, and there is a trail of icing sugar on the floor.', detectiveNote: 'Icing sugar, not flour. Someone from the decorating table.' },
        { witness: { name: 'Theo', role: 'Bread oven lead', initial: 'T', outfit: 'chef' },
          setup: 'Theo slides a tray of loaves out of the oven. "Quick question while these cool."',
          clue: 'At 5:50 a.m. Theo heard the walk-in fridge door close twice.', detectiveNote: 'Twice. Someone went in and came back out.' },
        { witness: { name: 'Priya', role: 'Cake decorator', initial: 'P', outfit: 'apron' },
          setup: 'Priya sets down a piping bag. "I\'ll help, but I\'d love your view on something first."',
          clue: 'Priya\'s spare box of sugar flowers has moved to the top shelf of the fridge.', detectiveNote: 'The top shelf. Only someone tall reaches that easily.' },
        { witness: { name: 'Jonah', role: 'Server at the front counter', initial: 'J', outfit: 'server' },
          setup: 'Jonah straightens the bread baskets. "Before the doors open, can I ask you one thing?"',
          clue: 'A small white box with a ribbon is tucked under the counter, labelled "Not yet!"', detectiveNote: 'A box marked "Not yet". Now that is interesting.' },
        { witness: { name: 'Ada', role: 'Delivery driver', initial: 'A', outfit: 'casual' },
          setup: 'Ada jingles the van keys. "I\'m off on the first run soon. Here\'s my question."',
          clue: 'The wedding delivery is booked for noon, not nine as written on the board.', detectiveNote: 'Noon. So there was never a rush this morning.' },
        { witness: { name: 'Felix', role: 'Pastry chef', initial: 'F', outfit: 'chef' },
          setup: 'Felix folds a sheet of croissant dough. "Last question, then the case is yours."',
          clue: 'Felix saw Priya slip out at 5:45 with a tiny paintbrush and edible gold paint.', detectiveNote: 'Gold paint. The last piece of the puzzle.' }
      ]),
      ending: 'Case closed! Priya took the sugar couple to add a gold-leaf surprise and hid them in the "Not yet!" box. Thank you. What you shared helps the team decide what to bake and improve next.'
    },

    rpg: {
      id: 'crumb-co-rpg-bakery', setting: 'bakery', title: 'A morning at Crumb & Co', company: 'Crumb & Co Bakery',
      hero: {
        name: 'Hazel Larkspur',
        introLine: 'Morning! I\'m Hazel, the apprentice baker. Walk with me through the bakery, from the first oven to the front window.',
        look: { outfitColor: '#F1E6D2', accentColor: '#C0392B', skinTone: '#E8B48C', headgear: 'toque', item: 'rolling-pin', apron: true }
      },
      world: { name: 'The Morning Bake', palette: 'autumn', destination: { name: 'The Front Window', kind: 'counter' } },
      intro: [
        'The bakery wakes before the town does. Ovens roar, dough rises, and the window waits to be filled.',
        'Six of the team are busy at their stations. Each will hand you something for your apron pocket after one question.',
        intro
      ],
      questions,
      stops: [
        { questionId: 'q1', place: 'The Brick Oven', kind: 'oven', inhabitant: { name: 'Theo', role: 'Bread oven lead', outfit: 'chef' },
          line: 'Mind the heat! I\'ll swap you a fresh roll for a quick answer.', item: { name: 'Warm croissant', icon: 'croissant' }, guideNote: 'Still warm. Theo always saves the best batch for visitors.' },
        { questionId: 'q2', place: 'The Mixing Bench', kind: 'mixing-bench', inhabitant: { name: 'Marguerite', role: 'Head baker', outfit: 'chef' },
          line: 'Dough waits for no one, but I\'ll make time for you. Take this whisk.', item: { name: 'Balloon whisk', icon: 'whisk' }, guideNote: 'Marguerite has used that whisk for twenty years.' },
        { questionId: 'q3', place: 'The Decorating Table', kind: 'cake-stand', inhabitant: { name: 'Priya', role: 'Cake decorator', outfit: 'apron' },
          line: 'Careful near the wedding cake! Here, a spare piping bag for you.', item: { name: 'Piping bag', icon: 'piping-bag' }, guideNote: 'Next stop is the busiest place in the building.' },
        { questionId: 'q4', place: 'The Front Counter', kind: 'counter', inhabitant: { name: 'Jonah', role: 'Server at the front counter', outfit: 'server' },
          line: 'The queue starts in ten minutes. One question, and a cupcake for the road.', item: { name: 'Strawberry cupcake', icon: 'cupcake' }, guideNote: 'Jonah knows every regular by name.' },
        { questionId: 'q5', place: 'The Pantry', kind: 'pantry', inhabitant: { name: 'Felix', role: 'Pastry chef', outfit: 'chef' },
          line: 'I\'m looking for new ideas back here. Take the pantry key while you think.', item: { name: 'Pantry key', icon: 'key' }, guideNote: 'Felix tests a new recipe every Friday.' },
        { questionId: 'q6', place: 'The Café Corner', kind: 'cafe-table', inhabitant: { name: 'Rosa', role: 'Regular customer', outfit: 'casual' },
          line: 'I\'ve been coming here for years, dear. Here, have my lucky bell.', item: { name: 'Shop door bell', icon: 'bell' }, guideNote: 'Only the front window left. Let\'s go!' }
      ],
      ending: 'We made it to the front window just as the first loaves go out. Thank you for walking the bakery with me. What you shared helps the team decide what to bake and improve next.'
    },

    quiz: {
      id: 'crumb-co-quiz-bakery', setting: 'bakery', title: 'Fresh From the Oven', company: 'Crumb & Co Bakery',
      host: {
        name: 'Dolly Buttercup', catchphrase: 'Let\'s get baking!',
        introLine: 'Hello, bakers, and welcome to the tent! I\'m Dolly Buttercup, and tonight every answer earns the same points.',
        look: { suitColor: '#E85D75', accentColor: '#FFF3E0', skinTone: '#C68E63', hair: 'bun', accessory: 'whisk', apron: true }
      },
      show: { name: 'The Great Crumb Bake-Off', palette: 'sunset' },
      intro: [
        'Six quick rounds about Crumb & Co. Every answer earns the same points.',
        intro
      ],
      questions: withExtras([
        { roundTitle: 'Regulars Round', hostLine: 'First up, let\'s hear how often you pop in for a treat.' },
        { roundTitle: 'The Bread Basket', hostLine: 'Round two takes us to the bread shelves.' },
        { roundTitle: 'Cake Corner', hostLine: 'Now for the display case, and all those cakes.' },
        { roundTitle: 'Counter Service', hostLine: 'This round is all about the front counter.' },
        { roundTitle: 'Recipe Box', hostLine: 'Time to dream up a new bake. Over to you!' },
        { roundTitle: 'Showstopper', hostLine: 'Our final round. Would you tell a friend?' }
      ]),
      ending: 'That\'s a wrap from the bake-off tent! Thank you for playing along. Your answers help Crumb & Co decide what to bake next.'
    },

    platformer: {
      id: 'crumb-co-run-bakery', setting: 'bakery', title: 'Rolling Pin Rush', company: 'Crumb & Co Bakery',
      runner: {
        name: 'Pip',
        introLine: 'Hi, I\'m Pip! Let\'s dash across the bakery counters. Six checkpoints, one quick question at each.',
        look: { bodyColor: '#F1E6D2', accentColor: '#E85D75', skinTone: '#8D5A3B', headgear: 'toque', apron: true }
      },
      level: { name: 'Counter Dash', theme: 'candy', palette: 'day' },
      intro: [
        'Hop along the counters and baking trays, and stop at each checkpoint to answer a question.',
        'There are no lives and no timer. You can skip the running at any time. There are no right or wrong answers.'
      ],
      questions: withExtras([
        { checkpointName: 'Bread Shelves', cheerLine: 'The bread shelves! Smell that sourdough.' },
        { checkpointName: 'Brick Oven', cheerLine: 'The brick oven is roaring. Mind your toque!' },
        { checkpointName: 'Cake Stand', cheerLine: 'Three tiers and a cherry on top. Wow.' },
        { checkpointName: 'Display Case', cheerLine: 'Cupcakes in every colour behind the glass.' },
        { checkpointName: 'Flour Sacks', cheerLine: 'Flour everywhere! Two more counters to go.' },
        { checkpointName: 'Front Door', cheerLine: 'The front door bell. The finish is just ahead.' }
      ]),
      ending: 'We made it across the bakery! Thanks for running with me. Your answers help Crumb & Co decide what to bake next.'
    }
  };
})(window.QP = window.QP || {});
