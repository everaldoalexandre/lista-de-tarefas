'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, TimerIcon2 } from './Lucide';
import { toast } from 'sonner';

export default function TimerCard({ projectId }: { projectId: string }) {
  const FOCUS_SECONDS = 25 * 60;
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_SECONDS);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  useEffect(() => {
    if (secondsLeft > 0 || !running) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fim do ciclo do timer
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    logMinutes(25);
    setSecondsLeft(FOCUS_SECONDS);
    toast.success('Focus session complete! 25 minutes logged.');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, running]);

  async function logMinutes(minutes: number) {
    try {
      await fetch('/api/timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes, projectId }),
      });
      window.dispatchEvent(new CustomEvent('time-logged'));
    } catch {
      toast.error('Could not log the time.');
    }
  }

  function stopAndLog() {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    const elapsedMinutes = Math.floor((FOCUS_SECONDS - secondsLeft) / 60);
    if (elapsedMinutes >= 1) {
      logMinutes(elapsedMinutes);
      toast.success(`${elapsedMinutes} minute(s) logged.`);
    }
    setSecondsLeft(FOCUS_SECONDS);
  }

  const mm = String(Math.max(0, Math.floor(secondsLeft / 60))).padStart(2, '0');
  const ss = String(Math.max(0, secondsLeft % 60)).padStart(2, '0');

  return (
    <div className="w-full flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
      <TimerIcon2 />
      <span className="text-2xl font-bold tabular-nums text-foreground">{mm}:{ss}</span>
      <div className="flex gap-2 ml-auto">
        <button
          type="button"
          onClick={() => setRunning(!running)}
          aria-label={running ? 'Pause' : 'Start'}
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1"
        >
          {running ? <Pause className="size-4" /> : <Play className="size-4" />}
          {running ? 'Pause' : 'Start'}
        </button>
        <button
          type="button"
          onClick={stopAndLog}
          aria-label="Reset and log elapsed time"
          title="Log elapsed time and reset"
          className="bg-accent text-accent-foreground hover:bg-accent/80 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
        >
          <RotateCcw className="size-4" />
          Log
        </button>
      </div>
    </div>
  );
}
