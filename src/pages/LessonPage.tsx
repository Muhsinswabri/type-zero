import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Lock, RotateCcw, SearchX, XCircle } from 'lucide-react';
import KeyExplorer from '../components/lessons/KeyExplorer';
import ResultSummary from '../components/typing/ResultSummary';
import TypingPane from '../components/typing/TypingPane';
import { EmptyState } from '../components/ui/ui';
import { ALL_LESSONS, MODULE_BY_ID, type Lesson } from '../data/curriculum';
import { useProgress } from '../hooks/useProgress';
import { useTypingEngine } from '../hooks/useTypingEngine';
import {
  aggregateAttempt,
  evaluateAttempt,
  isCompleted,
  isLessonUnlocked,
  lessonById,
  nextLesson,
  type AttemptFailure,
  type ExerciseResult,
} from '../lib/progression';
import { sessionFromAttempt } from '../lib/sessionBuilder';
import { elapsedOf, isComplete, uncorrectedErrors, type EngineState } from '../lib/typingEngine';
import type { RewardSummary } from '../types';

export default function LessonPage() {
  const { lessonId } = useParams();
  const { state } = useProgress();
  const lesson = lessonById(lessonId);

  if (!lesson) {
    return (
      <EmptyState
        icon={<SearchX size={36} />}
        title="Lesson not found"
        action={
          <Link to="/learn" className="btn btn-primary">
            Back to lessons
          </Link>
        }
      >
        We could not find that lesson. It may have been renamed. Your progress is safe.
      </EmptyState>
    );
  }

  if (!isLessonUnlocked(state, lesson.id)) {
    const idx = ALL_LESSONS.findIndex((l) => l.id === lesson.id);
    const prev = ALL_LESSONS[idx - 1];
    return (
      <EmptyState
        icon={<Lock size={36} />}
        title="This lesson is locked"
        action={
          <Link to={prev ? `/learn/${prev.id}` : '/learn'} className="btn btn-primary">
            {prev ? `Go to “${prev.title}”` : 'Back to lessons'}
          </Link>
        }
      >
        Complete the previous lesson first. If you want to skip ahead, you can unlock every lesson in Settings.
      </EmptyState>
    );
  }

  return <LessonRunner key={lesson.id} lesson={lesson} />;
}

type Phase = 'intro' | 'exercise' | 'summary';

function LessonRunner({ lesson }: { lesson: Lesson }) {
  const { state, recordActivity } = useProgress();
  const module = MODULE_BY_ID[lesson.moduleId];
  const [phase, setPhase] = useState<Phase>('intro');
  const [attempt, setAttempt] = useState(0);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [startedAt, setStartedAt] = useState(0);
  const [reward, setReward] = useState<RewardSummary | null>(null);
  const [wasCompleted, setWasCompleted] = useState(false);
  const recorded = useRef<string | null>(null);

  const progress = state.lessons[lesson.id];
  const evaluation = useMemo(() => (phase === 'summary' ? evaluateAttempt(lesson, results) : null), [phase, lesson, results]);

  const start = () => {
    setWasCompleted(isCompleted(state, lesson.id));
    setStartedAt(Date.now());
    setResults([]);
    setIndex(0);
    setReward(null);
    setAttempt((a) => a + 1);
    setPhase('exercise');
  };

  const onExerciseDone = (result: ExerciseResult) => {
    const all = [...results, result];
    setResults(all);
    if (!result.completed || index + 1 >= lesson.exercises.length) setPhase('summary');
    else setIndex(index + 1);
  };

  // Save the finished attempt exactly once.
  useEffect(() => {
    if (phase !== 'summary' || !evaluation) return;
    const key = `${attempt}`;
    if (recorded.current === key) return;
    recorded.current = key;
    const summary = aggregateAttempt(results);
    if (summary.metrics.typed === 0) return;
    const session = sessionFromAttempt(lesson.id, lesson.title, startedAt, summary);
    setReward(recordActivity({ session, lesson: { id: lesson.id, passed: evaluation.passed, xp: lesson.xp } }));
  }, [phase, evaluation, attempt, results, lesson, startedAt, recordActivity]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/learn" className="btn btn-ghost !px-2">
          <ArrowLeft size={16} aria-hidden="true" />
          All lessons
        </Link>
        <p className="text-sm text-mute">
          Module {module.number} · {module.title}
        </p>
      </div>

      {phase === 'intro' ? (
        <Intro lesson={lesson} onStart={start} attempts={progress?.attempts ?? 0} bestAccuracy={progress?.bestAccuracy ?? 0} completed={isCompleted(state, lesson.id)} />
      ) : null}

      {phase === 'exercise' ? (
        <>
          <header className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">{lesson.title}</h1>
              <p className="text-sm text-mute">{lesson.exercises[index].label ?? lesson.instructions[0]}</p>
            </div>
            <p className="text-sm font-semibold" aria-live="polite">
              Exercise {index + 1} of {lesson.exercises.length}
            </p>
          </header>
          <ExerciseRunner key={`${attempt}-${index}`} lesson={lesson} index={index} last={index + 1 >= lesson.exercises.length} onDone={onExerciseDone} />
        </>
      ) : null}

      {phase === 'summary' && evaluation ? (
        <Summary
          lesson={lesson}
          passed={evaluation.passed}
          reasons={evaluation.reasons}
          metrics={evaluation.metrics}
          reward={reward}
          replay={wasCompleted}
          onRetry={start}
        />
      ) : null}
    </div>
  );
}

function Intro({
  lesson,
  onStart,
  attempts,
  bestAccuracy,
  completed,
}: {
  lesson: Lesson;
  onStart: () => void;
  attempts: number;
  bestAccuracy: number;
  completed: boolean;
}) {
  const { state } = useProgress();
  const target = useMemo(() => new Set(lesson.targetKeys), [lesson]);
  const enabled = useMemo(() => new Set(lesson.allowed.split('')), [lesson]);
  const explorer = lesson.keyboardView !== 'default';

  return (
    <div className="space-y-6">
      <header>
        <p className="label">Lesson</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{lesson.title}</h1>
        <p className="mt-2 text-mute">{lesson.description}</p>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="chip">
            <Clock size={12} aria-hidden="true" />
            {lesson.durationMin} min
          </span>
          <span className="chip capitalize">{lesson.difficulty}</span>
          <span className="chip">{lesson.xp} XP</span>
          {completed ? (
            <span className="chip text-good">
              <CheckCircle2 size={12} aria-hidden="true" />
              Completed · best {Math.round(bestAccuracy)}%
            </span>
          ) : attempts > 0 ? (
            <span className="chip">{attempts} attempt{attempts === 1 ? '' : 's'} so far</span>
          ) : null}
        </p>
      </header>

      <section className="card space-y-3 p-5" aria-labelledby="objective">
        <h2 id="objective" className="font-bold">
          Goal
        </h2>
        <p className="text-sm text-mute">{lesson.objective}</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-mute">
          {lesson.instructions.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
        <p className="border-t border-line pt-3 text-sm text-mute">
          To complete this lesson: finish all {lesson.exercises.length} exercises with at least{' '}
          <strong className="text-ink">{lesson.minAccuracy}% accuracy</strong>
          {lesson.minWpm ? (
            <>
              {' '}
              and at least <strong className="text-ink">{lesson.minWpm} WPM</strong>
            </>
          ) : null}
          . You can retry as often as you like.
        </p>
      </section>

      {lesson.explainer ? (
        <section className="grid gap-3 sm:grid-cols-2" aria-label="Explanation">
          {lesson.explainer.map((s) => (
            <div key={s.heading} className="card p-4">
              <h3 className="font-semibold">{s.heading}</h3>
              <p className="mt-1 text-sm text-mute">{s.body}</p>
            </div>
          ))}
        </section>
      ) : null}

      <section aria-label="Keyboard preview" className="space-y-2">
        <h2 className="font-bold">{explorer ? 'Explore the keyboard' : 'Keys for this lesson'}</h2>
        <KeyExplorer
          layoutId={state.settings.layout}
          colorMode={lesson.keyboardView === 'zones' ? 'finger' : state.settings.fingerGuidance ? 'hand' : 'none'}
          highlightChars={target}
          enabledChars={explorer ? null : enabled}
        />
      </section>

      <button type="button" className="btn btn-primary !px-6 !py-3" onClick={onStart}>
        {attempts > 0 ? 'Start again' : 'Start lesson'}
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

function toResult(s: EngineState): ExerciseResult {
  return {
    typed: s.typed,
    correct: s.correct,
    uncorrected: uncorrectedErrors(s),
    elapsedMs: elapsedOf(s, s.endedAt ?? 0),
    completed: isComplete(s),
    keyErrors: s.keyErrors,
    keyTotals: s.keyTotals,
  };
}

function ExerciseRunner({ lesson, index, last, onDone }: { lesson: Lesson; index: number; last: boolean; onDone: (r: ExerciseResult) => void }) {
  const { state } = useProgress();
  const { settings } = state;
  const exercise = lesson.exercises[index];
  const difficulty = settings.difficulty;
  const engine = useTypingEngine(exercise.text, {
    allowBackspace: difficulty !== 'hard',
    stopOnError: difficulty === 'easy',
    limitMs: exercise.limitSec ? exercise.limitSec * 1000 : null,
  });
  const target = useMemo(() => new Set(lesson.targetKeys), [lesson]);
  const enabled = useMemo(() => new Set(lesson.allowed.split('')), [lesson]);
  const finished = engine.state.status === 'finished';
  const result = useMemo(() => (finished ? toResult(engine.state) : null), [finished, engine.state]);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (finished) button.current?.focus();
  }, [finished]);

  return (
    <TypingPane
      engine={engine}
      settings={settings}
      clock={exercise.limitSec ? 'remaining' : 'elapsed'}
      enabledChars={lesson.allowed.length >= 95 ? null : enabled}
      highlightChars={target}
      lines={2}
      hideKeyboard={false}
    >
      {finished && result ? (
        <div className="card flex flex-wrap items-center justify-between gap-3 p-4" role="group" aria-label="Exercise finished">
          <div>
            <p className="font-semibold">
              {result.completed ? 'Exercise complete' : 'Time is up'}
            </p>
            <p className="text-sm text-mute">
              {Math.round(engine.metrics.accuracy)}% accuracy · {Math.round(engine.metrics.netWpm)} WPM · {engine.metrics.incorrect} mistake
              {engine.metrics.incorrect === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => engine.restart()}>
              <RotateCcw size={16} aria-hidden="true" />
              Redo
            </button>
            <button ref={button} type="button" className="btn btn-primary" onClick={() => onDone(result)}>
              {last || !result.completed ? 'See results' : 'Next exercise'}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </TypingPane>
  );
}

const REASON_TEXT: Record<AttemptFailure, (l: Lesson, accuracy: number, wpm: number) => string> = {
  exercises: () => 'Not every exercise was attempted.',
  incomplete: () => 'An exercise was not finished (for example, time ran out).',
  accuracy: (l, accuracy) => `Accuracy was ${Math.round(accuracy * 10) / 10}%, below the required ${l.minAccuracy}%.`,
  speed: (l, _a, wpm) => `Speed was ${Math.round(wpm * 10) / 10} WPM, below the required ${l.minWpm} WPM.`,
};

function Summary({
  lesson,
  passed,
  reasons,
  metrics,
  reward,
  replay,
  onRetry,
}: {
  lesson: Lesson;
  passed: boolean;
  reasons: AttemptFailure[];
  metrics: ReturnType<typeof aggregateAttempt>['metrics'];
  reward: RewardSummary | null;
  replay: boolean;
  onRetry: () => void;
}) {
  const { state } = useProgress();
  const next = nextLesson(lesson.id);
  const nextOpen = next ? isLessonUnlocked(state, next.id) : false;

  return (
    <div className="space-y-5">
      <div className={`card flex items-start gap-3 p-5 ${passed ? '!border-good' : '!border-bad'}`} role="status">
        {passed ? (
          <CheckCircle2 size={28} className="shrink-0 text-good" aria-hidden="true" />
        ) : (
          <XCircle size={28} className="shrink-0 text-bad" aria-hidden="true" />
        )}
        <div>
          <h1 className="text-2xl font-bold">{passed ? (replay ? 'Nice replay!' : 'Lesson complete!') : 'Not quite yet'}</h1>
          {passed ? (
            <p className="mt-1 text-mute">
              {replay ? 'XP for this lesson was already awarded, so replays are just for practice.' : 'The next lesson is now unlocked.'}
            </p>
          ) : (
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-mute">
              {reasons.map((r) => (
                <li key={r}>{REASON_TEXT[r](lesson, metrics.accuracy, metrics.netWpm)}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ResultSummary metrics={metrics} reward={reward} heading="Your attempt" />

      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          <RotateCcw size={16} aria-hidden="true" />
          {passed ? 'Replay lesson' : 'Try again'}
        </button>
        {passed && next && nextOpen ? (
          <Link to={`/learn/${next.id}`} className="btn btn-primary">
            Next: {next.title}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        ) : null}
        <Link to="/learn" className="btn btn-ghost">
          Back to lessons
        </Link>
      </div>
    </div>
  );
}
