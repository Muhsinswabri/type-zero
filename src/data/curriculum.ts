import { COMMON_WORDS, wordsUsing } from './words';
import { DEFAULT_MIN_ACCURACY } from './rewards';
import { groupLine, wordLine, wordsExercise } from '../lib/drills';
import { seeded, type Rng } from '../lib/rng';
import type { StartLevel } from '../types';

export interface Exercise {
  label?: string;
  text: string;
  /** Optional time limit in seconds. Running out of time counts as not finishing the exercise. */
  limitSec?: number;
}

export interface ExplainerSection {
  heading: string;
  body: string;
}

export type KeyboardView = 'default' | 'explore' | 'zones';

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  objective: string;
  durationMin: number;
  difficulty: StartLevel;
  /** Keys this lesson introduces or focuses on. */
  targetKeys: string[];
  /** Every character the learner has been taught up to and including this lesson. */
  allowed: string;
  instructions: string[];
  explainer?: ExplainerSection[];
  keyboardView: KeyboardView;
  exercises: Exercise[];
  minAccuracy: number;
  minWpm?: number;
  xp: number;
}

export interface Module {
  id: string;
  number: number;
  title: string;
  summary: string;
  lessons: Lesson[];
}

interface Ctx {
  /** Lowercase letters known so far (including this lesson's keys). */
  letters: string;
  rng: Rng;
  groups(keys: string, n?: number): string;
  words(lines?: number, perLine?: number): string;
  wordsFocus(focus: string, lines?: number, perLine?: number): string;
  common(lines?: number, perLine?: number): string;
}

interface LessonSpec {
  id: string;
  title: string;
  description: string;
  objective: string;
  durationMin: number;
  targetKeys?: string;
  teachesShift?: boolean;
  instructions: string[];
  explainer?: ExplainerSection[];
  keyboardView?: KeyboardView;
  minAccuracy?: number;
  minWpm?: number;
  exercises: (c: Ctx) => (string | Exercise)[];
}

interface ModuleSpec {
  id: string;
  title: string;
  summary: string;
  difficulty: StartLevel;
  unrestricted?: boolean;
  lessons: LessonSpec[];
}

const ALL_CHARS = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');

const MODULES: ModuleSpec[] = [
  {
    id: 'm1',
    title: 'Meet Your Keyboard',
    summary: 'Get oriented: the layout, the two hands, the home row and a healthy posture.',
    difficulty: 'beginner',
    lessons: [
      {
        id: 'm1-keyboard',
        title: 'Introduction to the keyboard',
        description: 'What the keys are, and why touch typing beats hunting and pecking.',
        objective: 'Know the three kinds of keys and press F and J without looking.',
        durationMin: 4,
        targetKeys: 'fj',
        keyboardView: 'explore',
        explainer: [
          {
            heading: 'Three kinds of keys',
            body: 'Letter keys, number and symbol keys, and special keys such as Shift, Space, Enter and Backspace. You will meet them all, one small step at a time.',
          },
          {
            heading: 'Eyes on the screen',
            body: 'Touch typing means your fingers learn where every key is, so your eyes stay on the text. Looking down feels faster today but caps your speed tomorrow.',
          },
          {
            heading: 'Accuracy first',
            body: 'Speed is a by-product of accuracy and rhythm. Each lesson asks for 90% accuracy before moving on, so you build habits you will not have to unlearn.',
          },
        ],
        instructions: [
          'Click any key on the on-screen keyboard below to see its name and which finger presses it.',
          'Place your index fingers on F (left) and J (right).',
          'Type the exercises without looking at your hands.',
        ],
        exercises: (c) => ['f j f j f j f j', 'jf fj jf fj jf fj', c.groups('fj', 7)],
      },
      {
        id: 'm1-qwerty',
        title: 'Understanding the QWERTY layout',
        description: 'Read the keyboard in rows: numbers, top, home and bottom.',
        objective: 'Name the four rows and find D and K.',
        durationMin: 4,
        targetKeys: 'dk',
        keyboardView: 'explore',
        explainer: [
          {
            heading: 'Why "QWERTY"?',
            body: 'The first six letters on the top row spell QWERTY. This layout has been the standard for English keyboards for over a century, so skills you learn here work on nearly every keyboard.',
          },
          {
            heading: 'Four rows to remember',
            body: 'The number row sits on top, then the top letter row (Q to P), the home row (A to semicolon) and the bottom row (Z to slash). The spacebar runs underneath.',
          },
          {
            heading: 'Home is the middle',
            body: 'Every other row is reached from the home row. Learn to return to it and everything else gets easier.',
          },
        ],
        instructions: [
          'Click keys on each row and notice which finger the guide shows.',
          'D sits to the right of S and under your left middle finger; K is its mirror image on the right.',
        ],
        exercises: (c) => ['fd jk fd jk fd jk', 'dk fj dk fj dk fj', c.groups('fjdk', 7)],
      },
      {
        id: 'm1-zones',
        title: 'Left-hand and right-hand zones',
        description: 'See which keys belong to which finger.',
        objective: 'Know that the left hand covers the left half and the right hand covers the right half.',
        durationMin: 5,
        targetKeys: 'asl;',
        keyboardView: 'zones',
        explainer: [
          {
            heading: 'Each finger owns a column',
            body: 'Colour the keyboard by finger and a pattern appears: every finger covers its own slanted column. Index fingers cover two columns each.',
          },
          {
            heading: 'Two hands, two halves',
            body: 'Your left hand handles keys up to roughly T, G and B. The right hand handles Y, H, N and everything to the right. Thumbs share the spacebar.',
          },
        ],
        instructions: [
          'Hover or click keys to see which finger color they belong to.',
          'Alternate hands in the drills: left, right, left, right.',
        ],
        exercises: () => ['a j s k d l f ;', 'f j d k s l a ;', 'asdf jkl; asdf jkl;'],
      },
      {
        id: 'm1-homerow',
        title: 'Understanding home-row positioning',
        description: 'Rest your fingers on A S D F and J K L ; and always come back.',
        objective: 'Rest eight fingers on the home row and feel the bumps on F and J.',
        durationMin: 5,
        keyboardView: 'default',
        explainer: [
          {
            heading: 'The resting position',
            body: 'Left hand: A S D F with the pinky, ring, middle and index finger. Right hand: J K L ; with the index, middle, ring and pinky. Thumbs hover over the spacebar.',
          },
          {
            heading: 'Feel for the bumps',
            body: 'F and J have small raised bars. Your index fingers find them by touch, so you can reset to the home row without looking.',
          },
          {
            heading: 'Always return',
            body: 'After reaching for any other key, bring that finger back to its home key. This habit is what makes touch typing reliable.',
          },
        ],
        instructions: [
          'Place your fingers on the highlighted keys.',
          'Keep your fingers curved and your wrists relaxed.',
        ],
        exercises: (c) => ['asdf jkl; asdf jkl;', 'fdsa ;lkj fdsa ;lkj', c.groups('asdfjkl;', 7)],
      },
      {
        id: 'm1-posture',
        title: 'Correct posture and hand positioning',
        description: 'Set up your body and desk so typing stays comfortable.',
        objective: 'Adopt a relaxed posture and type slowly with it.',
        durationMin: 4,
        keyboardView: 'default',
        explainer: [
          { heading: 'Sit tall, feet flat', body: 'Keep your back supported and your feet flat on the floor.' },
          { heading: 'Elbows near 90 degrees', body: 'Your forearms should be roughly level with the keyboard, with elbows close to your sides.' },
          { heading: 'Float your wrists', body: 'Do not rest your wrists on the desk while typing. Let your hands hover and your fingers curve naturally.' },
          { heading: 'Screen at eye level', body: 'Place the top of the screen at about eye height, an arm’s length away, to avoid neck strain.' },
          { heading: 'Take short breaks', body: 'Every twenty minutes, stand up, shake out your hands and look into the distance for a few seconds.' },
        ],
        instructions: [
          'Adjust your seat, screen and keyboard before you start.',
          'Type the exercises slowly. Aim for smooth, relaxed movements.',
        ],
        exercises: () => ['a s d f j k l ; a s d f j k l ;', 'ask ask ask ask lad lad', 'all fall; all fall; all fall;'],
      },
    ],
  },
  {
    id: 'm2',
    title: 'Home Row Fundamentals',
    summary: 'Master the eight home keys, plus G and H, until they are automatic.',
    difficulty: 'beginner',
    lessons: [
      {
        id: 'm2-left',
        title: 'Left-hand home row: A S D F',
        description: 'Train your left hand on A, S, D and F.',
        objective: 'Type A, S, D and F with the correct fingers at 90% accuracy.',
        durationMin: 5,
        targetKeys: 'asdf',
        instructions: [
          'Left pinky A, ring finger S, middle finger D, index finger F.',
          'Return each finger to its home key after every press.',
        ],
        exercises: (c) => [c.groups('asdf', 7), 'asdf fdsa asdf fdsa asdf', c.wordsFocus('asdf', 1, 6)],
      },
      {
        id: 'm2-right',
        title: 'Right-hand home row: J K L ;',
        description: 'Train your right hand on J, K, L and semicolon.',
        objective: 'Type J, K, L and semicolon with the correct fingers at 90% accuracy.',
        durationMin: 5,
        targetKeys: 'jkl;',
        instructions: [
          'Right index finger J, middle finger K, ring finger L, pinky semicolon.',
          'Keep your left hand resting on its home keys while the right hand works.',
        ],
        exercises: (c) => [c.groups('jkl;', 7), 'jkl; ;lkj jkl; ;lkj jkl;', 'jk jl j; kl k; l; jk kl l;'],
      },
      {
        id: 'm2-both',
        title: 'Combining both hands',
        description: 'Bring both hands together and add G and H with the index fingers.',
        objective: 'Alternate hands smoothly and reach G and H.',
        durationMin: 6,
        targetKeys: 'gh',
        instructions: [
          'Left index finger reaches right to G; right index finger reaches left to H.',
          'Snap the finger back to F or J straight away.',
        ],
        exercises: (c) => [c.groups('fgjh', 7), 'fg jh fg jh gf hj gf hj', c.groups('asdfghjkl;', 8)],
      },
      {
        id: 'm2-bumps',
        title: 'Finding the F and J reference bumps',
        description: 'Practise re-finding home position by feel.',
        objective: 'Return to F and J by touch after every reach.',
        durationMin: 4,
        targetKeys: 'fj',
        instructions: [
          'Feel the bump on F and J before typing each line.',
          'Do not look down. If you lose home position, feel for the bumps.',
        ],
        exercises: () => ['ff jj ff jj fj jf', 'fg jh fg jh fj hg', 'gf hj gf hj fj jf fj jf'],
      },
      {
        id: 'm2-words',
        title: 'Home-row words',
        description: 'Type real words made only from the home row.',
        objective: 'Type home-row words accurately without looking.',
        durationMin: 6,
        instructions: ['Think of words as one flowing motion, then press space with either thumb.'],
        exercises: (c) => [c.words(1, 6), c.words(1, 6), c.words(1, 6)],
      },
      {
        id: 'm2-sentences',
        title: 'Home-row sentences',
        description: 'Short sentences with home-row letters and semicolons.',
        objective: 'Finish whole lines while staying on the home row.',
        durationMin: 6,
        instructions: ['Keep a steady rhythm; do not rush the semicolon.'],
        exercises: () => [
          'a sad lad asks dad;',
          'dad had a salad; a lass had a flask;',
          'all lads shall ask a glad lass;',
          'a gala hall has a flag; dad sags;',
        ],
      },
    ],
  },
  {
    id: 'm3',
    title: 'Top Row',
    summary: 'Reach up to Q W E R T and Y U I O P, then return home.',
    difficulty: 'beginner',
    lessons: [
      {
        id: 'm3-left',
        title: 'Left-hand top row: Q W E R T',
        description: 'Reach up from the home row with your left hand.',
        objective: 'Type Q, W, E, R and T with the right fingers.',
        durationMin: 6,
        targetKeys: 'qwert',
        instructions: ['Each finger reaches straight up from its home key. Return after every press.'],
        exercises: (c) => [c.groups('qwert', 7), 'aq sw de fr ft fr de sw aq', c.wordsFocus('qwert', 1, 6)],
      },
      {
        id: 'm3-right',
        title: 'Right-hand top row: Y U I O P',
        description: 'Reach up from the home row with your right hand.',
        objective: 'Type Y, U, I, O and P with the right fingers.',
        durationMin: 6,
        targetKeys: 'yuiop',
        instructions: ['Your right index finger reaches up-left to Y and straight up to U.'],
        exercises: (c) => [c.groups('yuiop', 7), 'jy ju ki lo ;p ;p lo ki ju jy', c.wordsFocus('yuiop', 1, 6)],
      },
      {
        id: 'm3-alternate',
        title: 'Alternating between top and home rows',
        description: 'Move quickly between home keys and top keys.',
        objective: 'Alternate rows without losing home position.',
        durationMin: 6,
        instructions: ['Reach, press, return. Keep the other fingers anchored on the home row.'],
        exercises: (c) => ['a q s w d e f r j y k u l i ; o', 'q a w s e d r f t g y h u j i k o l p ;', c.groups('qwertyuiopasdfghjkl', 8)],
      },
      {
        id: 'm3-words',
        title: 'Top-row words',
        description: 'Real words from the home and top rows.',
        objective: 'Type words from these two rows at steady accuracy.',
        durationMin: 6,
        instructions: ['Look at the next word while you finish the current one.'],
        exercises: (c) => [c.words(1, 6), c.words(1, 6), c.words(1, 6)],
      },
      {
        id: 'm3-mixed',
        title: 'Mixed-row exercises',
        description: 'Combine the home and top rows in short lines.',
        objective: 'Finish mixed lines at 90% accuracy.',
        durationMin: 7,
        instructions: ['Stay relaxed. Accuracy matters more than speed.'],
        exercises: (c) => [
          c.words(1, 7),
          'the power is out;',
          'write the first letter;',
          'your wife was quite polite;',
        ],
      },
    ],
  },
  {
    id: 'm4',
    title: 'Bottom Row',
    summary: 'Learn Z X C V B and N M , . / to complete the letter rows.',
    difficulty: 'beginner',
    lessons: [
      {
        id: 'm4-left',
        title: 'Left-hand bottom row: Z X C V B',
        description: 'Reach down with your left hand.',
        objective: 'Type Z, X, C, V and B with the right fingers.',
        durationMin: 6,
        targetKeys: 'zxcvb',
        instructions: ['Curl your fingers slightly to reach down, then return to the home row.'],
        exercises: (c) => [c.groups('zxcvb', 7), 'az sx dc fv fb fv dc sx az', c.wordsFocus('zxcvb', 1, 6)],
      },
      {
        id: 'm4-right',
        title: 'Right-hand bottom row: N M , . /',
        description: 'Reach down with your right hand, including comma, period and slash.',
        objective: 'Type N, M, comma, period and slash with the right fingers.',
        durationMin: 6,
        targetKeys: 'nm,./',
        instructions: ['Right index finger reaches N and M; middle finger comma; ring finger period; pinky slash.'],
        exercises: (c) => [c.groups('nm,./', 7), 'jn jm k, l. ;/ l. k, jm jn', c.wordsFocus('nm', 1, 6)],
      },
      {
        id: 'm4-alternate',
        title: 'Alternating between all three letter rows',
        description: 'Use the top, home and bottom rows together.',
        objective: 'Move between rows smoothly.',
        durationMin: 7,
        instructions: ['Return to the home row between reaches whenever you can.'],
        exercises: (c) => [
          'qaz wsx edc rfv tgb yhn ujm ik, ol. p;/',
          c.groups('abcdefghijklmnopqrstuvwxyz', 8),
          c.words(1, 7),
        ],
      },
      {
        id: 'm4-common',
        title: 'Common words and sentences',
        description: 'Whole sentences with every letter you now know.',
        objective: 'Type full sentences at 90% accuracy.',
        durationMin: 8,
        instructions: ['Use the comma and period with the same finger you practiced.'],
        exercises: () => [
          'the quick brown fox jumps over the lazy dog.',
          'we can type, we can learn, and we can improve.',
          'a calm mind, a steady hand, and a clear plan.',
        ],
      },
    ],
  },
  {
    id: 'm5',
    title: 'Complete Alphabet',
    summary: 'Put all 26 letters together and add capitals with Shift.',
    difficulty: 'intermediate',
    lessons: [
      {
        id: 'm5-all',
        title: 'All letters together',
        description: 'Sentences that use the entire alphabet.',
        objective: 'Type every letter with accuracy.',
        durationMin: 6,
        instructions: ['Pangrams use every letter at least once, which makes them perfect drills.'],
        exercises: () => [
          'the quick brown fox jumps over the lazy dog.',
          'pack my box with five dozen liquor jugs.',
          'sphinx of black quartz, judge my vow.',
        ],
      },
      {
        id: 'm5-words',
        title: 'Common English words',
        description: 'The most frequent words in the language.',
        objective: 'Build fluency with everyday vocabulary.',
        durationMin: 6,
        instructions: ['Common words appear everywhere, so speed here pays off everywhere.'],
        exercises: (c) => [c.common(1, 7), c.common(1, 7), c.common(1, 7)],
      },
      {
        id: 'm5-combos',
        title: 'Frequently used letter combinations',
        description: 'Practise the letter pairs and endings that appear most often.',
        objective: 'Type common pairs like TH, ER and ING as one motion.',
        durationMin: 6,
        instructions: ['Your fingers will start to chunk these combinations into a single movement.'],
        exercises: () => [
          'th the then them there that this',
          'er her were water better under',
          'ing sing thing string morning',
          'tion nation motion station action',
        ],
      },
      {
        id: 'm5-sentences',
        title: 'Longer sentences',
        description: 'Sentences with commas and periods.',
        objective: 'Keep a steady pace through longer lines.',
        durationMin: 7,
        instructions: ['Pause only at punctuation, not in the middle of words.'],
        exercises: () => [
          'the sun rose over the hills, and the whole valley woke up slowly.',
          'we practice a little every day, because small steps lead to big progress.',
          'a calm and steady pace will take you further than a fast and careless one.',
        ],
      },
      {
        id: 'm5-shift',
        title: 'Capital letters and Shift',
        description: 'Hold Shift with the opposite hand to type capitals.',
        objective: 'Type capital letters with the opposite-hand Shift key.',
        durationMin: 7,
        teachesShift: true,
        instructions: [
          'For a letter typed by your left hand, hold the right Shift with your right pinky, and vice versa.',
          'Press Shift, tap the letter, release both.',
        ],
        exercises: () => [
          'Anna and Ben met Carla in Paris.',
          'The Moon, Mars and Venus are bright tonight.',
          'Every Monday, Tom and Nora play chess.',
        ],
      },
    ],
  },
  {
    id: 'm6',
    title: 'Punctuation and Numbers',
    summary: 'Add punctuation, quotation marks and the number row.',
    difficulty: 'intermediate',
    lessons: [
      {
        id: 'm6-period-comma',
        title: 'Periods and commas',
        description: 'Use periods and commas inside real sentences.',
        objective: 'Type commas and periods without breaking rhythm.',
        durationMin: 5,
        targetKeys: ',.',
        instructions: ['Comma is the right middle finger, period is the right ring finger.'],
        exercises: () => [
          'First, we wash the cups. Then, we dry them.',
          'Slowly, carefully, and with focus, she finished the page.',
          'It rained. We stayed in, read books, and drank tea.',
        ],
      },
      {
        id: 'm6-quotes',
        title: 'Apostrophes and quotation marks',
        description: 'Apostrophes sit next to Enter. Hold Shift for quotation marks.',
        objective: 'Type apostrophes and quotation marks naturally.',
        durationMin: 6,
        targetKeys: '\'"',
        instructions: ['The right pinky reaches the apostrophe key. Hold left Shift for the quotation mark.'],
        exercises: () => [
          "It's time to go, and we're ready.",
          'She said, "Let\'s begin."',
          "Don't stop; you're doing well.",
        ],
      },
      {
        id: 'm6-qmark-excl',
        title: 'Question marks and exclamation marks',
        description: 'Shift plus slash gives a question mark; Shift plus 1 gives an exclamation mark.',
        objective: 'Type ? and ! with the correct Shift hand.',
        durationMin: 6,
        targetKeys: '?!',
        instructions: ['? uses left Shift with the right pinky. ! uses right Shift with the left pinky.'],
        exercises: () => [
          'Is this the right key? Yes! Keep going!',
          'Who is ready? We are! Let us begin!',
          'Really? Wow! That was quick!',
        ],
      },
      {
        id: 'm6-numbers',
        title: 'Number-row practice',
        description: 'Learn 1 to 0 with the right fingers.',
        objective: 'Type the number row without looking.',
        durationMin: 7,
        targetKeys: '1234567890',
        instructions: [
          'Left hand: 1 pinky, 2 ring, 3 middle, 4 and 5 index.',
          'Right hand: 6 and 7 index, 8 middle, 9 ring, 0 pinky.',
        ],
        exercises: () => [
          '1 2 3 4 5 6 7 8 9 0',
          '12 34 56 78 90 09 87 65 43 21',
          'I have 3 cats and 12 fish.',
          'Call 555 0123 after 9 and before 11.',
        ],
      },
      {
        id: 'm6-mixed',
        title: 'Mixed punctuation and numbers',
        description: 'Everything together in realistic sentences.',
        objective: 'Mix letters, numbers and punctuation at 90% accuracy.',
        durationMin: 8,
        instructions: ['Slow down slightly for symbols, then let your speed build back.'],
        exercises: () => [
          "On May 5, we typed 120 words, didn't we? Yes!",
          '"Chapter 3 starts on page 45," she said.',
          'The train leaves at 7, and it costs 12 dollars!',
        ],
      },
    ],
  },
  {
    id: 'm7',
    title: 'Accuracy Training',
    summary: 'Build clean, deliberate typing before you chase speed.',
    difficulty: 'intermediate',
    unrestricted: true,
    lessons: [
      {
        id: 'm7-slow',
        title: 'Slow, controlled typing',
        description: 'Deliberately slow practice to remove errors.',
        objective: 'Type with 95% accuracy at a relaxed pace.',
        durationMin: 6,
        minAccuracy: 95,
        instructions: ['Slow down until you make almost no mistakes. Speed returns on its own.'],
        exercises: () => [
          'Type each letter with care. Speed will come later.',
          'Smooth is steady, and steady becomes fast.',
          'Take a breath, look ahead, and let your fingers find their way.',
        ],
      },
      {
        id: 'm7-weak',
        title: 'Frequently mistyped letters',
        description: 'Drills for pairs and look-alike words people mix up.',
        objective: 'Tell look-alike letter patterns apart.',
        durationMin: 6,
        minAccuracy: 92,
        instructions: ['Use Practice mode > Weak keys later for drills based on your own mistakes.'],
        exercises: () => [
          'receive believe relief ceiling',
          'form from firm farm',
          'trial trail trill tail',
          'quite quiet quit quote',
        ],
      },
      {
        id: 'm7-repeats',
        title: 'Repeated-letter practice',
        description: 'Double letters can trip fast fingers.',
        objective: 'Type double letters cleanly.',
        durationMin: 6,
        minAccuracy: 92,
        instructions: ['Press the same key twice with a light, even rhythm.'],
        exercises: () => [
          'll ee oo ss tt ff mm pp rr',
          'book coffee balloon success address committee',
          'letter little summer happy butter apple bubble puddle',
        ],
      },
      {
        id: 'm7-difficult',
        title: 'Difficult words',
        description: 'Words that are long or easy to misspell.',
        objective: 'Type tricky words correctly the first time.',
        durationMin: 7,
        minAccuracy: 92,
        instructions: ['Break long words into chunks, but do not pause between them.'],
        exercises: () => [
          'necessary separate definitely receive occurred rhythm',
          'schedule accommodate privilege environment government',
          'embarrass conscience independent knowledge occasionally',
        ],
      },
      {
        id: 'm7-pressure',
        title: 'Accuracy under time pressure',
        description: 'Stay accurate while the clock runs.',
        objective: 'Finish within the time limit at 95% accuracy.',
        durationMin: 7,
        minAccuracy: 95,
        instructions: ['Each exercise has a time limit. If time runs out, retry the lesson.'],
        exercises: () => [
          { text: 'Clear thinking and clean typing go together when you stay calm.', limitSec: 45 },
          { text: 'Under pressure the best typists slow down a little, which saves time overall.', limitSec: 50 },
          { text: 'Accuracy first, speed second, and the best results come to those who keep practicing.', limitSec: 55 },
        ],
      },
    ],
  },
  {
    id: 'm8',
    title: 'Speed Development',
    summary: 'Build rhythm, flow and stamina to raise your words per minute.',
    difficulty: 'advanced',
    unrestricted: true,
    lessons: [
      {
        id: 'm8-patterns',
        title: 'Common word patterns',
        description: 'Endings and families of words that share patterns.',
        objective: 'Type word families as one fluent motion.',
        durationMin: 6,
        minWpm: 10,
        instructions: ['Notice the shared endings and let your fingers repeat the pattern.'],
        exercises: () => [
          'the they them then there their these',
          'and hand land band stand brand',
          'ing sing ring king thing bring',
          'ight light night right might sight',
          'ough though through thought tough',
        ],
      },
      {
        id: 'm8-rhythm',
        title: 'Typing rhythm',
        description: 'Even keystrokes beat bursts of speed.',
        objective: 'Keep an even rhythm across a whole line.',
        durationMin: 6,
        minWpm: 12,
        instructions: ['Imagine a metronome. Hit each key at the same beat.'],
        exercises: (c) => [c.common(1, 8), 'up and down and up and down and up and down', c.common(1, 8)],
      },
      {
        id: 'm8-flow',
        title: 'Sentence flow',
        description: 'Move through whole sentences without stopping.',
        objective: 'Type sentences in one flowing pass.',
        durationMin: 7,
        minWpm: 15,
        instructions: ['Read two or three words ahead so your fingers never wait for your eyes.'],
        exercises: () => [
          'The best way to get faster is to read ahead and keep your eyes moving forward.',
          'When you stop looking at the keys, your speed begins to climb on its own.',
          'Short daily practice beats a long session once a week.',
        ],
      },
      {
        id: 'm8-passages',
        title: 'Longer passages',
        description: 'Build stamina with paragraph-length text.',
        objective: 'Stay accurate and steady for a full paragraph.',
        durationMin: 8,
        minWpm: 15,
        instructions: ['Pace yourself. A steady pace beats a fast start and a slow finish.'],
        exercises: () => [
          'A good habit is built one small step at a time. Every minute you spend practicing teaches your fingers where to go, and before long you will find that you no longer have to think about it.',
          'Typing is a skill like any other. At first it feels awkward, then it feels easier, and finally it becomes automatic. Be patient with yourself and keep returning to the home row.',
        ],
      },
      {
        id: 'm8-timed',
        title: 'Timed practice',
        description: 'Type under a time limit.',
        objective: 'Finish each passage within its time limit.',
        durationMin: 7,
        minWpm: 18,
        instructions: ['Each exercise has a time limit. Keep going if you make a mistake, and fix it only if it is the last letter.'],
        exercises: () => [
          { text: 'Practice makes progress, and progress builds confidence with every line you finish.', limitSec: 60 },
          { text: 'The more you type, the more your hands remember. Trust them and keep your eyes on the screen.', limitSec: 70 },
        ],
      },
      {
        id: 'm8-goals',
        title: 'Personal speed goals',
        description: 'Aim for a speed target that fits you.',
        objective: 'Reach 20 WPM with 90% accuracy.',
        durationMin: 7,
        minWpm: 20,
        instructions: ['Choose a modest goal, such as five more WPM than last week, and write it down.'],
        exercises: () => [
          'A clear goal makes practice feel purposeful and keeps you motivated.',
          'Track your progress, celebrate small wins, and set a slightly higher goal next time.',
        ],
      },
    ],
  },
  {
    id: 'm9',
    title: 'Real-World Typing',
    summary: 'Type messages, emails and passages the way you will in daily life.',
    difficulty: 'advanced',
    unrestricted: true,
    lessons: [
      {
        id: 'm9-messages',
        title: 'Everyday messages',
        description: 'Casual messages with punctuation and questions.',
        objective: 'Type everyday messages quickly and cleanly.',
        durationMin: 6,
        instructions: ['Casual does not mean careless. Keep your accuracy high.'],
        exercises: () => [
          'Hi Sam, are we still on for lunch at noon? I am running about ten minutes late, sorry!',
          'Thanks for the update. I will send the files tonight, and we can talk tomorrow morning.',
          'Happy birthday! Hope you have a wonderful day full of cake, music, and good friends.',
        ],
      },
      {
        id: 'm9-emails',
        title: 'Emails',
        description: 'Greetings, requests and sign-offs.',
        objective: 'Type a full email with accuracy.',
        durationMin: 8,
        instructions: ['Pay attention to capital letters at the start of sentences and names.'],
        exercises: () => [
          'Hello Ms. Carter, thank you for your quick reply. I have attached the updated schedule for your review. Please let me know if anything needs to change.',
          "Hi team, here is a short summary of today's meeting. The next review is on Friday at 10 a.m. Best regards, Alex",
        ],
      },
      {
        id: 'm9-paragraphs',
        title: 'Short paragraphs',
        description: 'Short descriptive paragraphs.',
        objective: 'Type paragraphs at a steady pace.',
        durationMin: 8,
        instructions: ['Keep your rhythm across sentences. Do not pause at every full stop.'],
        exercises: () => [
          'The market opened early on Saturday. Farmers stacked crates of apples, pears and plums beside baskets of fresh bread. By nine o\'clock, the street was full of people.',
          'Evening settled over the harbor. Boats rocked gently on the water, and the lights along the pier flickered on one by one.',
        ],
      },
      {
        id: 'm9-professional',
        title: 'Professional writing',
        description: 'Formal tone and longer sentences.',
        objective: 'Type formal text with 92% accuracy.',
        durationMin: 8,
        minAccuracy: 92,
        instructions: ['Slow down for names, titles and numbers; accuracy matters more in professional writing.'],
        exercises: () => [
          'Our team is committed to delivering reliable results on schedule. We review every request carefully, communicate openly about progress, and welcome feedback so that each project improves on the last.',
          'Please find the quarterly summary attached. Revenue grew by 8 percent, customer satisfaction remained high, and three new initiatives are planned for the coming months.',
        ],
      },
      {
        id: 'm9-general',
        title: 'General knowledge passages',
        description: 'Facts about the world, typed as real prose.',
        objective: 'Finish the curriculum with confident, accurate typing.',
        durationMin: 9,
        instructions: ['This is your graduation lesson. Take your time and enjoy it.'],
        exercises: () => [
          "Water covers about seventy percent of the Earth's surface, and most of it is salty ocean.",
          'Light from the Sun takes about eight minutes to reach Earth, travelling at nearly three hundred thousand kilometres every second.',
          'The human heart beats about one hundred thousand times each day, pushing blood through a network of vessels that would stretch for thousands of miles.',
        ],
      },
    ],
  },
];

function build(): Module[] {
  let known = ' ';
  return MODULES.map((m, mi) => ({
    id: m.id,
    number: mi + 1,
    title: m.title,
    summary: m.summary,
    lessons: m.lessons.map((spec): Lesson => {
      const targetKeys = (spec.targetKeys ?? '').split('');
      known += targetKeys.join('');
      if (spec.teachesShift) known += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const allowed = m.unrestricted ? ALL_CHARS : known;
      const letters = [...new Set(known.split('').filter((c) => c >= 'a' && c <= 'z'))].join('');
      const rng = seeded(spec.id);
      const ctx: Ctx = {
        letters,
        rng,
        groups: (keys, n = 7) => groupLine(keys.split(''), rng, n),
        words: (lines = 1, perLine = 6) => wordsExercise(letters, rng, { lines, perLine }),
        wordsFocus: (focus, lines = 1, perLine = 6) => {
          const focusSet = new Set(focus.split(''));
          const pool = wordsUsing(letters, { min: 2, max: 7 }).filter((w) => [...w].some((c) => focusSet.has(c)));
          const out: string[] = [];
          for (let i = 0; i < lines; i++) {
            out.push(pool.length >= 6 ? wordLine(pool, rng, perLine) : groupLine(focus.split(''), rng, perLine));
          }
          return out.join(' ');
        },
        common: (lines = 1, perLine = 7) => {
          const out: string[] = [];
          for (let i = 0; i < lines; i++) out.push(wordLine(COMMON_WORDS, rng, perLine));
          return out.join(' ');
        },
      };
      const exercises = spec.exercises(ctx).map((e): Exercise => (typeof e === 'string' ? { text: e } : e));
      return {
        id: spec.id,
        moduleId: m.id,
        title: spec.title,
        description: spec.description,
        objective: spec.objective,
        durationMin: spec.durationMin,
        difficulty: m.difficulty,
        targetKeys,
        allowed,
        instructions: spec.instructions,
        explainer: spec.explainer,
        keyboardView: spec.keyboardView ?? 'default',
        exercises,
        minAccuracy: spec.minAccuracy ?? DEFAULT_MIN_ACCURACY,
        minWpm: spec.minWpm,
        xp: 20 + mi * 5,
      };
    }),
  }));
}

export const CURRICULUM: Module[] = build();
export const ALL_LESSONS: Lesson[] = CURRICULUM.flatMap((m) => m.lessons);
export const LESSON_BY_ID: Record<string, Lesson> = Object.fromEntries(ALL_LESSONS.map((l) => [l.id, l]));
export const MODULE_BY_ID: Record<string, Module> = Object.fromEntries(CURRICULUM.map((m) => [m.id, m]));

/** First lesson a learner of each starting level is pointed at. */
export const START_LESSON: Record<StartLevel, string> = {
  beginner: 'm1-keyboard',
  intermediate: 'm5-all',
  advanced: 'm7-slow',
};
