import { useRef, useState, type ReactNode } from 'react';
import { Download, Trash2, Upload } from 'lucide-react';
import { Dialog, PageHeader, Segmented, Switch } from '../components/ui/ui';
import { LAYOUT_OPTIONS } from '../data/keyboard';
import { ALL_LESSONS } from '../data/curriculum';
import { useProgress } from '../hooks/useProgress';
import { toDateKey } from '../lib/dates';
import { validateImport } from '../lib/validation';
import type { AppState, DailyGoal, ErrorStyle, LayoutId, TestDuration, Theme, TypingDifficulty } from '../types';

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

function Row({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-t border-line py-4 first:border-t-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="max-w-md">
        <p className="font-medium">{title}</p>
        {description ? <p className="mt-0.5 text-sm text-mute">{description}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card px-5 py-2" aria-label={title}>
      <h2 className="label border-b border-line py-3">{title}</h2>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const { state, updateSettings, exportJson, importState, resetProgress, persistent } = useProgress();
  const { settings } = state;
  const fileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ state: AppState; exportedAt: string | null; issues: string[] } | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetAll, setResetAll] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const download = () => {
    const blob = new Blob([exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `typezero-progress-${toDateKey()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('Export downloaded.');
  };

  const onFile = async (file: File | undefined) => {
    setImportError(null);
    setMessage(null);
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setImportError('That file is too large to be a TypeZero export (limit 5 MB).');
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      setImportError('That file is not valid JSON, so it cannot be a TypeZero export.');
      return;
    }
    const result = validateImport(parsed);
    if (!result.ok) {
      setImportError(result.error);
      return;
    }
    setPending({ state: result.state, exportedAt: result.exportedAt, issues: result.issues });
  };

  const confirmImport = () => {
    if (!pending) return;
    importState(pending.state);
    setPending(null);
    setMessage('Progress imported.');
    if (fileRef.current) fileRef.current.value = '';
  };

  const confirmReset = () => {
    resetProgress(resetAll);
    setResetOpen(false);
    setMessage(resetAll ? 'All data was erased.' : 'Learning progress was reset. Your settings were kept.');
  };

  const completed = ALL_LESSONS.filter((l) => state.lessons[l.id]?.completed).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Changes are saved to this browser immediately." />

      <Section title="Appearance">
        <Row title="Theme" description="Dark is the default.">
          <Segmented<Theme>
            label="Theme"
            value={settings.theme}
            options={[
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
            ]}
            onChange={(theme) => updateSettings({ theme })}
          />
        </Row>
        <Row title="Reduce motion" description="Turns off transitions and animations. Follows your system setting by default.">
          <Switch checked={settings.reducedMotion} onChange={(reducedMotion) => updateSettings({ reducedMotion })} label="Reduce motion" />
        </Row>
      </Section>

      <Section title="Typing">
        <Row
          title="Typing difficulty"
          description="Easy: the cursor waits until you press the right key. Medium: mistakes move on and Backspace works. Hard: no Backspace."
        >
          <Segmented<TypingDifficulty>
            label="Typing difficulty"
            value={settings.difficulty}
            options={[
              { value: 'easy', label: 'Easy' },
              { value: 'medium', label: 'Medium' },
              { value: 'hard', label: 'Hard' },
            ]}
            onChange={(difficulty) => updateSettings({ difficulty })}
          />
        </Row>
        <Row title="Error highlighting" description="Mistakes are always underlined. Highlight adds a background.">
          <Segmented<ErrorStyle>
            label="Error highlighting"
            value={settings.errorStyle}
            options={[
              { value: 'underline', label: 'Underline' },
              { value: 'highlight', label: 'Highlight' },
            ]}
            onChange={(errorStyle) => updateSettings({ errorStyle })}
          />
        </Row>
        <Row title="Finger guidance" description="Show which finger to use and colour the keyboard by hand.">
          <Switch checked={settings.fingerGuidance} onChange={(fingerGuidance) => updateSettings({ fingerGuidance })} label="Finger guidance" />
        </Row>
        <Row title="Sound effects" description="A quiet click for correct keys and a low tone for mistakes.">
          <Switch checked={settings.sound} onChange={(sound) => updateSettings({ sound })} label="Sound effects" />
        </Row>
        <Row title="Keyboard layout" description="More layouts can be added in the future.">
          <select
            aria-label="Keyboard layout"
            value={settings.layout}
            onChange={(e) => updateSettings({ layout: e.target.value as LayoutId })}
            className="rounded-xl border border-line bg-surface px-3 py-2 text-sm"
          >
            {LAYOUT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id} disabled={!o.available}>
                {o.name}
              </option>
            ))}
          </select>
        </Row>
      </Section>

      <Section title="Goals">
        <Row title="Daily practice goal">
          <Segmented<DailyGoal>
            label="Daily practice goal"
            value={settings.dailyGoalMinutes}
            options={([5, 10, 15, 20] as DailyGoal[]).map((m) => ({ value: m, label: `${m} min` }))}
            onChange={(dailyGoalMinutes) => updateSettings({ dailyGoalMinutes })}
          />
        </Row>
        <Row title="Preferred test duration">
          <Segmented<TestDuration>
            label="Preferred test duration"
            value={settings.testDuration}
            options={([15, 30, 60, 120] as TestDuration[]).map((s) => ({ value: s, label: `${s}s` }))}
            onChange={(testDuration) => updateSettings({ testDuration })}
          />
        </Row>
      </Section>

      <Section title="Learning path">
        <Row title="Unlock all lessons" description="Skip the prerequisites and open every lesson. Lessons still need to be completed to count.">
          <Switch checked={settings.unlockAllLessons} onChange={(unlockAllLessons) => updateSettings({ unlockAllLessons })} label="Unlock all lessons" />
        </Row>
        <Row title="Reset learning progress" description={`You have completed ${completed} of ${ALL_LESSONS.length} lessons.`}>
          <button type="button" className="btn btn-secondary text-bad" onClick={() => setResetOpen(true)}>
            <Trash2 size={16} aria-hidden="true" />
            Reset…
          </button>
        </Row>
      </Section>

      <Section title="Your data">
        <Row
          title="Export progress"
          description="Download a JSON file with your settings, lessons, sessions, XP, achievements and daily activity."
        >
          <button type="button" className="btn btn-secondary" onClick={download}>
            <Download size={16} aria-hidden="true" />
            Export
          </button>
        </Row>
        <Row title="Import progress" description="Load a file exported from TypeZero. It will replace your current progress, after you confirm.">
          <div>
            <input
              ref={fileRef}
              id="import-file"
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
            <label htmlFor="import-file" className="btn btn-secondary cursor-pointer focus-within:outline">
              <Upload size={16} aria-hidden="true" />
              Choose file…
            </label>
          </div>
        </Row>
        <div className="space-y-2 border-t border-line py-4 text-sm text-mute">
          {importError ? (
            <p role="alert" className="font-medium text-bad">
              {importError}
            </p>
          ) : null}
          {message ? <p role="status">{message}</p> : null}
          <p>
            All data lives only in this browser ({persistent ? 'saving works' : 'saving is currently unavailable'}). There is no account and nothing is synced between devices, so use Export to
            back up or move your progress. The most recent 500 sessions are kept in detail; lifetime totals, best scores, key statistics and daily activity are kept beyond that.
          </p>
        </div>
      </Section>

      <Dialog
        open={resetOpen}
        title="Reset your progress?"
        onClose={() => setResetOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-secondary" data-autofocus onClick={() => setResetOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger" onClick={confirmReset}>
              {resetAll ? 'Erase everything' : 'Reset progress'}
            </button>
          </>
        }
      >
        <p>This permanently deletes from this browser:</p>
        <ul className="list-disc pl-5">
          <li>Lesson progress ({completed} lessons completed)</li>
          <li>Your session history and statistics</li>
          <li>XP, level, achievements, streak and daily activity</li>
        </ul>
        <label className="flex items-start gap-2 pt-1">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[rgb(var(--c-bad))]" checked={resetAll} onChange={(e) => setResetAll(e.target.checked)} />
          <span>Also erase my settings and start onboarding again.</span>
        </label>
        <p>This cannot be undone. Export your data first if you want a copy.</p>
      </Dialog>

      <Dialog
        open={pending !== null}
        title="Replace your progress with this file?"
        onClose={() => setPending(null)}
        footer={
          <>
            <button type="button" className="btn btn-secondary" data-autofocus onClick={() => setPending(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger" onClick={confirmImport}>
              Replace my progress
            </button>
          </>
        }
      >
        {pending ? (
          <>
            <p>
              This file contains {pending.state.sessions.length} sessions, {pending.state.xp.total} XP and{' '}
              {Object.values(pending.state.lessons).filter((l) => l.completed).length} completed lessons
              {pending.exportedAt ? ` (exported ${new Date(pending.exportedAt).toLocaleDateString()})` : ''}.
            </p>
            <p>Importing replaces all of your current progress and settings. It cannot be undone, so export your current data first if you might want it.</p>
            {pending.issues.length > 0 ? <p>Some invalid values in the file were ignored: {pending.issues.join(', ')}.</p> : null}
          </>
        ) : null}
      </Dialog>
    </div>
  );
}
