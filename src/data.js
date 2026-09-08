import { cleanPackAccess } from "./pack-access.js";

// Public identities; classes, abilities and numbers are fictional game flavor.
export const SERIES = "001";
export const BUILDERS = [
  {
    name: "Tibo",
    fullName: "Thibault Sottiaux",
    handle: "thsottiaux",
    specialty: "Codex",
    color: "#8de9d3",
    hp: 160,
    attack: "Rate limit reset",
    power: 100,
    text: "Refill the energy bar. One more idea deserves one more run.",
    bio: "Builds Codex and ChatGPT at OpenAI.",
    source: "https://x.com/thsottiaux/with_replies",
  },
  {
    name: "Sam Altman",
    fullName: "Sam Altman",
    handle: "sama",
    specialty: "Vision",
    color: "#eac784",
    hp: 200,
    attack: "Next frontier",
    power: 120,
    text: "Draw a new possibility. The next chapter starts with a question.",
    bio: "Co-founder and CEO of OpenAI.",
    source: "https://openai.com/index/amazon-partnership/",
  },
  {
    name: "Dimillian",
    fullName: "Thomas Ricouard",
    handle: "Dimillian",
    specialty: "Craft",
    color: "#d9aaf4",
    hp: 150,
    attack: "RPG Liftoff",
    power: 90,
    text: "I used to make boat games. Now I make spaceship games.",
    bio: "Developer experience and Codex at OpenAI; builds with Swift and SwiftUI.",
    source: "https://www.dimillian.app/",
  },
  {
    name: "Greg Brockman",
    fullName: "Greg Brockman",
    handle: "gdb",
    specialty: "Systems",
    color: "#8fcef3",
    hp: 190,
    attack: "Scale the stack",
    power: 110,
    text: "Connect the pieces. Give every builder a little more power.",
    bio: "OpenAI co-founder; his projects include the API, Gym, and Codex.",
    source: "https://gregbrockman.com/",
  },
  {
    name: "Noam Brown",
    fullName: "Noam Brown",
    handle: "polynoamial",
    specialty: "Reasoning",
    color: "#f0a794",
    hp: 180,
    attack: "Think one move ahead",
    power: 110,
    text: "Pause the clock. Explore the branch nobody else noticed.",
    bio: "OpenAI research scientist working on reasoning, reinforcement learning, and self-play.",
    source: "https://noambrown.com/",
  },
  {
    name: "Romain Huet",
    fullName: "Romain Huet",
    handle: "romainhuet",
    specialty: "DevEx",
    color: "#a7c5ff",
    hp: 150,
    attack: "Demo day",
    power: 90,
    text: "A spark, a prototype, a launch. Make the next idea playable.",
    bio: "Head of Developer Experience at OpenAI.",
    source: "https://github.com/romainhuet",
  },
  {
    name: "Alex Embiricos",
    fullName: "Alexander Embiricos",
    handle: "embirico",
    specialty: "Agents",
    color: "#f1c49c",
    hp: 160,
    attack: "Parallel play",
    power: 100,
    text: "Send out a squad of tiny helpers. Bring a big idea back.",
    bio: "Works on Codex at OpenAI.",
    source: "https://x.com/embirico/with_replies",
  },
  {
    name: "Nick Turley",
    fullName: "Nick Turley",
    handle: "nickaturley",
    specialty: "Product",
    color: "#94e5e6",
    hp: 170,
    attack: "Start a conversation",
    power: 100,
    text: "Play a question. Unlock a whole new way to begin.",
    bio: "VP and Head of ChatGPT at OpenAI.",
    source:
      "https://openai.com/index/openai-acquires-software-applications-incorporated/",
  },
  {
    name: "Michelle Pokrass",
    fullName: "Michelle Pokrass",
    handle: "michpokrass",
    specialty: "Tuning",
    color: "#c4e59b",
    hp: 170,
    attack: "Fine-tune the magic",
    power: 100,
    text: "Nudge the dials. Turn a promising answer into a great one.",
    bio: "Ships at OpenAI and shares model updates with developers.",
    source: "https://x.com/michpokrass/with_replies",
  },
  {
    "name": "Mark Chen",
    "fullName": "Mark Chen",
    "handle": "markchen90",
    "specialty": "Vision",
    "color": "#80dfdf",
    "hp": 190,
    "attack": "Pattern breakthrough",
    "power": 110,
    "text": "Reveal a hidden pattern. Turn scattered pixels into possibility.",
    "bio": "Chief Research Officer at OpenAI.",
    "source": "https://x.com/markchen90"
  },
  {
    "name": "Jakub Pachocki",
    "fullName": "Jakub Pachocki",
    "handle": "merettm",
    "specialty": "Frontiers",
    "color": "#c7a0ee",
    "hp": 200,
    "attack": "Beyond the horizon",
    "power": 120,
    "text": "Trace a new path through the stars. Reveal the next frontier.",
    "bio": "Chief Scientist at OpenAI.",
    "source": "https://openai.com/index/an-alien-mind/"
  },
  {
    "name": "Wojciech Zaremba",
    "fullName": "Wojciech Zaremba",
    "handle": "woj_zaremba",
    "specialty": "Resilience",
    "color": "#ebbb7f",
    "hp": 180,
    "attack": "Resilient roots",
    "power": 100,
    "text": "Grow a network of support. Every branch makes the whole stronger.",
    "bio": "OpenAI co-founder working on AI resilience at the OpenAI Foundation.",
    "source": "https://x.com/woj_zaremba/with_replies"
  },
  {
    "name": "Peter Welinder",
    "fullName": "Peter Welinder",
    "handle": "npew",
    "specialty": "Devices",
    "color": "#a3d4ec",
    "hp": 160,
    "attack": "Make it tangible",
    "power": 90,
    "text": "Bring an idea off the screen. Give possibility a shape.",
    "bio": "Works on devices at OpenAI.",
    "source": "https://x.com/npew/with_replies"
  },
  {
    "name": "Josh Achiam",
    "fullName": "Josh Achiam",
    "handle": "jachiam0",
    "specialty": "Alignment",
    "color": "#acaeea",
    "hp": 170,
    "attack": "True north",
    "power": 100,
    "text": "Set a course by the brightest star. Keep the whole team on track.",
    "bio": "Works on OpenAI's mission and the future of AI.",
    "source": "https://forum.openai.com/public/videos/event-replay-a-new-chapter-for-openai-mission-momentum-and-the-openai-foundation-2025-10-30"
  },
  {
    "name": "Aidan McLaughlin",
    "fullName": "Aidan McLaughlin",
    "handle": "aidan_mclau",
    "specialty": "Tuning",
    "color": "#e0a4d9",
    "hp": 160,
    "attack": "Reward the spark",
    "power": 90,
    "text": "Tune a tiny signal. Watch a promising idea find its rhythm.",
    "bio": "Works on post-training research at OpenAI.",
    "source": "https://x.com/aidan_mclau/with_replies"
  },
  {
    "name": "Isa Fulford",
    "fullName": "Isa Fulford",
    "handle": "isafulf",
    "specialty": "Discovery",
    "color": "#9edcc0",
    "hp": 170,
    "attack": "Deep discovery",
    "power": 100,
    "text": "Follow the clues. Bring back a page nobody else could find.",
    "bio": "OpenAI researcher who contributed to deep research.",
    "source": "https://openai.com/index/introducing-deep-research/"
  },
  {
    "name": "Steven Heidel",
    "fullName": "Steven Heidel",
    "handle": "stevenheidel",
    "specialty": "API",
    "color": "#91d4f3",
    "hp": 150,
    "attack": "Portal connection",
    "power": 90,
    "text": "Connect two distant worlds. Let a new workflow flow between them.",
    "bio": "Works on the API at OpenAI.",
    "source": "https://x.com/stevenheidel/with_replies"
  },
  {
    "name": "Peter Steinberger",
    "fullName": "Peter Steinberger",
    "handle": "steipete",
    "specialty": "Agents",
    "color": "#efaa91",
    "hp": 180,
    "attack": "Lobster squad",
    "power": 110,
    "text": "Call in your little helpers. One idea, a whole team of claws.",
    "bio": "Builds agents at OpenAI; creator of OpenClaw.",
    "source": "https://github.com/steipete"
  },
  {
    "name": "Vaibhav Srivastav",
    "fullName": "Vaibhav Srivastav",
    "handle": "reach_vb",
    "specialty": "Community",
    "color": "#c9adeb",
    "hp": 150,
    "attack": "Community constellation",
    "power": 90,
    "text": "Bring the builders together. Every new connection adds a star.",
    "bio": "Brings Codex to developers at OpenAI; also known as VB.",
    "source": "https://x.com/reach_vb/with_replies"
  },
  {
    "name": "Dominik Kundel",
    "fullName": "Dominik Kundel",
    "handle": "dkundel",
    "specialty": "DevEx",
    "color": "#a8ddbc",
    "hp": 160,
    "attack": "Toolbox combo",
    "power": 100,
    "text": "Snap the right tools together. Turn a small demo into a big idea.",
    "bio": "Developer experience at OpenAI, including Codex and the Agents SDK.",
    "source": "https://x.com/dkundel/with_replies"
  },
  {
    "name": "Hyung Won Chung",
    "fullName": "Hyung Won Chung",
    "handle": "hwchung27",
    "specialty": "Reasoning",
    "color": "#a6cce9",
    "hp": 180,
    "attack": "Chain reaction",
    "power": 110,
    "text": "One clear step unlocks another. Follow the chain all the way home.",
    "bio": "OpenAI researcher working on reasoning and coding agents.",
    "source": "https://hwchung2.github.io/"
  },
  {
    "name": "David Schnurr",
    "fullName": "David Schnurr",
    "handle": "_dschnurr",
    "specialty": "Engineering",
    "color": "#b6b7ee",
    "hp": 160,
    "attack": "Elegant connection",
    "power": 90,
    "text": "Join the dots with a little code. Make the complicated feel simple.",
    "bio": "Software engineer at OpenAI.",
    "source": "https://dschnurr.com/"
  },
  {
    "name": "Gavin Nelson",
    "fullName": "Gavin Nelson",
    "handle": "Gavmn",
    "specialty": "Design",
    "color": "#f0c298",
    "hp": 150,
    "attack": "Pixel perfect",
    "power": 90,
    "text": "Give every motion a little meaning. Polish the last invisible detail.",
    "bio": "Member of Design Staff at OpenAI.",
    "source": "https://github.com/gavinmn"
  },
  {
    "name": "Shibani Santurkar",
    "fullName": "Shibani Santurkar",
    "handle": "ShibaniSan",
    "specialty": "Robustness",
    "color": "#e3aebd",
    "hp": 180,
    "attack": "Stress-test shield",
    "power": 100,
    "text": "Try the unexpected path. Strengthen the shield with every test.",
    "bio": "OpenAI researcher whose work explores reliable machine learning.",
    "source": "https://x.com/ShibaniSan/with_replies"
  },
  {
    "name": "Sherwin Wu",
    "fullName": "Sherwin Wu",
    "handle": "sherwinwu",
    "specialty": "Platform",
    "color": "#99d9e7",
    "hp": 170,
    "attack": "Platform power",
    "power": 100,
    "text": "Open a portal for the next builder. Great ideas need room to grow.",
    "bio": "Leads developer platform engineering at OpenAI.",
    "source": "https://www.sancus.vc/team/sherwin-wu"
  },
  {
    "name": "Sebastien Bubeck",
    "fullName": "Sebastien Bubeck",
    "handle": "SebastienBubeck",
    "specialty": "Mathematics",
    "color": "#e9c887",
    "hp": 190,
    "attack": "Proof of possibility",
    "power": 120,
    "text": "Find the elegant line. Make an impossible-looking puzzle click.",
    "bio": "AI researcher at OpenAI.",
    "source": "https://x.com/SebastienBubeck/with_replies"
  },
  {
    "name": "Yann Dubois",
    "fullName": "Yann Dubois",
    "handle": "yanndubs",
    "specialty": "Training",
    "color": "#b9df91",
    "hp": 170,
    "attack": "Raise the bar",
    "power": 100,
    "text": "Test, learn, and try again. Move the little needle a little further.",
    "bio": "Works on post-training at OpenAI.",
    "source": "https://github.com/YannDubs"
  },
  {
    "name": "Ari Weinstein",
    "fullName": "Ari Weinstein",
    "handle": "AriX",
    "specialty": "Interfaces",
    "color": "#b5c8f1",
    "hp": 160,
    "attack": "Desktop dance",
    "power": 100,
    "text": "Guide the cursor through a new routine. Make a whole workflow sing.",
    "bio": "Works at OpenAI; co-founded Workflow and Software Applications Incorporated.",
    "source": "https://x.com/AriX/with_replies"
  },
  {
    "name": "Johannes Heidecke",
    "fullName": "Johannes Heidecke",
    "handle": "JoHeidecke",
    "specialty": "Safety",
    "color": "#a2d7d1",
    "hp": 180,
    "attack": "Guardian network",
    "power": 100,
    "text": "Weave a quiet layer of protection. Give every explorer a safer path.",
    "bio": "Works on Safety Systems at OpenAI.",
    "source": "https://x.com/JoHeidecke/with_replies"
  },
  {
    "name": "Andrew Ambrosino",
    "fullName": "Andrew Ambrosino",
    "handle": "ajambrosino",
    "specialty": "Craft",
    "color": "#a9e8d6",
    "hp": 170,
    "attack": "Polish every pixel",
    "power": 100,
    "text": "Turn a promising prototype into a place you want to stay.",
    "bio": "Leads development of the Codex desktop app at OpenAI.",
    "source": "https://www.lennysnewsletter.com/p/openai-codex-lead-on-the-new-shape"
  }
];
export const FINISHES = [
  { name: "Standard", label: "STANDARD", color: "#b8beb0", symbol: "●" },
  {
    name: "Reverse holo",
    label: "REVERSE HOLO",
    color: "#a7d7cf",
    symbol: "◆",
  },
  { name: "Holographic", label: "HOLOGRAPHIC", color: "#c8b0f1", symbol: "✦" },
  { name: "Gold rare", label: "GOLD RARE", color: "#e7ca7e", symbol: "✧" },
];
export const COLLECTION_SIZE = BUILDERS.length * FINISHES.length;
export const FINAL_CARD_GOLD_PERCENT = 1;
// Keep the original storage key so the app rename preserves existing collections.
export function seededRandom(seed) {
  let n = seed >>> 0;
  return () => {
    n += 0x6d2b79f5;
    let t = Math.imul(n ^ (n >>> 15), 1 | n);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function makePack(rng = Math.random) {
  const available = BUILDERS.map((_, i) => i);
  return Array.from({ length: 5 }, (_, i) => {
    const person = available.splice(Math.floor(rng() * available.length), 1)[0];
    const r = rng();
    const finish =
      i === 4
        ? r < 1 - FINAL_CARD_GOLD_PERCENT / 100
          ? 2
          : 3
        : r < 0.64
          ? 0
          : r < 0.89
            ? 1
            : r < 0.99
              ? 2
              : 3;
    return { person, finish };
  });
}
export function cardKey(card) {
  return `${card.person}-${card.finish}`;
}
export function cleanSave(input) {
  const cards = {};
  if (input && typeof input.cards === "object")
    for (const [key, count] of Object.entries(input.cards || {})) {
      if (
        /^\d+-\d+$/.test(key) &&
        key === `${Number(key.split("-")[0])}-${Number(key.split("-")[1])}` &&
        Number(key.split("-")[0]) < BUILDERS.length &&
        Number(key.split("-")[1]) < FINISHES.length &&
        Number.isSafeInteger(count) &&
        count > 0
      )
        cards[key] = count;
    }
  return {
    cards,
    packs:
      Number.isSafeInteger(input?.packs) && input.packs > 0 ? input.packs : 0,
    // Existing collections keep their lifetime totals and receive the new starter allowance.
    packAccess: cleanPackAccess(input?.packAccess),
  };
}
