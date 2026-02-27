import React from 'react';
import './TimePicker.css'

const TimePicker = ({ label, value, onChange }) => {
  const [h, m] = value.split(':').map(Number);
  const hour = h % 12 || 12;
  const minute = m;
  const isPM = h >= 12;

  const handleUpdate = (newHour, newMin, newPM) => {
    let finalHour = parseInt(newHour) % 12;
    if (newPM) finalHour += 12;
    onChange(`${String(finalHour).padStart(2, '0')}:${String(parseInt(newMin)).padStart(2, '0')}`);
  };

  return (
    <>
    <div className="tp-wrap">
        <label className="tp-label">{label}</label>
        <div className="tp-control">
          <input type="number" min="1" max="12" value={hour}
            onChange={(e) => handleUpdate(e.target.value, minute, isPM)}
            className="tp-num"
          />
          <span className="tp-colon">:</span>
          <input type="number" min="0" max="59" value={String(minute).padStart(2, '0')}
            onChange={(e) => handleUpdate(hour, e.target.value, isPM)}
            className="tp-num"
          />
          <button onClick={() => handleUpdate(hour, minute, !isPM)} className={`tp-ampm ${isPM ? 'pm' : 'am'}`}>
            {isPM ? 'PM' : 'AM'}
          </button>
        </div>
      </div>
    </>
  );
};

export default TimePicker;