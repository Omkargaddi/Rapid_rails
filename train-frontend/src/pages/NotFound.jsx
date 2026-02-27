import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Home, ArrowLeft } from 'lucide-react';
import './NotFound.css'

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <>
      <div className="nf-root">
        <div className="nf-blob nf-blob-1" />
        <div className="nf-blob nf-blob-2" />
        <div className="nf-blob nf-blob-3" />

        <div className="nf-inner">
          {/* Animated compass */}
          <div className="nf-icon-wrap">
            <div className="nf-icon-glow" />
            <div className="nf-icon-circle">
              <Compass size={56} color="#f97316" style={{ animation: 'spin 6s linear infinite' }} />
            </div>
          </div>

          <div className="nf-404">404</div>

          <h1 className="nf-title">
            Route <span className="nf-title-accent">Not Found</span>
          </h1>

          <p className="nf-desc">
            The station or page you're looking for doesn't exist in our network.
            You may have taken a wrong turn or the link is broken.
          </p>

          <div className="nf-actions">
            <button onClick={() => navigate(-1)} className="nf-btn-secondary">
              <ArrowLeft size={18} /> Go Back
            </button>
            <button onClick={() => navigate('/')} className="nf-btn-primary">
              <Home size={18} /> Home Station
            </button>
          </div>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </>
  );
};

export default NotFound;