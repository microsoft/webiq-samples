// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { useCallback, useEffect, useRef, useState } from 'react';

/** Reloj de reproducción en ms "de guion" (escalado por la velocidad). */
export function usePlayback(total: number, speed: number, resetKey: string, autoplay: boolean, initialSeek?: number | 'end') {
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const speedRef = useRef(speed);
  speedRef.current = speed;
  // La posición inicial (enlace profundo) solo aplica a la primera clave; es idempotente con StrictMode.
  const firstKey = useRef<string | null>(initialSeek !== undefined ? resetKey : null);

  useEffect(() => {
    if (firstKey.current === resetKey && initialSeek !== undefined) {
      setElapsed(initialSeek === 'end' ? total : Math.max(0, Math.min(total, initialSeek)));
      setPlaying(false);
      return;
    }
    firstKey.current = null;
    setElapsed(0);
    setPlaying(autoplay);
  }, [resetKey, autoplay, initialSeek, total]);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      setElapsed((e) => {
        const next = e + dt * speedRef.current;
        if (next >= total) {
          setPlaying(false);
          return total;
        }
        return next;
      });
    }, 50);
    return () => window.clearInterval(id);
  }, [playing, total]);

  const play = useCallback(() => {
    setElapsed((e) => (e >= total ? 0 : e));
    setPlaying(true);
  }, [total]);
  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => {
    setPlaying((p) => {
      if (!p) setElapsed((e) => (e >= total ? 0 : e));
      return !p;
    });
  }, [total]);
  const restart = useCallback(() => {
    setElapsed(0);
    setPlaying(true);
  }, []);
  const skip = useCallback(() => {
    setElapsed(total);
    setPlaying(false);
  }, [total]);
  const seek = useCallback(
    (t: number) => {
      setElapsed(Math.max(0, Math.min(total, t)));
      setPlaying(false);
    },
    [total],
  );

  return { elapsed, playing, done: elapsed >= total, play, pause, toggle, restart, skip, seek };
}
