/* Preview samples for every business setting (and the village) except bakery (hand-written in samples/bakery.js).
   Each setting is a small kit; build() turns it into all four game configs. Open any game with ?sample=<setting>. */
(function (QP) {
  const ANON = 'Your answers are anonymous. There are no right or wrong answers.';
  const VISITS = ['Several times a week', 'About once a week', 'A few times a month', 'Rarely', 'This is my first visit'];

  /* people: [name, role, outfit]; stops: [kind, place, item, icon]; q: four prompts, either a string or [prompt, labels or options] */
  const KITS = {
    cafe: {
      company: 'Bean There Café', missing: 'the golden milk jug', world: 'The Morning Rush', show: 'The Daily Grind Show', level: 'Latte Leap',
      leads: ['Inspector Mocha Reyes', 'Sol Brightcup', 'Remy Roast', 'Kit'], apron: true,
      q: ['How often do you visit Bean There Café?', 'How would you rate the taste of our coffee?', 'How satisfied are you with our food menu?', 'How would you rate the service at the counter?'],
      topics: ['visits', 'coffee', 'food', 'service'], rounds: ['Regulars Round', 'Bean Counter', 'Snack Attack', 'Service Stars', 'Idea Brew', 'Last Sip'],
      people: [['Marisol', 'Head barista', 'apron'], ['Dev', 'Café manager', 'uniform'], ['Lena', 'Cook', 'chef'], ['Tomás', 'Table server', 'server'], ['Ivy', 'Barista', 'apron'], ['Walt', 'Regular customer', 'casual']],
      stops: [['coffee-machine', 'The Espresso Bar', 'Fresh espresso', 'coffee'], ['counter', 'The Order Counter', 'Shop door bell', 'bell'], ['cake-stand', 'The Pastry Dome', 'Almond croissant', 'croissant'],
        ['cafe-table', 'The Window Table', 'Cosy book', 'book'], ['pantry', 'The Bean Store', 'Pantry key', 'key'], ['sofa', 'The Comfy Corner', 'Recipe card', 'scroll']],
      destination: ['The Terrace', 'bookshelf']
    },
    restaurant: {
      company: 'Luigi\'s Trattoria', missing: 'the famous pasta recipe card', world: 'Dinner Service', show: 'Table for Two Tonight', level: 'Kitchen Dash',
      leads: ['Inspector Basil Fontana', 'Gio Marchetti', 'Valentina Vee', 'Pepper'], apron: true, toque: true,
      q: ['How often do you dine at Luigi\'s Trattoria?', 'How would you rate the quality of your meal?', 'How satisfied are you with our menu choices?', 'How would you rate the service at your table?'],
      topics: ['visits', 'your meal', 'the menu', 'table service'], rounds: ['Reservations', 'Main Course', 'Menu Mix', 'Service Please', 'Chef\'s Special', 'Dessert Round'],
      people: [['Chiara', 'Host at the door', 'suit'], ['Marco', 'Head chef', 'chef'], ['Bea', 'Waiter', 'server'], ['Ravi', 'Line cook', 'chef'], ['Otto', 'Kitchen porter', 'apron'], ['Nell', 'Regular diner', 'casual']],
      stops: [['host-stand', 'The Host Stand', 'Table menu', 'scroll'], ['dining-table', 'Table Seven', 'Warm bread plate', 'plate'], ['kitchen-pass', 'The Kitchen Pass', 'Order bell', 'bell'],
        ['stove', 'The Big Stove', 'Chef\'s whisk', 'whisk'], ['pantry', 'The Herb Pantry', 'Pantry key', 'key'], ['cafe-table', 'The Patio', 'Mint sprig', 'seed']],
      destination: ['The Chef\'s Table', 'dining-table']
    },
    retail: {
      company: 'Sharma General Store', missing: 'the shop\'s old brass weighing scale', world: 'Market Day', show: 'Kirana Quiz Night', level: 'Aisle Dash',
      leads: ['Inspector Meera Joshi', 'Pinky Sharma', 'Bunty Kapoor', 'Chotu'], apron: true,
      q: ['How often do you shop at Sharma General Store?', 'How would you rate the freshness of our fruit and vegetables?', 'How satisfied are you with the range of products we stock?', 'How would you rate the billing at the counter?'],
      topics: ['shopping trips', 'freshness', 'our range', 'billing'], rounds: ['Shopping List', 'Fresh Check', 'Full Shelves', 'Quick Billing', 'Your Wish List', 'Last Item'],
      people: [['Ramesh', 'Shopkeeper', 'apron'], ['Priya', 'Cashier', 'uniform'], ['Arif', 'Stock handler', 'apron'], ['Sunil', 'Delivery rider', 'casual'], ['Anita', 'Store manager', 'suit'], ['Mrs. Iyer', 'Regular shopper', 'casual']],
      stops: [['shop-window', 'The Shop Front', 'Cloth shopping bag', 'shopping-bag'], ['shop-shelf', 'The Rice and Dal Aisle', 'Price tag', 'price-tag'], ['fridge', 'The Cold Drinks Fridge', 'Cold water bottle', 'water-bottle'],
        ['fruit-crates', 'The Fruit Corner', 'Red apple', 'apple'], ['product-shelf', 'The Snacks Shelf', 'Store room key', 'key'], ['checkout', 'The Billing Counter', 'Counter bell', 'bell']],
      destination: ['The Stock Room', 'shop-shelf']
    },
    petshop: {
      company: 'Happy Paws Pet Shop', missing: 'the shop\'s lucky goldfish bowl', world: 'Feeding Time', show: 'Paws and Claws Live', level: 'Paw Print Dash',
      leads: ['Inspector Rani Whiskers', 'Kabir Fetch', 'Tara Purr', 'Bolt'], apron: true,
      q: ['How often do you visit Happy Paws Pet Shop?', 'How would you rate the quality of our pet food?', 'How satisfied are you with our grooming service?', 'How would you rate the advice from our staff?'],
      topics: ['visits', 'pet food', 'grooming', 'advice'], rounds: ['Paw Prints', 'Food Bowl', 'Groom Room', 'Expert Advice', 'Wish List', 'Last Treat'],
      people: [['Neha', 'Shop owner', 'apron'], ['Vikram', 'Pet groomer', 'apron'], ['Isha', 'Cashier', 'uniform'], ['Rohan', 'Aquarium keeper', 'casual'], ['Dr. Menon', 'Visiting vet', 'scrubs'], ['Asha', 'Dog owner', 'casual']],
      stops: [['aquarium', 'The Fish Tanks', 'Fish food tin', 'seed'], ['pet-food-shelf', 'The Food Shelves', 'Bag of treats', 'shopping-bag'], ['grooming-table', 'The Grooming Table', 'Soft brush', 'comb'],
        ['bird-cage', 'The Bird Corner', 'Little bell', 'bell'], ['pet-bed', 'The Cosy Corner', 'Warm blanket', 'towel'], ['checkout', 'The Billing Counter', 'Lead and collar', 'rope']],
      destination: ['The Play Area', 'pet-bed']
    },
    fashion: {
      company: 'Threadline Boutique', missing: 'the shop\'s lucky price gun', world: 'Saturday Shopping', show: 'Style Showdown', level: 'Aisle Hop',
      leads: ['Inspector Ada Hemline', 'Tess Tailor', 'Jasper Glam', 'Zip'],
      q: ['How often do you shop at Threadline?', 'How would you rate the quality of our clothes?', 'How satisfied are you with our range of sizes?', 'How would you rate the help from our staff?'],
      topics: ['shopping trips', 'quality', 'sizes', 'our staff'], rounds: ['Shop Talk', 'Quality Check', 'Size It Up', 'Helping Hands', 'Wish List', 'Final Fitting'],
      people: [['Jo', 'Sales assistant', 'uniform'], ['Amara', 'Store manager', 'suit'], ['Finn', 'Cashier', 'uniform'], ['Rosa', 'Stock handler', 'apron'], ['Kai', 'Visual merchandiser', 'casual'], ['Mei', 'Regular shopper', 'casual']],
      stops: [['shop-window', 'The Shop Window', 'Price tag', 'price-tag'], ['clothes-rack', 'The New Arrivals Rail', 'Silk ribbon', 'feather'], ['fitting-room', 'The Fitting Rooms', 'Mirror token', 'gem'],
        ['shop-shelf', 'The Shoe Shelves', 'Walking boots', 'boots'], ['product-shelf', 'The Accessories Wall', 'Gift bag', 'shopping-bag'], ['checkout', 'The Checkout', 'Shop bell', 'bell']],
      destination: ['The Stock Room', 'shop-shelf']
    },
    salon: {
      company: 'Glow Hair Studio', missing: 'the silver styling scissors', world: 'Appointment Day', show: 'Blow-Dry Bonanza', level: 'Salon Sprint',
      leads: ['Inspector Coco Curl', 'Bree Bloom', 'Dante Shine', 'Flick'], apron: true,
      q: ['How often do you visit Glow Hair Studio?', 'How would you rate the result of your last visit?', 'How satisfied are you with our range of treatments?', 'How would you rate the welcome from our team?'],
      topics: ['visits', 'your results', 'treatments', 'our team'], rounds: ['Booking In', 'The Big Reveal', 'Treatment Time', 'Team Talk', 'Fresh Ideas', 'Final Flourish'],
      people: [['Nadia', 'Senior stylist', 'apron'], ['Leo', 'Colourist', 'apron'], ['Pip', 'Receptionist', 'uniform'], ['Sam', 'Barber', 'apron'], ['Grace', 'Salon owner', 'suit'], ['Hal', 'Regular client', 'casual']],
      stops: [['reception-desk', 'The Front Desk', 'Appointment card', 'scroll'], ['sofa', 'The Waiting Lounge', 'Warm towel', 'towel'], ['wash-basin', 'The Wash Basins', 'Wide-tooth comb', 'comb'],
        ['salon-chair', 'Chair Number Two', 'Styling scissors', 'scissors'], ['mirror-station', 'The Mirror Wall', 'Little mirror', 'gem'], ['product-shelf', 'The Product Shelf', 'Gift bag', 'shopping-bag']],
      destination: ['The Styling Floor', 'salon-chair']
    },
    gym: {
      company: 'PulseFit Gym', missing: 'the class timetable whistle', world: 'Morning Workout', show: 'Fit Factor Live', level: 'Rep Run',
      leads: ['Inspector Max Stamina', 'Coach Rio', 'Tina Tempo', 'Dash'],
      q: ['How often do you train at PulseFit?', 'How would you rate the condition of our equipment?', 'How satisfied are you with our class timetable?', 'How would you rate the help from our trainers?'],
      topics: ['training', 'equipment', 'classes', 'trainers'], rounds: ['Warm-Up', 'Kit Check', 'Class Act', 'Coach Corner', 'Next Level', 'Cool-Down'],
      people: [['Jade', 'Front desk', 'uniform'], ['Marcus', 'Personal trainer', 'sporty'], ['Suki', 'Yoga instructor', 'sporty'], ['Ollie', 'Spin class instructor', 'sporty'], ['Bev', 'Gym manager', 'suit'], ['Ty', 'Member', 'sporty']],
      stops: [['reception-desk', 'The Front Desk', 'Gym towel', 'towel'], ['lockers', 'The Locker Room', 'Locker key', 'key'], ['treadmill', 'The Cardio Zone', 'Water bottle', 'water-bottle'],
        ['weights-rack', 'The Weights Rack', 'Small dumbbell', 'dumbbell'], ['yoga-mat', 'The Studio', 'Stretch band', 'rope'], ['water-cooler', 'The Water Station', 'Class timetable', 'clipboard']],
      destination: ['The Rooftop Studio', 'yoga-mat']
    },
    clinic: {
      company: 'Brightsmile Dental', missing: 'the smiley-face wall clock', world: 'Check-up Day', show: 'The Smile Show', level: 'Clinic Quest',
      leads: ['Inspector Ivy Pearl', 'Noor Kindly', 'Frankie Floss', 'Beam'],
      q: [['How often do you visit Brightsmile Dental?', ['Every few months', 'About once a year', 'Less than once a year', 'This is my first visit']],
        'How would you rate the care you received?', 'How satisfied are you with appointment availability?', 'How would you rate our reception team?'],
      topics: ['visits', 'your care', 'appointments', 'reception'], rounds: ['Check-In', 'Care Count', 'Booking Bonus', 'Front Desk', 'Bright Ideas', 'Big Smile'],
      people: [['Maya', 'Receptionist', 'uniform'], ['Dr. Okafor', 'Dentist', 'scrubs'], ['Liam', 'Dental nurse', 'scrubs'], ['Hana', 'Hygienist', 'scrubs'], ['Rob', 'Practice manager', 'suit'], ['Edie', 'Patient', 'casual']],
      stops: [['reception-desk', 'The Front Desk', 'Appointment card', 'clipboard'], ['waiting-chairs', 'The Waiting Area', 'Picture book', 'book'], ['water-cooler', 'The Water Cooler', 'Water bottle', 'water-bottle'],
        ['consult-room', 'Treatment Room One', 'Spare toothbrush', 'feather'], ['product-shelf', 'The Care Shelf', 'Mint seeds', 'seed'], ['sofa', 'The Quiet Corner', 'Reminder card', 'scroll']],
      destination: ['The Exit Desk', 'reception-desk']
    },
    hotel: {
      company: 'Harbour View Hotel', missing: 'the brass key to room 101', world: 'Check-in Day', show: 'Room Service Rally', level: 'Lobby Leap',
      leads: ['Inspector Clara Keys', 'Monty Bellhop', 'Ruby Suite', 'Hop'],
      q: [['How many times have you stayed with us?', ['This is my first stay', '2 to 3 times', '4 or more times']],
        'How would you rate the comfort of your room?', 'How satisfied are you with breakfast?', 'How would you rate your check-in?'],
      topics: ['your stays', 'your room', 'breakfast', 'check-in'], rounds: ['Welcome Desk', 'Room Ready', 'Breakfast Bell', 'Check-In Check', 'Guest Ideas', 'Farewell Round'],
      people: [['Elena', 'Receptionist', 'suit'], ['Gus', 'Porter', 'uniform'], ['Ana', 'Housekeeper', 'uniform'], ['Felix', 'Concierge', 'suit'], ['Rui', 'Breakfast chef', 'chef'], ['Mr. Patel', 'Guest', 'casual']],
      stops: [['reception-desk', 'The Front Desk', 'Room key', 'key'], ['luggage-cart', 'The Luggage Cart', 'Travel tag', 'price-tag'], ['lift', 'The Lift', 'Floor map', 'map'],
        ['guest-room', 'Room 214', 'Fluffy towel', 'towel'], ['dining-table', 'The Breakfast Room', 'Warm croissant', 'croissant'], ['sofa', 'The Lounge', 'Postcard', 'scroll']],
      destination: ['The Rooftop Terrace', 'dining-table']
    },
    office: {
      company: 'Ledgerly HQ', missing: 'the team\'s lucky stapler', world: 'A Day at HQ', show: 'Team Time Live', level: 'Desk Dash',
      leads: ['Inspector Juno Memo', 'Remi Desk', 'Avery Agenda', 'Byte'],
      q: [['How many days a week do you work from the office?', ['5 days', '3 to 4 days', '1 to 2 days', 'Less than once a week']],
        'How would you rate the office as a place to focus?', 'How satisfied are you with our meeting rooms?',
        ['How supported do you feel by your manager?', ['Not at all supported', 'Fully supported']]],
      text: 'What one change would make your workday better?', nps: 'How likely are you to recommend Ledgerly as a place to work?',
      topics: ['office days', 'focus', 'meeting rooms', 'support'], rounds: ['Commute Quiz', 'Focus Mode', 'Room to Meet', 'Team Support', 'Big Ideas', 'Workplace Wrap'],
      people: [['Rae', 'Receptionist', 'uniform'], ['Omar', 'Team lead', 'suit'], ['Priya', 'Engineer', 'casual'], ['Chen', 'Office manager', 'suit'], ['Lou', 'Analyst', 'casual'], ['Sam', 'New starter', 'casual']],
      stops: [['reception-desk', 'Reception', 'Visitor badge', 'price-tag'], ['office-desk', 'The Quiet Desks', 'Fresh notebook', 'book'], ['meeting-table', 'Meeting Room B', 'Spare laptop', 'laptop'],
        ['whiteboard', 'The Ideas Wall', 'Marker pen', 'pencil'], ['water-cooler', 'The Water Cooler', 'Coffee mug', 'coffee'], ['bookshelf', 'The Library Nook', 'Team handbook', 'clipboard']],
      destination: ['The Rooftop Lift', 'lift']
    },
    school: {
      company: 'Oakfield Primary School', missing: 'the class hamster\'s golden bell', world: 'School Open Day', show: 'The Big School Quiz', level: 'Hallway Hop',
      leads: ['Inspector Pip Chalk', 'Ms. Wren Reader', 'Mr. Quizzle', 'Scout'],
      q: [['How often do you visit the school?', ['Every day', 'A few times a week', 'A few times a term', 'Rarely']],
        'How would you rate communication from the school?', 'How satisfied are you with after-school clubs?',
        ['How welcome do you feel at school events?', ['Not at all welcome', 'Very welcome']]],
      text: 'What one thing would you like the school to try?', nps: 'How likely are you to recommend Oakfield Primary to another family?',
      topics: ['visits', 'communication', 'clubs', 'school events'], rounds: ['Register Round', 'Message Board', 'Club Corner', 'Event Night', 'Big Ideas', 'Home Time'],
      people: [['Mrs. Adeyemi', 'Class teacher', 'casual'], ['Mr. Hale', 'Head teacher', 'suit'], ['Ms. Lin', 'Librarian', 'casual'], ['Bert', 'Caretaker', 'uniform'], ['Zara', 'Year 6 pupil', 'casual'], ['Mr. Costa', 'Parent volunteer', 'casual']],
      stops: [['classroom-desk', 'Class 4B', 'Sharp pencil', 'pencil'], ['blackboard', 'The Blackboard', 'Chalk star', 'gem'], ['bookshelf', 'The Library', 'Story book', 'book'],
        ['lockers', 'The Cloakroom', 'Lost-and-found key', 'key'], ['dining-table', 'The Lunch Hall', 'Shiny apple', 'apple'], ['whiteboard', 'The Art Room', 'Paintbrush', 'feather']],
      destination: ['The Playground', 'whiteboard']
    },
    // A business no hand-drawn setting covers: its scenery is a description, written here the way the AI writes it.
    custom: {
      company: 'Janata Bank, Lakeview Branch', missing: 'the branch\'s brass token bell', world: 'Branch Opening Hours', show: 'Bank On It', level: 'Branch Dash',
      leads: ['Inspector Anil Desai', 'Meena Rao', 'Vicky Saxena', 'Zippy'],
      q: ['How often do you visit our Lakeview branch?', ['How would you rate the time you waited to be served?', ['Very poor', 'Excellent']], 'How satisfied are you with the help at the enquiry desk?', 'How would you rate how clearly our staff explained things?'],
      topics: ['visits', 'waiting time', 'the enquiry desk', 'explanations'], rounds: ['Token Please', 'Waiting Game', 'Enquiry Desk', 'Clear Answers', 'Your Ideas', 'Last Round'],
      people: [['Kavya', 'Enquiry desk officer', 'uniform'], ['Mr. Bose', 'Cashier', 'suit'], ['Fatima', 'Loans officer', 'suit'], ['Rahul', 'Security guard', 'uniform'], ['Mrs. Nair', 'Branch manager', 'suit'], ['Deepak', 'Account holder', 'casual']],
      stops: [['reception-desk', 'The Enquiry Desk', 'Token slip', 'scroll'], ['waiting-chairs', 'The Waiting Area', 'Passbook', 'book'], ['counter', 'Cash Counter Two', 'Counter bell', 'bell'],
        ['office-desk', 'The Loans Desk', 'Signing pen', 'pencil'], ['water-cooler', 'The Water Cooler', 'Water bottle', 'water-bottle'], ['lift', 'The Locker Room', 'Locker key', 'key']],
      destination: ['The Manager\'s Cabin', 'office-desk'],
      scenery: {
        palette: 'office', floor: 'tiles', wallStripes: true, lamps: true,
        columns: [{ wall: 'city-window', floor: 'waiting-chairs' }, { wall: 'clock', floor: 'prop:atm' }, { wall: 'prop:token-display', floor: 'reception-desk' }, { wall: 'noticeboard', floor: 'desk' }, { wall: 'picture', floor: 'filing-cabinet' }],
        props: [
          { id: 'atm', zone: 'floor', w: 60, h: 100, shapes: [
            { t: 'rect', x: 0, y: 8, w: 60, h: 90, rx: 4, fill: 'grey' }, { t: 'rect', x: 0, y: 0, w: 60, h: 16, rx: 3, fill: 'blue' },
            { t: 'rect', x: 10, y: 24, w: 40, h: 26, rx: 2, fill: 'glass' }, { t: 'path', d: 'M16 32h28M16 40h18', fill: 'none', outline: 'thin' },
            { t: 'rect', x: 14, y: 56, w: 22, h: 18, rx: 2, fill: 'light-grey' },
            { t: 'circle', cx: 19, cy: 61, r: 1.6, fill: 'dark-grey', outline: 'none' }, { t: 'circle', cx: 25, cy: 61, r: 1.6, fill: 'dark-grey', outline: 'none' }, { t: 'circle', cx: 31, cy: 61, r: 1.6, fill: 'dark-grey', outline: 'none' },
            { t: 'circle', cx: 19, cy: 68, r: 1.6, fill: 'dark-grey', outline: 'none' }, { t: 'circle', cx: 25, cy: 68, r: 1.6, fill: 'dark-grey', outline: 'none' }, { t: 'circle', cx: 31, cy: 68, r: 1.6, fill: 'dark-grey', outline: 'none' },
            { t: 'rect', x: 40, y: 58, w: 10, h: 4, fill: 'dark-grey' }, { t: 'rect', x: 12, y: 82, w: 36, h: 5, rx: 1, fill: 'dark-grey' }] },
          { id: 'token-display', zone: 'wall', w: 100, h: 44, shapes: [
            { t: 'rect', x: 0, y: 0, w: 100, h: 44, rx: 4, fill: 'dark-grey' }, { t: 'rect', x: 6, y: 6, w: 88, h: 32, rx: 2, fill: 'ink', outline: 'none' },
            { t: 'path', d: 'M14 18h12v-5l9 9-9 9v-5h-12z', fill: 'yellow', outline: 'none' },
            { t: 'rect', x: 46, y: 13, w: 12, h: 18, rx: 3, fill: 'red', outline: 'none' }, { t: 'rect', x: 62, y: 13, w: 12, h: 18, rx: 3, fill: 'red', outline: 'none' }, { t: 'rect', x: 78, y: 13, w: 12, h: 18, rx: 3, fill: 'red', outline: 'none' }] }
        ],
        stopIcons: [{ questionId: 'q6', shapes: [
          { t: 'rect', x: 4, y: 4, w: 36, h: 36, rx: 3, fill: 'grey' }, { t: 'circle', cx: 22, cy: 22, r: 12, fill: 'light-grey' }, { t: 'circle', cx: 22, cy: 22, r: 4, fill: 'dark-grey' },
          { t: 'path', d: 'M22 10v8M22 26v8M10 22h8M26 22h8', fill: 'none' }, { t: 'rect', x: 38, y: 12, w: 4, h: 18, rx: 1, fill: 'dark-grey' }] }],
        label: 'Inside the bank branch: waiting chairs by the window, a cash machine, the enquiry desk under a token display, a loans desk and filing cabinets.',
        labelHi: 'बैंक शाखा के अंदर: खिड़की के पास प्रतीक्षा कुर्सियाँ, एटीएम, टोकन डिस्प्ले के नीचे पूछताछ डेस्क, लोन डेस्क और फ़ाइलों की अलमारी।'
      }
    },
    village: {
      company: 'Sunehra Gram Sangathan', missing: 'the self-help group\'s savings register', world: 'A Day in Sunehra', show: 'Gaon Ki Baat', level: 'Village Path Dash',
      leads: ['Inspector Kavita Rao', 'Sunita Didi', 'Raju Bhaiya', 'Munni'], hat: 'cap',
      run: 'Run along the village path and stop at each checkpoint to answer a question.',
      q: [['How often does your family use the village water point?', ['Every day', 'A few times a week', 'About once a week', 'Rarely', 'Never']],
        'How would you rate the drinking water in your village?', ['How satisfied are you with visits from your ASHA worker?', ['Very dissatisfied', 'Very satisfied']],
        'How would you rate the information you get about government schemes?'],
      text: 'What one change would most help families in your village?', nps: 'How likely are you to recommend the self-help group to a neighbour?',
      topics: ['the water point', 'drinking water', 'health visits', 'scheme information'], rounds: ['Morning Round', 'Water Talk', 'Health Visit', 'Scheme Corner', 'Your Ideas', 'Last Round'],
      people: [['Lakshmi', 'ASHA worker', 'saree'], ['Ramesh', 'Farmer', 'kurta'], ['Geeta', 'Anganwadi worker', 'saree'], ['Mohan', 'Kirana shopkeeper', 'kurta'], ['Savitri', 'Self-help group leader', 'saree'], ['Arjun', 'Schoolteacher', 'kurta']],
      stops: [['well', 'The Village Well', 'Clay matka', 'matka'], ['field', 'The Mustard Field', 'Bundle of wheat', 'wheat'], ['banyan', 'The Banyan Chaupal', 'Meeting register', 'book'],
        ['market', 'The Weekly Haat', 'Seed packet', 'seed'], ['hut', 'Savitri\'s Courtyard', 'Brass bell', 'bell'], ['river', 'The Riverbank', 'Coil of rope', 'rope']],
      destination: ['The Panchayat Bhavan', 'village']
    }
  };

  const COATS = ['#6B4F3A', '#2C3E73', '#3F6B5A', '#7A2E3A', '#4A4E69'];
  const SKINS = ['#C68E63', '#8D5A3B', '#E8B48C', '#A86F45', '#F3D2B3'];
  const SETUPS = ['{name} looks up. "I\'ll tell you what I saw. First, a question for you."', '{name} smiles. "Happy to help. Can I ask you something first?"',
    '{name} pauses. "One quick question, then the clue is yours."'];
  const LINES = ['Welcome! I\'ll swap you this for a quick answer.', 'Hello there! Answer one question and this is yours.', 'Nice to see you. Here, take this for the road after one question.'];
  const NOTES = ['Footprints. Someone was in a hurry.', 'A door, just before opening. Interesting.', 'Ribbon and wrapping paper? This is no ordinary case.',
    'A secret meeting. The plot thickens.', 'A card signed by everyone. I think I see it now.', 'And there it is, the last piece.'];

  function questions(k) {
    const short = k.company.replace(/\s+(Café|Gym|Boutique|Studio|HQ)$/, '');
    const [q1, q2, q3, q4] = k.q.map(q => (Array.isArray(q) ? q : [q]));
    return [
      { id: 'q1', type: 'choice', prompt: q1[0], options: q1[1] || VISITS },
      { id: 'q2', type: 'rating', scale: 5, labels: q2[1] || ['Very poor', 'Excellent'], prompt: q2[0] },
      { id: 'q3', type: 'rating', scale: 5, labels: q3[1] || ['Very dissatisfied', 'Very satisfied'], prompt: q3[0] },
      { id: 'q4', type: 'rating', scale: 5, labels: q4[1] || ['Very poor', 'Excellent'], prompt: q4[0] },
      { id: 'q5', type: 'text', optional: true, prompt: k.text || 'What one thing would you like us to change or add?' },
      { id: 'q6', type: 'nps', labels: ['Not at all likely', 'Extremely likely'], prompt: k.nps || `How likely are you to recommend ${short} to a friend?` }
    ];
  }

  function build(setting, k, i) {
    const configs = buildGames(setting, k, i);
    if (k.scenery) Object.values(configs).forEach(c => { c.scenery = k.scenery; });
    return configs;
  }

  function buildGames(setting, k, i) {
    const qs = questions(k), people = k.people.map(([name, role, outfit]) => ({ name, role, outfit }));
    const stops = k.stops.map(([kind, place, item, icon]) => ({ kind, place, item, icon }));
    const look = { accentColor: '#C9A04A', skinTone: SKINS[i % SKINS.length], apron: Boolean(k.apron) };
    const id = `${setting}-sample`, thanks = `What you shared helps ${k.company} decide what to improve next.`;
    const clues = [`There are fresh footprints leading away from ${stops[0].place}.`, `${people[2].name} heard a cupboard door close just before opening time.`,
      'A ribbon and some wrapping paper are missing from the supply drawer.', `Someone booked ${stops[3].place} for a "secret meeting" at noon.`,
      `A card signed by the whole team is hidden behind ${stops[4].place}.`, `${people[0].name} was seen carrying a box with ${k.missing} inside, smiling.`];
    return {
      detective: {
        id: id + '-detective', setting, caseNumber: `Case No. ${String(2100 + i * 37)}`, title: `The case of ${k.missing}`.slice(0, 50), company: k.company,
        detective: { name: k.leads[0], title: `${k.company}'s friendliest detective`.slice(0, 50), catchphrase: 'Every answer is a clue.',
          introLine: `Good morning! I'm ${k.leads[0]}. Something has gone missing at ${k.company}, and I could use your help.`,
          look: Object.assign({ hat: k.toque ? 'toque' : k.hat || 'fedora', accessory: 'magnifier', coatColor: COATS[i % COATS.length] }, look) },
        intro: [`It is a quiet morning at ${k.company}, until someone notices that ${k.missing} has vanished.`, 'Six people saw something. Each will share a clue once you answer their question.', ANON],
        questions: qs.map((q, j) => Object.assign({}, q, { witness: Object.assign({ initial: people[j].name.replace(/^(Dr|Mr|Mrs|Ms)\.\s*/, '').charAt(0) }, people[j]),
          setup: SETUPS[j % 3].replace('{name}', people[j].name), clue: clues[j], detectiveNote: NOTES[j] })),
        ending: `Case closed! ${people[0].name} borrowed ${k.missing} to polish it for a surprise thank-you party for the team. ${thanks}`
      },
      rpg: {
        id: id + '-rpg', setting, title: `A day at ${k.company}`.slice(0, 50), company: k.company,
        hero: { name: k.leads[1], introLine: `Hello! I'm ${k.leads[1]}. Let me show you around ${k.company}, from ${stops[0].place} to ${k.destination[0]}.`.slice(0, 200),
          look: Object.assign({ outfitColor: COATS[(i + 2) % COATS.length], headgear: k.toque ? 'toque' : 'none', item: 'satchel' }, look) },
        world: { name: k.world, palette: 'meadow', destination: { name: k.destination[0], kind: k.destination[1] } },
        intro: [`Today you get a tour of ${k.company}, one stop at a time.`, 'Six people work along the way. Each will hand you something after one question.', ANON],
        questions: qs,
        stops: stops.map((s, j) => ({ questionId: qs[j].id, place: s.place, kind: s.kind, inhabitant: people[j], line: LINES[j % 3],
          item: { name: s.item, icon: s.icon }, guideNote: j < 5 ? `Next stop: ${stops[j + 1].place}.` : `Only ${k.destination[0]} left. Let's go!` })),
        ending: `We made it to ${k.destination[0]}. Thank you for the tour! ${thanks}`
      },
      quiz: {
        id: id + '-quiz', setting, title: `${k.company} Night`.slice(0, 50), company: k.company,
        host: { name: k.leads[2], catchphrase: 'Every answer counts the same!', introLine: `Welcome to the show! I'm ${k.leads[2]}, and tonight every answer earns the same points.`,
          look: Object.assign({ suitColor: COATS[(i + 1) % COATS.length], hair: ['quiff', 'bob', 'curls', 'bun'][i % 4], accessory: k.toque ? 'whisk' : 'microphone' }, look) },
        show: { name: k.show, palette: ['sunset', 'electric', 'retro', 'mint'][i % 4] },
        intro: [`Six quick rounds about ${k.company}. Every answer earns the same points.`, ANON],
        questions: qs.map((q, j) => Object.assign({}, q, { roundTitle: k.rounds[j],
          hostLine: j < 4 ? `This round is all about ${k.topics[j]}.` : j === 4 ? 'Time for your ideas. Over to you!' : 'Our final round. Would you tell a friend?' })),
        ending: `That's a wrap! Thank you for playing along. ${thanks}`
      },
      platformer: {
        id: id + '-platformer', setting, title: `${k.level}`, company: k.company,
        runner: { name: k.leads[3], introLine: `Hi, I'm ${k.leads[3]}! Let's dash through ${k.company}. Six checkpoints, one quick question at each.`.slice(0, 180),
          look: Object.assign({ bodyColor: COATS[(i + 3) % COATS.length], headgear: k.toque ? 'toque' : 'cap' }, look) },
        level: { name: k.world.slice(0, 30), theme: 'rooftops', palette: i % 3 === 2 ? 'dusk' : 'day' },
        intro: [k.run || 'Run through the building and stop at each checkpoint to answer a question.', 'There are no lives and no timer. You can skip the running at any time. There are no right or wrong answers.'],
        questions: qs.map((q, j) => Object.assign({}, q, { checkpointName: stops[j].place, cheerLine: j < 5 ? `${stops[j].place}! ${5 - j} more to go.` : `${stops[j].place}! The finish is just ahead.` })),
        ending: `We made it through ${k.company}! Thanks for running with me. ${thanks}`
      }
    };
  }

  QP.samples = QP.samples || {};
  Object.entries(KITS).forEach(([setting, kit], i) => { QP.samples[setting] = build(setting, kit, i); });
})(window.QP = window.QP || {});
