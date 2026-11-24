// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { readStored, writeStored } from '../lib/storage';

const KEY = 'webiq-demo-split';

export function SplitPane({ top, bottom }: { top: ReactNode; bottom: ReactNode }) {
  const [ratio, setRatio] = useState<number>(() => {
    const v = Number(readStored(KEY));
    return v >= 0.25 && v <= 0.75 ? v : 0.5;
  });
  const box = useRef<HTMLDivElement>(null);
  const set = useCallback((r: number) => {
    const v = Math.min(0.75, Math.max(0.25, r));
    setRatio(v);
    writeStored(KEY, String(v));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    const el = box.current;
    if (!el) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = el.getBoundingClientRect();
    const move = (ev: PointerEvent) => set((ev.clientY - rect.top) / rect.height);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div className="split" ref={box} style={{ gridTemplateRows: `${ratio}fr 10px ${1 - ratio}fr` }}>
      <div className="split-pane">{top}</div>
      <div
        className="split-handle"
        role="separator"
        aria-orientation="horizontal"
        aria-valuemin={25}
        aria-valuemax={75}
        aria-valuenow={Math.round(ratio * 100)}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onDoubleClick={() => set(0.5)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') set(ratio - 0.05);
          if (e.key === 'ArrowDown') set(ratio + 0.05);
        }}
      >
        <span />
      </div>
      <div className="split-pane">{bottom}</div>
    </div>
  );
}
