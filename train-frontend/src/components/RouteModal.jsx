import React from 'react';
import { X, Train, Clock } from 'lucide-react';
import { formatAbsToAMPM, formatDuration } from '../utils/timeUtils';
import { legColor } from '../utils/palette';
import LegProgressBar from './LegProgressBar';
import './RouteModal.css';

const RouteModal = ({ journey, onClose }) => {
  const firstLeg = journey.legs[0];
  const lastLeg = journey.legs[journey.legs.length - 1];

  return (
    <>
      <div className="rm-overlay" onClick={onClose}>
        <div className="rm-modal" onClick={(e) => e.stopPropagation()}>

          {/* HEADER */}
          <div className="rm-header">
            <div>
              <div className="rm-header-title">Journey Details</div>
              <div className="rm-header-sub">
                Total Duration: <span>{formatDuration(journey.total_duration)}</span>
              </div>
            </div>
            <button className="rm-close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <div className="rm-strip">
            <div className="rm-strip-header">
              <div className="rm-strip-stations">
                <span className="rm-stn-badge src">{firstLeg.from}</span>
                <span className="rm-stn-arrow">&rarr;</span>
                <span className="rm-stn-badge dst">{lastLeg.to}</span>
              </div>
              <div className="rm-strip-meta">
                <span>{journey.legs.length} train{journey.legs.length === 1 ? '' : 's'}</span>
                {journey.legs.length > 1 && (
                  <span> &middot; {journey.legs.length - 1} transfer{journey.legs.length === 2 ? '' : 's'}</span>
                )}
              </div>
            </div>

            <div className="rm-progress-wrap">
              <LegProgressBar journey={journey} height={10} />
            </div>

            <div className="rm-leg-pills">
              {journey.legs.map((leg, i) => (
                <div key={i} className="rm-leg-pill-chip">
                  <span className="rm-leg-pill-dot" style={{ background: legColor(i) }} />
                  <span className="rm-leg-pill-num">#{leg.train_num}</span>
                  <span className="rm-leg-pill-name">{leg.train_name}</span>
                  <span className="rm-leg-pill-time">({formatDuration(leg.arr_abs - leg.dep_abs)})</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rm-body">
            <div className="rm-legs">
              <div className="rm-legs-line" />
              {journey.legs.map((leg, idx) => {
                const waitTime = idx > 0 ? leg.dep_abs - journey.legs[idx - 1].arr_abs : 0;
                const color = legColor(idx);

                return (
                  <div key={idx} className="rm-leg-wrap">
                    <div className="rm-leg-node" style={{ borderColor: color }} />
                    {waitTime > 0 && (
                      <div className="rm-layover">
                        <Clock size={12} />
                        {formatDuration(waitTime)} layover at {leg.from}
                      </div>
                    )}
                    <div className="rm-leg-card">
                      <div className="rm-leg-top">
                        <div className="rm-leg-train-row">
                          <div
                            className="rm-leg-icon"
                            style={{
                              color,
                              background: `${color}14`,
                              borderColor: `${color}30`,
                            }}
                          >
                            <Train size={18} />
                          </div>
                          <div>
                            <div className="rm-leg-name">{leg.train_name}</div>
                            <div className="rm-leg-meta" style={{ color }}>
                              Train #{leg.train_num} &middot; {leg.train_type}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rm-leg-times">
                        <div className="rm-time-group">
                          <div className="rm-time-lbl">Departure</div>
                          <div className="rm-time-val">{formatAbsToAMPM(leg.dep_abs)}</div>
                          <div className="rm-time-stn">{leg.from}</div>
                        </div>
                        <div className="rm-time-group right">
                          <div className="rm-time-lbl">Arrival</div>
                          <div className="rm-time-val">{formatAbsToAMPM(leg.arr_abs)}</div>
                          <div className="rm-time-stn">{leg.to}</div>
                        </div>
                      </div>

                      {leg.classes_available?.length > 0 && (
                        <div className="rm-classes">
                          {leg.classes_available.map((c) => (
                            <span key={c} className="rm-class-chip">{c}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rm-footer">
            <span className="rm-footer-txt">End of Route</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default RouteModal;