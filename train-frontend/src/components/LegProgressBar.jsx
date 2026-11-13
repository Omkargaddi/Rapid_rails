import React from 'react';
import { legColor } from '../utils/palette';
import { formatDuration } from '../utils/timeUtils';
import './LegProgressBar.css';

const LegProgressBar = ({ journey, height = 8, className = '' }) => {
  if (!journey || !journey.legs || journey.legs.length === 0) return null;

  const parts = [];
  journey.legs.forEach((leg, i) => {
    const legMinutes = Math.max(leg.arr_abs - leg.dep_abs, 1);
    parts.push({
      kind: 'leg',
      minutes: legMinutes,
      index: i,
      color: legColor(i),
      label: `Train #${leg.train_num} (${leg.from} → ${leg.to}): ${formatDuration(legMinutes)}`,
      trainNum: leg.train_num,
      from: leg.from,
      to: leg.to,
    });

    if (i < journey.legs.length - 1) {
      const wait = Math.max(journey.legs[i + 1].dep_abs - leg.arr_abs, 0);
      if (wait > 0) {
        parts.push({
          kind: 'wait',
          minutes: wait,
          index: i,
          label: `Transfer layover at ${leg.to}: ${formatDuration(wait)}`,
          station: leg.to,
        });
      }
    }
  });

  const totalMinutes = parts.reduce((acc, p) => acc + p.minutes, 0) || 1;

  return (
    <div
      className={`lpb-container ${className}`}
      style={{ height: `${height}px` }}
      role="img"
      aria-label="Trip timeline progress bar"
    >
      {parts.map((p, idx) => (
        <span
          key={idx}
          title={p.label}
          className={`lpb-segment ${p.kind === 'wait' ? 'lpb-wait' : 'lpb-leg'}`}
          style={{
            flexGrow: Math.max(p.minutes / totalMinutes, 0.04),
            background: p.kind === 'leg' ? p.color : undefined,
          }}
        />
      ))}
    </div>
  );
};

export default LegProgressBar;
