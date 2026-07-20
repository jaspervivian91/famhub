/**
 * Conversation Starters — Template-Based AI-Simulated Icebreakers
 *
 * Generates personalized conversation starters based on relationship type,
 * how long it's been since the last contact, and member names.
 *
 * This replaces an external AI API call with curated template logic.
 * The templates are structured so they can later be swapped for a real
 * LLM prompt without changing the call-site interface.
 */

import type { ConversationStarter } from "~/lib/types";

// ---------------------------------------------------------------------------
// Template data
// ---------------------------------------------------------------------------

type RelationshipType =
  | "grandparent"
  | "parent"
  | "child"
  | "sibling"
  | "cousin"
  | "spouse"
  | "aunt_uncle"
  | "family";

interface TemplateGroup {
  memory: string[];
  photo: string[];
  question: string[];
  activity: string[];
}

const TEMPLATES: Record<RelationshipType, TemplateGroup> = {
  grandparent: {
    memory: [
      "Ask {name} about their favorite childhood summer memory",
      "Ask {name} what music they loved when they were growing up",
      "What was {name}'s first job? Ask them to tell you about it",
      "Ask {name} about the day they met their spouse/partner",
    ],
    photo: [
      "Share a recent photo and ask {name} if they remember where it was taken",
      "Send {name} an old family photo and ask who's in it",
      "Share a picture of your kids and ask {name} what they were like at that age",
    ],
    question: [
      "Ask {name} what invention changed their life the most",
      "What's the best piece of advice {name} ever received?",
      "Ask {name} what holiday tradition they miss the most",
    ],
    activity: [
      "Suggest you and {name} cook a family recipe together over video call",
      "Ask {name} to teach you a skill they're proud of",
      "Propose a weekly 'story time' call where {name} shares one memory",
    ],
  },
  parent: {
    memory: [
      "Ask {name} what you were like as a baby — they'll love reminiscing",
      "What's the funniest thing you ever did as a kid? Ask {name}",
      "Ask {name} about their own parents — what were your grandparents like?",
    ],
    photo: [
      "Share a throwback photo and ask {name} what they remember about that day",
      "Send {name} a photo of something that reminded you of them today",
    ],
    question: [
      "Ask {name} what they're most proud of in their life so far",
      "What's one thing {name} wishes they'd known at your age?",
      "Ask {name} what their perfect day looks like right now",
    ],
    activity: [
      "Plan a virtual coffee date with {name} this weekend",
      "Suggest watching the same movie 'together' and calling {name} after",
      "Ask {name} to share a playlist of songs that mean something to them",
    ],
  },
  child: {
    memory: [
      "Ask {name} what the best part of their week was",
      "What's {name}'s favorite memory from this year so far?",
      "Ask {name} to tell you about a time they felt really proud",
    ],
    photo: [
      "Share a funny photo and ask {name} to caption it",
      "Send {name} a baby photo and ask if they recognize themselves",
    ],
    question: [
      "If {name} could have any superpower, what would it be and why?",
      "Ask {name} what three things they'd take to a desert island",
      "What's something {name} is really excited about right now?",
    ],
    activity: [
      "Challenge {name} to a drawing contest — share and compare!",
      "Suggest a virtual game session with {name} this weekend",
      "Start a 'joke of the week' exchange with {name}",
    ],
  },
  sibling: {
    memory: [
      "Remind {name} of a funny incident from your childhood together",
      "Ask {name} what their favorite family vacation was",
      "What's a shared memory with {name} that still makes you laugh?",
    ],
    photo: [
      "Dig up an embarrassing childhood photo and send it to {name}",
      "Share a recent photo and challenge {name} to share one back",
    ],
    question: [
      "Ask {name} what they're working on that they're excited about",
      "What's one thing {name} would change about your childhood home?",
      "Ask {name} for their honest opinion on something",
    ],
    activity: [
      "Start a sibling book club — just the two of you with {name}",
      "Challenge {name} to a step-count competition this month",
      "Plan a surprise for your parents together with {name}",
    ],
  },
  cousin: {
    memory: [
      "Ask {name} about their favorite family reunion memory",
      "What's {name}'s best memory of your grandparents?",
      "Remind {name} of that time you both got in trouble together",
    ],
    photo: [
      "Share a group photo from the last family gathering and tag {name}",
      "Send {name} a throwback photo — can they name everyone in it?",
    ],
    question: [
      "Ask {name} what they've been up to — no small talk, real stuff",
      "What hobby would {name} pursue if time and money were no object?",
      "Ask {name} what family trait they're proudest of",
    ],
    activity: [
      "Start a family history project — {name} might have stories you don't",
      "Plan to attend the next family event together with {name}",
      "Create a shared playlist with {name} — one song each per week",
    ],
  },
  spouse: {
    memory: [
      "Remind {name} of your favorite date together and ask what they remember",
      "Ask {name} what they first noticed about you",
      "What's {name}'s favorite trip you've taken together?",
    ],
    photo: [
      "Send {name} a photo from when you first met",
      "Share a picture of something that made you think of {name} today",
    ],
    question: [
      "Ask {name} what their dream is for the next five years",
      "What's one thing {name} wishes you did more often together?",
      "Ask {name} what they're most grateful for right now",
    ],
    activity: [
      "Plan a surprise date night for {name} — even if it's at home",
      "Start a daily gratitude exchange with {name}",
      "Learn something new together — suggest a class to {name}",
    ],
  },
  aunt_uncle: {
    memory: [
      "Ask {name} what your parent was like growing up",
      "What's {name}'s favorite story about the family?",
      "Ask {name} about their favorite holiday tradition",
    ],
    photo: [
      "Share an old family photo and ask {name} for the story behind it",
      "Send {name} a photo of your kids — they'll love the update",
    ],
    question: [
      "Ask {name} what life lesson they'd pass on to the next generation",
      "What's the best trip {name} ever took?",
      "Ask {name} what they're looking forward to this season",
    ],
    activity: [
      "Suggest a family-wide video call — {name} can be the guest of honor",
      "Ask {name} to share a recipe that's been in the family",
      "Start a 'family history' voice note chain with {name}",
    ],
  },
  family: {
    memory: [
      "Ask {name} what family tradition they treasure most",
      "What's {name}'s favorite thing about your family?",
      "Share a funny family story with {name}",
    ],
    photo: [
      "Share a photo from the last time you were all together",
      "Send {name} a picture of something that reminded you of them",
    ],
    question: [
      "Ask {name} what they'd love to do together when you next meet",
      "What's something {name} has always wanted to try?",
      "Ask {name} what book or show they're into right now",
    ],
    activity: [
      "Plan a virtual family game night — invite {name} first",
      "Suggest a group challenge with {name} (steps, reading, cooking)",
      "Start a shared family photo album with {name}",
    ],
  },
};

// ---------------------------------------------------------------------------
// Prompt-based selection logic
// ---------------------------------------------------------------------------

interface StarterInput {
  relationshipType: RelationshipType;
  daysSinceLastContact: number | null;
  memberName: string; // the person you'd be reaching out TO
}

/**
 * Generate 3 personalized conversation starters based on relationship
 * type and how long it's been since the last contact.
 *
 * The selection algorithm simulates AI reasoning:
 * - Long gaps (>30d) → prioritize memory/photo (reconnection)
 * - Medium gaps (7-30d) → mix of all categories
 * - Short gaps (<7d) → prioritize activity/question (momentum)
 * - No prior contact → memory (ice-breaking)
 */
export function generateConversationStarters(
  input: StarterInput,
): ConversationStarter[] {
  const { relationshipType, daysSinceLastContact, memberName } = input;
  const templates =
    TEMPLATES[relationshipType] ?? TEMPLATES.family;

  const allStarters: Omit<ConversationStarter, "id">[] = [];

  // Build a weighted pool based on the gap
  const pool: { category: ConversationStarter["category"]; weight: number }[] =
    [];

  if (daysSinceLastContact === null || daysSinceLastContact > 30) {
    // Long gap: emphasize memory and photo
    pool.push({ category: "memory", weight: 40 });
    pool.push({ category: "photo", weight: 30 });
    pool.push({ category: "question", weight: 20 });
    pool.push({ category: "activity", weight: 10 });
  } else if (daysSinceLastContact > 7) {
    // Medium gap: balanced
    pool.push({ category: "memory", weight: 25 });
    pool.push({ category: "photo", weight: 25 });
    pool.push({ category: "question", weight: 25 });
    pool.push({ category: "activity", weight: 25 });
  } else {
    // Short gap: momentum
    pool.push({ category: "activity", weight: 35 });
    pool.push({ category: "question", weight: 35 });
    pool.push({ category: "memory", weight: 15 });
    pool.push({ category: "photo", weight: 15 });
  }

  // Pick 3 unique categories using weighted random selection
  const selectedCategories = new Set<ConversationStarter["category"]>();
  const poolCopy = [...pool];

  while (selectedCategories.size < 3 && poolCopy.length > 0) {
    const totalWeight = poolCopy.reduce((s, p) => s + p.weight, 0);
    let r = Math.random() * totalWeight;
    let chosenIdx = 0;

    for (let i = 0; i < poolCopy.length; i++) {
      r -= poolCopy[i].weight;
      if (r <= 0) {
        chosenIdx = i;
        break;
      }
    }

    const chosen = poolCopy[chosenIdx];
    if (!selectedCategories.has(chosen.category)) {
      selectedCategories.add(chosen.category);
      const categoryTemplates = templates[chosen.category];
      const template =
        categoryTemplates[Math.floor(Math.random() * categoryTemplates.length)];
      allStarters.push({
        text: template.replace(/\{name\}/g, memberName),
        category: chosen.category,
      });
    }

    // Remove chosen from pool to avoid re-selecting same category
    poolCopy.splice(chosenIdx, 1);
  }

  // Add IDs
  return allStarters.map((s, i) => ({
    ...s,
    id: `starter-${i}-${Date.now()}`,
  }));
}

// ---------------------------------------------------------------------------
// Category display helpers
// ---------------------------------------------------------------------------

export const CATEGORY_EMOJI: Record<ConversationStarter["category"], string> =
  {
    memory: "📖",
    photo: "📸",
    question: "💭",
    activity: "🎯",
  };

export const CATEGORY_LABEL: Record<ConversationStarter["category"], string> = {
  memory: "Share a memory",
  photo: "Send a photo",
  question: "Ask a question",
  activity: "Do something together",
};
