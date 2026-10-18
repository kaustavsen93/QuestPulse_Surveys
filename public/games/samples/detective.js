/* Sample detective config: employee engagement. Same shape Gemini returns. */
(window.QP = window.QP || {}).samples = Object.assign(window.QP.samples || {}, {
  detective: {
    id: "northwind-q4-engagement",
    caseNumber: "Case No. 0417",
    title: "The vanishing coffee machine",
    company: "Northwind Office",
    detective: {
      name: "Inspector Juniper Vale",
      title: "Northwind's least official detective",
      introLine: "Good morning. I'm Inspector Vale, and I've never met a mystery I couldn't solve with a little help. Today, that help is you.",
      catchphrase: "Every answer is a clue.",
      look: { hat: "fedora", coatColor: "#6B4F3A", accentColor: "#B3261E", skinTone: "#C68E63", accessory: "magnifier" }
    },
    intro: [
      "Monday, 9:02 a.m. The third-floor coffee machine is gone.",
      "Six people saw something this morning. Each one will share a clue, but only after you answer their question.",
      "Your answers are anonymous. There are no right or wrong answers."
    ],
    questions: [
      { id: "q1", type: "rating", scale: 5, labels: ["Very dissatisfied", "Very satisfied"],
        witness: { name: "Rosa", role: "Receptionist", initial: "R" },
        setup: "Rosa closes the visitor log. \"I'll tell you what I saw. First, a question for you.\"",
        prompt: "Overall, how satisfied are you working here?",
        clue: "The visitor log shows an entry at 8:41 a.m. The signature is smudged.",
        detectiveNote: "A smudged signature. Someone was in a hurry." },
      { id: "q2", type: "choice", options: ["Rarely", "Once or twice a week", "Most days", "Every day"],
        witness: { name: "Dev", role: "Early-shift engineer", initial: "D" },
        setup: "Dev looks up from his screen. \"I was here at six. Before I go on, let me ask you something.\"",
        prompt: "In a typical week, how often do you feel your workload is too heavy?",
        clue: "Wheel marks on the carpet lead toward the service lift.",
        detectiveNote: "Wheels, not footprints. Something heavy was moved." },
      { id: "q3", type: "choice", options: ["Yes, regularly", "Sometimes", "Rarely", "Never"],
        witness: { name: "Mei", role: "Team lead", initial: "M" },
        setup: "Mei pauses by the window. \"Something's been on my mind. Can I ask you first?\"",
        prompt: "Do you feel your work is recognised?",
        clue: "A sticky note on her desk: \"Room 3B. Keep it quiet until Friday.\"",
        detectiveNote: "Quiet until Friday. That sounds like a surprise, not a theft." },
      { id: "q4", type: "choice", options: ["Workload", "Communication", "Growth opportunities", "Workspace and facilities"],
        witness: { name: "Camera 2", role: "Corridor security footage", initial: "C2" },
        setup: "The footage is paused. A note on the monitor asks every viewer one question.",
        prompt: "Which area most needs improvement?",
        clue: "7:55 a.m. Two people carry a large box past the lifts.",
        detectiveNote: "Two people, one big box, and nobody hiding their faces." },
      { id: "q5", type: "text", optional: true,
        witness: { name: "Anonymous tip", role: "Note left under your door", initial: "?" },
        setup: "The note says: \"I'll tell you where to look. Tell me one thing in return.\"",
        prompt: "What one change would most improve your workday?",
        clue: "A delivery receipt for break-room furniture, signed for Room 3B.",
        detectiveNote: "Break-room furniture. The pieces are fitting together." },
      { id: "q6", type: "nps", labels: ["Not at all likely", "Extremely likely"],
        witness: { name: "Arjun", role: "Facilities manager", initial: "A" },
        setup: "Arjun holds up a key. \"Last question, and then it's yours.\"",
        prompt: "How likely are you to recommend Northwind as a place to work?",
        clue: "The key to Room 3B.",
        detectiveNote: "A key. Let's open Room 3B." }
    ],
    ending: "Nobody stole the coffee machine. Facilities moved it to the new break room in 3B, which was built from last quarter's survey answers. What you shared today decides what gets built next."
  }
});
