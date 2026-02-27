import React, { useState, useEffect } from 'react';
import { Train, Clock, ChevronRight, Star } from 'lucide-react';
import { formatAbsToAMPM, formatDuration } from '../utils/timeUtils';
import RouteModal from './RouteModal';
import api from '../api/axios';
import { toast } from 'react-toastify';
import './JourneyCard.css'

const JourneyCard = ({ journey, isInitiallyStarred, currentFavCount, onFavToggle }) => {
  const [showModal, setShowModal] = useState(false);
  const [isStarred, setIsStarred] = useState(isInitiallyStarred);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsStarred(isInitiallyStarred);
  }, [isInitiallyStarred]);

  const firstLeg = journey.legs[0];
  const lastLeg = journey.legs[journey.legs.length - 1];
  const changes = journey.legs.length - 1;

  const toggleFavorite = async (e) => {
    e.stopPropagation();
    if (loading) return;
    if (!isStarred && currentFavCount >= 10) {
      toast.error("Favorite limit reached (Max 10).");
      return;
    }
    setLoading(true);
    try {
      if (isStarred) {
        await api.delete(`/fav-delete/${journey.hash}`);
        setIsStarred(false);
        onFavToggle(journey.hash, false);
        toast.info("Journey removed from favorites");
      } else {
        await api.post('/fav-add', journey);
        setIsStarred(true);
        onFavToggle(journey.hash, true);
        toast.success("Journey saved to favorites!");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to update Saved Journeys.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="jc-card" onClick={() => setShowModal(true)}>
    <div className="jc-top">
          <div className="jc-train-info">
            <div className="jc-train-icon"><Train size={22} /></div>
            <div>
              <div className="jc-train-name">{firstLeg.train_name}</div>
              <div className="jc-train-num">#{firstLeg.train_num}</div>
            </div>
          </div>

          <div className="jc-badges">
            <button
              className={`jc-star-btn ${isStarred ? 'starred' : ''}`}
              onClick={toggleFavorite}
              disabled={loading}
            >
              <Star
                size={19}
                fill={isStarred ? '#fbbf24' : 'none'}
                color={isStarred ? '#f59e0b' : '#d4c4b0'}
                className={loading ? 'animate-pulse' : ''}
              />
            </button>
            <span className={`jc-conn-badge ${changes === 0 ? 'direct' : 'connecting'}`}>
              {changes === 0 ? 'Direct' : `${changes} Conn.`}
            </span>
          </div>
        </div>
        <div className="jc-timeline">
          <div className="jc-time-block">
            <div className="jc-time">{formatAbsToAMPM(firstLeg.dep_abs)}</div>
            <div className="jc-station">{firstLeg.from}</div>
          </div>

          <div className="jc-mid">
            <div className="jc-duration-pill">{formatDuration(journey.total_duration)}</div>
            <div className="jc-track">
              <div className="jc-track-dot start" />
              <div className="jc-track-dot end" />
              {changes > 0 && <div className="jc-track-dot mid" />}
            </div>
          </div>

          <div className="jc-time-block right">
            <div className="jc-time">{formatAbsToAMPM(lastLeg.arr_abs)}</div>
            <div className="jc-station">{lastLeg.to}</div>
          </div>
        </div>
      <div className="jc-footer">
          <div className="jc-waits">
            {journey.legs.slice(1).map((leg, i) => (
              <div key={i} className="jc-wait-chip">
                <Clock size={11} />
                Wait {formatDuration(leg.dep_abs - journey.legs[i].arr_abs)} at {leg.from}
              </div>
            ))}
          </div>
          <button className="jc-details-btn">
            View Details <ChevronRight size={14} />
          </button>
        </div>
      </div>
      {showModal && <RouteModal journey={journey} onClose={() => setShowModal(false)} />}
    </>
  );
};

export default JourneyCard;