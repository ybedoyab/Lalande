/**
 * ISS Astronauts Card Component
 * Displays current astronauts on the ISS
 * Follows Single Responsibility Principle - only displays astronaut information
 */

import { useState, useEffect } from 'react';
import { issService } from '../services/iss.service';
import type { ISSAstronautsResponse } from '../types/iss.types';

export const ISSAstronautsCard = () => {
  const [astronauts, setAstronauts] = useState<ISSAstronautsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAstronauts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await issService.getAstronauts();
        setAstronauts(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch astronauts';
        setError(errorMessage);
        console.error('Error fetching astronauts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAstronauts();
    // Refresh every 5 minutes
    const interval = setInterval(fetchAstronauts, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  if (loading && !astronauts) {
    return (
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <span className="loading loading-spinner loading-lg"></span>
          <p>Loading astronauts...</p>
        </div>
      </div>
    );
  }

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    const fetchAstronauts = async () => {
      try {
        const data = await issService.getAstronauts();
        setAstronauts(data);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch astronauts';
        setError(errorMessage);
        console.error('Error fetching astronauts:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAstronauts();
  };

  if (error) {
    return (
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <div className="alert alert-error">
            <span>Error: {error}</span>
            <button
              className="btn btn-sm btn-outline ml-2"
              onClick={handleRetry}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!astronauts) {
    return null;
  }

  const issAstronauts = astronauts.people.filter(p => p.craft === 'ISS');
  const tiangongAstronauts = astronauts.people.filter(p => p.craft === 'Tiangong');

  return (
    <div className="card bg-base-200 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">
          <span className="text-2xl">👨‍🚀</span>
          Astronauts in Space
        </h2>
        <p className="text-sm opacity-70 mb-4">
          Currently {astronauts.number} people in space
        </p>

        {/* ISS Astronauts */}
        {issAstronauts.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              🛰️ International Space Station ({issAstronauts.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {issAstronauts.map((astronaut, index) => (
                <div
                  key={index}
                  className="badge badge-primary badge-lg p-3 flex items-center gap-2"
                >
                  <span className="text-lg">👨‍🚀</span>
                  <span>{astronaut.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tiangong Astronauts */}
        {tiangongAstronauts.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              🏯 Tiangong Space Station ({tiangongAstronauts.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {tiangongAstronauts.map((astronaut, index) => (
                <div
                  key={index}
                  className="badge badge-secondary badge-lg p-3 flex items-center gap-2"
                >
                  <span className="text-lg">👨‍🚀</span>
                  <span>{astronaut.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card-actions justify-end mt-4">
          <div className="text-xs opacity-50">
            Data from Open Notify API
          </div>
        </div>
      </div>
    </div>
  );
};

