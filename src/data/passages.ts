export type PassageCategoryId =
  | 'common-words'
  | 'easy-sentences'
  | 'general-english'
  | 'advanced-vocabulary'
  | 'programming'
  | 'custom';

export interface PassageCategory {
  id: PassageCategoryId;
  label: string;
  description: string;
}

export const PASSAGE_CATEGORIES: PassageCategory[] = [
  { id: 'common-words', label: 'Common words', description: 'Random frequent English words.' },
  { id: 'easy-sentences', label: 'Easy sentences', description: 'Short, simple sentences.' },
  { id: 'general-english', label: 'General English', description: 'Everyday prose and short passages.' },
  { id: 'advanced-vocabulary', label: 'Advanced vocabulary', description: 'Longer words and richer sentences.' },
  { id: 'programming', label: 'Programming', description: 'Code-flavoured text with symbols.' },
  { id: 'custom', label: 'Custom text', description: 'Paste your own text to practise.' },
];

export const EASY_SENTENCES: string[] = [
  'The cat sat on the warm mat by the door.',
  'We walk to the park after lunch every day.',
  'She likes to read a good book before bed.',
  'The sun is bright and the sky is clear.',
  'My brother bakes bread on Sunday mornings.',
  'A small bird sang in the old green tree.',
  'Please bring a pen and a piece of paper.',
  'They played a quiet game of cards last night.',
  'The bus was late, so we waited at the stop.',
  'He opened the window to let in some fresh air.',
  'I will call you when I get home from work.',
  'The soup was hot, and the bread was soft.',
  'Our dog loves to chase the ball in the garden.',
  'It rained all day, so we stayed inside.',
  'Fresh apples taste best in the early autumn.',
  'She wrote her name at the top of the page.',
  'Two friends shared a cup of tea and a slice of cake.',
  'The train left the station right on time.',
  'He found a shiny coin under the old sofa.',
  'We painted the fence blue on a sunny afternoon.',
];

export const GENERAL_ENGLISH: string[] = [
  'Learning to type well is like learning to ride a bicycle. At first every movement feels deliberate and clumsy, but with steady practice your hands begin to remember what to do, and soon you stop thinking about it at all.',
  'A good morning routine does not need to be complicated. A glass of water, a few minutes of stretching, and a short look at the plan for the day are often enough to start things off in a calm and focused way.',
  'Cities change quietly. A new cafe opens on a corner, an old cinema closes, and a row of trees grows tall enough to shade the street. Looking back after ten years, the whole neighborhood feels like a different place.',
  'Reading regularly improves vocabulary, concentration and imagination. Even twenty pages a day adds up to many books a year, and each one gives you new ideas to think about and new words to use.',
  'The best meals are often the simplest. Fresh bread, ripe tomatoes, a little olive oil and a pinch of salt can taste better than a complicated dish, because every ingredient has room to shine.',
  'Weather shapes the way we live. A sunny weekend fills the parks with families, while a cold, wet evening sends everyone indoors to share warm food and long conversations by the window.',
  'When a team works well together, everyone knows their role and trusts the others to do theirs. Clear communication, honest feedback and a little humor make even difficult projects feel manageable.',
  'Travel teaches patience and curiosity. Missed trains, unfamiliar streets and new foods all remind us that the world is bigger than our own habits, and that there is more than one right way to do things.',
];

export const ADVANCED_VOCABULARY: string[] = [
  'Meticulous preparation often distinguishes extraordinary achievement from mere competence, because small, unglamorous details accumulate into an unmistakable advantage over time.',
  'The committee deliberated for several hours before reaching a unanimous, if somewhat reluctant, conclusion regarding the proposed infrastructure improvements.',
  'Resilience is not the absence of difficulty but the capacity to recover, adapt and continue moving purposefully when circumstances become unexpectedly challenging.',
  'An ambitious interdisciplinary approach can illuminate connections that specialists, absorbed in their own methodologies, might otherwise overlook entirely.',
  'Eloquent writers choose their words with deliberate care, balancing precision against rhythm so that every sentence feels both inevitable and surprising.',
  'Sustainable development requires collaboration among governments, businesses and communities, each contributing resources, expertise and accountability toward shared objectives.',
  'Her characteristically understated manner concealed an extraordinary determination, which colleagues gradually recognized as the foundation of her remarkable success.',
  'The archaeologists carefully catalogued every fragment, hoping that systematic analysis would eventually reveal how the settlement had flourished and why it was abandoned.',
];

export const PROGRAMMING: string[] = [
  'const total = items.reduce((sum, item) => sum + item.price, 0);',
  'function greet(name) { return "Hello, " + name + "!"; }',
  'for (let i = 0; i < list.length; i++) { console.log(list[i]); }',
  'if (user && user.isActive) { sendWelcomeEmail(user.email); }',
  'const users = data.filter((u) => u.age >= 18).map((u) => u.name);',
  'try { await fetchData(url); } catch (error) { console.error(error); }',
  'def add(a, b): return a + b  # simple python function',
  'SELECT name, email FROM customers WHERE country = "Canada" ORDER BY name;',
  'export default function App() { return <div className="app">Hello</div>; }',
  'git commit -m "fix: handle empty input" && git push origin main',
  'const config = { port: 3000, debug: true, hosts: ["a.com", "b.com"] };',
  'while (queue.length > 0) { const node = queue.shift(); visit(node); }',
];

/** Plain-text normalisation for custom practice text: ASCII only, single spaces. */
export function normalizeCustomText(raw: string): string {
  return raw
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E]/g, '')
    .trim();
}

export const MIN_CUSTOM_CHARS = 20;
export const MAX_CUSTOM_CHARS = 3000;

export const PUNCTUATION_DRILLS: string[] = [
  'Well, well, well; what do we have here?',
  '"Wait!" she cried. "Don\'t go yet; I have news."',
  'It\'s 5 o\'clock, isn\'t it? Yes, it is: time to go home.',
  'First, mix the flour; second, add two eggs; third, stir well.',
  'He said, "Look out!" and pointed at the sky (it was a hawk).',
  'Items needed: pens, paper, glue, tape; also, scissors.',
  'Wow! Really? That is great news, isn\'t it?',
  'Is this the right road? Maybe so; maybe not. Let\'s ask.',
  'Chapter 4: "The Long Road" begins on page 57.',
  'Our meeting is at 3:30, but Tom\'s flight lands at 4:15.',
];
