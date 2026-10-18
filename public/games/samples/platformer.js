/* Sample platformer config: product feedback. Same shape Gemini returns. */
(window.QP = window.QP || {}).samples = Object.assign(window.QP.samples || {}, {
  platformer: {
    id: "tally-app-feedback-2026",
    title: "Skyline Sprint",
    company: "Tally Budgeting",
    runner: {
      name: "Juno",
      introLine: "Hi, I'm Juno! Six checkpoints stand between us and the finish arch, and each one has a quick question about Tally.",
      look: { bodyColor: "#2F7FC4", accentColor: "#F2B33D", skinTone: "#C68E63", headgear: "beanie" }
    },
    level: { name: "Rooftop Run", theme: "rooftops", palette: "day" },
    intro: [
      "Run across the rooftops and stop at each checkpoint to answer a question.",
      "There are no lives and no timer. If you'd rather not run, press \"Skip the running\" to go straight to the next question. There are no right or wrong answers."
    ],
    questions: [
      { id: "q1", type: "choice", options: ["Every day", "A few times a week", "About once a week", "Less than once a week"],
        checkpointName: "Water Tower", cheerLine: "Checkpoint one, the water tower. The whole city is waking up below.",
        prompt: "How often do you open Tally?" },
      { id: "q2", type: "rating", scale: 5, labels: ["Very difficult", "Very easy"],
        checkpointName: "Neon Sign", cheerLine: "The neon sign flickers on as we pass. Three more roofs to the next one.",
        prompt: "How easy was it to set up your first budget?" },
      { id: "q3", type: "choice", options: ["Spending categories", "Bill reminders", "Savings goals", "Shared budgets", "Monthly reports"],
        checkpointName: "Rooftop Garden", cheerLine: "A rooftop garden, of all things. Someone up here grows tomatoes.",
        prompt: "Which feature do you use most?" },
      { id: "q4", type: "rating", scale: 5, labels: ["Very unreliable", "Very reliable"],
        checkpointName: "Antenna Ridge", cheerLine: "Antenna Ridge. Mind the wires, the signal is strong up here.",
        prompt: "How reliable is syncing between your devices?" },
      { id: "q5", type: "text", optional: true,
        checkpointName: "Skylight Plaza", cheerLine: "Skylight Plaza. Just one checkpoint left before the finish.",
        prompt: "What one feature would you most like us to add?" },
      { id: "q6", type: "nps", labels: ["Not at all likely", "Extremely likely"],
        checkpointName: "Clocktower Ledge", cheerLine: "The clocktower. The finish arch is just across the next gap.",
        prompt: "How likely are you to recommend Tally to a friend?" }
    ],
    ending: "We made it across the skyline! Thanks for running with me. Your answers go to the Tally team to help decide what they build next."
  }
});
