import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Train, Star } from 'lucide-react';
import JourneyCard from '../components/JourneyCard';
import api from '../api/axios';
import './Favorites.css'
import './Loader.css'

const Favorites = () => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const response = await api.get('/favorites');
        setFavorites(response.data);
      } catch (err) {
        console.error("Failed to fetch Saved Journeys", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFavorites();
  }, []);

  const handleFavToggle = (hash, isAdded) => {
    if (!isAdded) {
      setFavorites(prev => prev.filter(item => item.hash !== hash));
    }
  };

  if (loading) {
    return (
      <>
        <div className="fav-loading">
          <div className="fav-spinner" />
          <span className="fav-loading-txt">Loading your journeys…</span>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="fav-root">

        {/* NAV */}
        <nav className="fav-nav">
          <button className="fav-back-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={18} />
          </button>
          <h1 className="fav-nav-title">
            <Star size={19} fill="#fbbf24" color="#f59e0b" />
            Saved Journeys
          </h1>
        </nav>

        <div className="fav-hero">
          <div className="fav-hero-inner">
            <div className="fav-accent-line" />
            <h2 className="fav-hero-title">Your Journeys</h2>
            <div className="fav-hero-sub">
              <span className="fav-count-badge">
                ● {favorites.length}/10 saved
              </span>
              {favorites.length > 0
                ? `You have ${favorites.length} saved route${favorites.length !== 1 ? 's' : ''}.`
                : 'No saved routes yet.'}
            </div>
          </div>
        </div>

        <main className="fav-main">
          {favorites.length > 0 ? (
            <div className="fav-grid">
              {favorites.map((j) => (
                <JourneyCard
                  key={j.hash}
                  journey={j}
                  isInitiallyStarred={true}
                  currentFavCount={favorites.length}
                  onFavToggle={handleFavToggle}
                />
              ))}
            </div>
          ) : (
            <div className="fav-empty">
              <div className="fav-empty-icon">
                <Train size={44} color="#f97316" />
              </div>
              <h3 className="fav-empty-title">No Journeys Saved Yet</h3>
              <p className="fav-empty-desc">
                Save routes you travel most often for quick access right here.
              </p>
              <button className="fav-search-btn" onClick={() => navigate('/')}>
                Search Journeys
              </button>
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default Favorites;