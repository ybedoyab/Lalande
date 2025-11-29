/**
 * ISS Location Card Component
 * Displays current location of the International Space Station
 * Follows Single Responsibility Principle - only displays ISS location
 */

import { useISSLocation } from '../hooks/useISSLocation';

export const ISSLocationCard = () => {
  const { location, loading, error } = useISSLocation(5000); // Update every 5 seconds

  if (loading && !location) {
    return (
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <span className="loading loading-spinner loading-lg"></span>
          <p>Loading ISS location...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <div className="alert alert-error">
            <span>Error: {error}</span>
            <button
              className="btn btn-sm btn-outline ml-2"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!location) {
    return null;
  }

  const { iss_position, timestamp } = location;
  const date = new Date(timestamp * 1000);

  return (
    <div className="card bg-base-200 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">
          <span className="text-2xl">🛰️</span>
          International Space Station
        </h2>
        <p className="text-sm opacity-70 mb-4">Current location in real-time</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Coordinates */}
          <div className="stat bg-base-300 rounded-lg p-4">
            <div className="stat-title flex items-center gap-2">
              📍 Coordinates
            </div>
            <div className="stat-value text-xl">
              {parseFloat(iss_position.latitude).toFixed(4)}°N
            </div>
            <div className="stat-desc">
              {parseFloat(iss_position.longitude).toFixed(4)}°E
            </div>
          </div>

          {/* Speed indicator */}
          <div className="stat bg-base-300 rounded-lg p-4">
            <div className="stat-title flex items-center gap-2">
              🌍 Orbital Speed
            </div>
            <div className="stat-value text-xl">
              ~28,000 km/h
            </div>
            <div className="stat-desc">
              Low Earth Orbit
            </div>
          </div>
        </div>

        {/* Last update time */}
        <div className="mt-4 flex items-center gap-2 text-sm opacity-70">
          🕐
          <span>Last updated: {date.toLocaleTimeString()}</span>
        </div>

        <div className="card-actions justify-end mt-4">
          <div className="text-xs opacity-50">
            Data from Open Notify API • Updates every 5 seconds
          </div>
        </div>
      </div>
    </div>
  );
};

