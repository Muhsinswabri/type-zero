import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, Clock, Lock, PlayCircle } from 'lucide-react';
import { PageHeader, ProgressBar } from '../components/ui/ui';
import { CURRICULUM } from '../data/curriculum';
import { useProgress } from '../hooks/useProgress';
import { curriculumProgress, lessonStatus, moduleProgress, remainingMinutes, type LessonStatus } from '../lib/progression';

const STATUS_LABEL: Record<LessonStatus, string> = {
  completed: 'Completed',
  current: 'Up next',
  available: 'Available',
  locked: 'Locked',
};

function StatusIcon({ status }: { status: LessonStatus }) {
  const common = { size: 20, 'aria-hidden': true } as const;
  if (status === 'completed') return <CheckCircle2 {...common} className="text-good" />;
  if (status === 'current') return <PlayCircle {...common} className="text-accent" />;
  if (status === 'locked') return <Lock {...common} className="text-mute" />;
  return <Circle {...common} className="text-mute" />;
}

export default function LearnPage() {
  const { state } = useProgress();
  const overall = curriculumProgress(state);

  return (
    <div>
      <PageHeader
        title="Learn to type"
        subtitle="Work through the modules in order. Each lesson unlocks when the one before it is complete."
      />
      <div className="card mb-8 space-y-2 p-4">
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <span className="font-semibold">
            Curriculum: {overall.done} of {overall.total} lessons ({overall.percent}%)
          </span>
          <span className="text-mute">About {remainingMinutes(state)} minutes remaining</span>
        </div>
        <ProgressBar value={overall.percent} label="Overall curriculum completion" />
        {state.settings.unlockAllLessons ? (
          <p className="text-xs text-mute">All lessons are unlocked (Settings &rarr; Learning path).</p>
        ) : null}
      </div>

      <div className="space-y-8">
        {CURRICULUM.map((module) => {
          const mp = moduleProgress(state, module);
          return (
            <section key={module.id} aria-labelledby={`${module.id}-title`}>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="label">Module {module.number}</p>
                  <h2 id={`${module.id}-title`} className="text-xl font-bold">
                    {module.title}
                  </h2>
                  <p className="text-sm text-mute">{module.summary}</p>
                </div>
                <div className="w-40">
                  <p className="mb-1 text-right text-xs text-mute">
                    {mp.done}/{mp.total} · {mp.percent}%
                  </p>
                  <ProgressBar value={mp.percent} label={`${module.title} completion`} />
                </div>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {module.lessons.map((lesson) => {
                  const status = lessonStatus(state, lesson.id);
                  const progress = state.lessons[lesson.id];
                  const locked = status === 'locked';
                  const body = (
                    <>
                      <StatusIcon status={status} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold leading-snug">{lesson.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-sm text-mute">{lesson.description}</p>
                        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mute">
                          <span className="inline-flex items-center gap-1">
                            <Clock size={12} aria-hidden="true" />
                            {lesson.durationMin} min
                          </span>
                          <span>{lesson.xp} XP</span>
                          {progress && progress.attempts > 0 ? <span>Best {Math.round(progress.bestAccuracy)}%</span> : null}
                          <span className={status === 'current' ? 'font-semibold text-accent' : ''}>{STATUS_LABEL[status]}</span>
                        </p>
                      </div>
                    </>
                  );
                  return (
                    <li key={lesson.id}>
                      {locked ? (
                        <div className="card flex gap-3 p-4 opacity-60" aria-disabled="true">
                          {body}
                        </div>
                      ) : (
                        <Link
                          to={`/learn/${lesson.id}`}
                          className={`card flex gap-3 p-4 transition-colors hover:border-mute/60 ${status === 'current' ? '!border-accent' : ''}`}
                        >
                          {body}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
