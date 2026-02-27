import React from 'react';
import { X, Train, ExternalLink, Clock } from 'lucide-react';
import { formatAbsToAMPM, formatDuration } from '../utils/timeUtils';
import './RouteModal.css'

const RouteModal = ({ journey, onClose }) => {
  return (
    <>
      <div className="rm-overlay" onClick={onClose}>
        <div className="rm-modal" onClick={(e) => e.stopPropagation()}>

          {/* HEADER */}
          <div className="rm-header">
            <div>
              <div className="rm-header-title">Route Map</div>
              <div className="rm-header-sub">
                Total Journey: <span>{formatDuration(journey.total_duration)}</span>
              </div>
            </div>
            <button className="rm-close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <div className="rm-strip">
            <div className="rm-strip-line" />
            <div className="rm-strip-inner">
              {journey.legs.map((leg, i) => (
                <React.Fragment key={i}>
                  <div className="rm-strip-stop">
                    <div className={`rm-strip-dot ${i === 0 ? 'first' : 'mid'}`} />
                    <span className="rm-strip-label">{leg.from}</span>
                  </div>
                  {i === journey.legs.length - 1 && (
                    <div className="rm-strip-stop">
                      <div className="rm-strip-dot last" />
                      <span className="rm-strip-label">{leg.to}</span>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="rm-body">
            <div className="rm-legs">
              <div className="rm-legs-line" />
              {journey.legs.map((leg, idx) => {
                const waitTime = idx > 0 ? leg.dep_abs - journey.legs[idx - 1].arr_abs : 0;
                return (
                  <div key={idx} className="rm-leg-wrap">
                    <div className="rm-leg-node" />
                    {waitTime > 0 && (
                      <div className="rm-layover">
                        <Clock size={12} />
                        {formatDuration(waitTime)} layover at {leg.from}
                      </div>
                    )}
                    <div className="rm-leg-card">
                      <div className="rm-leg-top">
                        <div className="rm-leg-train-row">
                          <div className="rm-leg-icon"><Train size={18} /></div>
                          <div>
                            <div className="rm-leg-name">{leg.train_name}</div>
                            <div className="rm-leg-meta">Train #{leg.train_num} · {leg.train_type}</div>
                          </div>
                        </div>
                        <a href={leg.link} target="_blank" rel="noreferrer" className="rm-schedule-link">
                          Schedule <ExternalLink size={11} />
                        </a>
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
                          {leg.classes_available.map(c => (
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