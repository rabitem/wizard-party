// Global stats type (matches API response)
export interface GlobalStats {
  gamesPlayed: number;
  roundsPlayed: number;
  wizardsPlayed: number;
  jestersPlayed: number;
  cardsPlayed: number;
  tricksPlayed: number;
  perfectBids: number;
  totalBids: number;
  highestScore: number;
  comebackWins: number;
}

// Fun fact templates that use real stats
type StatFactTemplate = {
  type: 'stat';
  template: (stats: GlobalStats) => string | null;
  minValue?: keyof GlobalStats; // Only show if this stat is > 0
};

// Static jokes/tips that don't need stats
type StaticFact = {
  type: 'static';
  text: string;
};

type FunFact = StatFactTemplate | StaticFact;

const funFacts: FunFact[] = [
  // ========== STAT-BASED FACTS ==========
  {
    type: 'stat',
    template: (s) => `${s.wizardsPlayed.toLocaleString()} Wizards have been summoned across all games`,
    minValue: 'wizardsPlayed',
  },
  {
    type: 'stat',
    template: (s) => `${s.jestersPlayed.toLocaleString()} Jesters have... well, jestered`,
    minValue: 'jestersPlayed',
  },
  {
    type: 'stat',
    template: (s) => `${s.gamesPlayed.toLocaleString()} games have been played worldwide`,
    minValue: 'gamesPlayed',
  },
  {
    type: 'stat',
    template: (s) => `${s.cardsPlayed.toLocaleString()} cards have hit the table`,
    minValue: 'cardsPlayed',
  },
  {
    type: 'stat',
    template: (s) => `${s.tricksPlayed.toLocaleString()} tricks have been won (or lost)`,
    minValue: 'tricksPlayed',
  },
  {
    type: 'stat',
    template: (s) => {
      if (s.totalBids === 0) return null;
      const accuracy = ((s.perfectBids / s.totalBids) * 100).toFixed(1);
      return `Global bid accuracy: ${accuracy}% - can you beat that?`;
    },
    minValue: 'totalBids',
  },
  {
    type: 'stat',
    template: (s) => `Highest score ever recorded: ${s.highestScore} points`,
    minValue: 'highestScore',
  },
  {
    type: 'stat',
    template: (s) => `${s.comebackWins} legendary comeback victories have occurred`,
    minValue: 'comebackWins',
  },
  {
    type: 'stat',
    template: (s) => `${s.perfectBids.toLocaleString()} perfect bids have been made`,
    minValue: 'perfectBids',
  },
  {
    type: 'stat',
    template: (s) => {
      const ratio = s.wizardsPlayed > 0 ? (s.jestersPlayed / s.wizardsPlayed).toFixed(2) : '0';
      return `Jester to Wizard ratio: ${ratio}:1`;
    },
    minValue: 'wizardsPlayed',
  },

  // ========== TERRIBLE WIZARD JOKES ==========
  { type: 'static', text: "Why did the Wizard cross the road? To get to the trick side." },
  { type: 'static', text: "What's a Jester's favorite card game? Foolsball." },
  { type: 'static', text: "Why are Wizards bad at poker? They always reveal their trump." },
  { type: 'static', text: "What do you call a Jester who wins a trick? Lost." },
  { type: 'static', text: "How do Wizards stay cool? They have lots of fans in every suit." },
  { type: 'static', text: "Why did the Jester bid zero? It was a no-brainer." },
  { type: 'static', text: "What's a Dwarf's favorite card? Anything underground a 7." },
  { type: 'static', text: "Why don't Elves ever lose? They're always a step ahead... in the Blue." },
  { type: 'static', text: "What did the Wizard say to the Jester? 'You fool!'" },
  { type: 'static', text: "Why is bidding like cooking? Too many cooks overbid the broth." },
  { type: 'static', text: "What's the difference between a Wizard and a 13? About 40 points of confidence." },
  { type: 'static', text: "Why did the player bid 0? They had trust issues with their hand." },
  { type: 'static', text: "How do Giants play cards? Very carefully - they might crush them." },
  { type: 'static', text: "What's a Human's strategy? Whatever the tutorial said." },

  // ========== GAME TIPS (slightly useful) ==========
  { type: 'static', text: "Pro tip: A Wizard in hand is worth two in the discard pile." },
  { type: 'static', text: "Remember: The dealer can't bid what makes the total equal the cards." },
  { type: 'static', text: "Tip: Jesters are great for losing tricks you don't want to win." },
  { type: 'static', text: "Strategy: Save your Wizards for when you really need that trick." },
  { type: 'static', text: "Fun fact: There are exactly 4 Wizards and 4 Jesters in the deck." },
  { type: 'static', text: "Did you know? The deck has 60 cards total - 52 numbered + 4 Wizards + 4 Jesters." },
  { type: 'static', text: "Tip: If a Wizard leads, you can play anything - the Wizard already won." },
  { type: 'static', text: "Remember: If only Jesters are played, the first Jester wins!" },
  { type: 'static', text: "Strategy: Sometimes bidding 0 is the hardest bid to make." },
  { type: 'static', text: "Pro tip: Count the Wizards. There are only 4. Someone has them." },

  // ========== SARCASTIC/META FACTS ==========
  { type: 'static', text: "Studies show 100% of Wizard games involve cards." },
  { type: 'static', text: "Breaking: Local player blames bad luck, not bad bids." },
  { type: 'static', text: "Fun fact: The cards you need are always in someone else's hand." },
  { type: 'static', text: "Statistically, you'll win some and lose more." },
  { type: 'static', text: "Loading wizard wisdom... ERROR: wisdom not found." },
  { type: 'static', text: "The Jester is just a Wizard having a bad day." },
  { type: 'static', text: "You miss 100% of the bids you don't make. Wait, that's good." },
  { type: 'static', text: "Behind every great Wizard player is a trail of sad Jesters." },
  { type: 'static', text: "'Just one more game' - Famous last words" },
  { type: 'static', text: "The real treasure was the tricks we lost along the way." },
];

export function getRandomFunFact(stats: GlobalStats | null): string {
  // Filter to valid facts
  const validFacts = funFacts.filter((fact) => {
    if (fact.type === 'static') return true;
    if (!stats) return false;
    if (fact.minValue && stats[fact.minValue] <= 0) return false;
    const result = fact.template(stats);
    return result !== null;
  });

  if (validFacts.length === 0) {
    return "Waiting for more games to generate fun facts...";
  }

  const randomFact = validFacts[Math.floor(Math.random() * validFacts.length)];

  if (randomFact.type === 'static') {
    return randomFact.text;
  }

  return randomFact.template(stats!) ?? "Magic is happening...";
}

export function getMultipleRandomFacts(stats: GlobalStats | null, count: number): string[] {
  const facts: string[] = [];
  const usedIndices = new Set<number>();

  // Get valid facts
  const validFacts = funFacts.filter((fact) => {
    if (fact.type === 'static') return true;
    if (!stats) return false;
    if (fact.minValue && stats[fact.minValue] <= 0) return false;
    return true;
  });

  while (facts.length < count && usedIndices.size < validFacts.length) {
    const index = Math.floor(Math.random() * validFacts.length);
    if (usedIndices.has(index)) continue;
    usedIndices.add(index);

    const fact = validFacts[index];
    if (fact.type === 'static') {
      facts.push(fact.text);
    } else if (stats) {
      const result = fact.template(stats);
      if (result) facts.push(result);
    }
  }

  return facts;
}
