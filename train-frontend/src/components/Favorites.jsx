import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Loader2, Train, Star } from 'lucide-react';
import JourneyCard from '../components/JourneyCard';
import api from '../api/axios';

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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <nav className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-40">
        <button 
          onClick={() => navigate('/')} 
          className="p-2 hover:bg-slate-50 rounded-full transition-colors"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <Star size={20} className="text-yellow-500 fill-yellow-500" /> Saved Journeys
        </h1>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-12">
        <div className="mb-8">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Your Journeys</h2>
          <div className="h-1 w-12 bg-blue-600 rounded-full mt-1"></div>
          <p className="text-sm text-slate-500 font-medium mt-2">
            You have {favorites.length} saved route{favorites.length !== 1 ? 's' : ''} out of 10.
          </p>
        </div>

        {favorites.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
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
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm text-center px-6">
            <div className="p-6 bg-slate-50 rounded-full text-slate-300 mb-6">
              <Train size={64} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">No Journeys Saved yet</h3>
            <p className="text-slate-500 max-w-xs mb-8">Save the routes you take most often for quick access here.</p>
            <button 
              onClick={() => navigate('/')}
              className="bg-[#074287] text-white px-8 py-3 rounded-2xl font-bold hover:bg-[#06356d] transition-all"
            >
              Search Journeys
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Favorites;