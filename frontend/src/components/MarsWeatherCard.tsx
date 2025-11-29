import type { InSightWeatherData, SolData } from '../types/nasa.types';
import { nasaService } from '../services/nasa.service';
import { useMarsWeather } from '../hooks/useMarsWeather';

interface MarsWeatherCardProps {
  weatherData?: InSightWeatherData | null;
  loading?: boolean;
  error?: string | null;
}

/**
 * Mars Weather Card Component
 * Displays current Mars weather data from InSight lander
 * Follows Single Responsibility Principle - only displays weather data
 */
export const MarsWeatherCard = ({ 
  weatherData: propWeatherData, 
  loading: propLoading, 
  error: propError 
}: MarsWeatherCardProps = {}) => {
  // Use props if provided, otherwise use hook (for backward compatibility)
  const hookData = useMarsWeather();
  const weatherData = propWeatherData ?? hookData.data;
  const loading = propLoading ?? hookData.loading;
  const error = propError ?? hookData.error;

  if (loading) {
    return (
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <span className="loading loading-spinner loading-lg"></span>
          <p>Loading Mars weather data...</p>
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
          </div>
        </div>
      </div>
    );
  }

  if (!weatherData || !weatherData.sol_keys || weatherData.sol_keys.length === 0) {
    return (
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <p>No weather data available</p>
        </div>
      </div>
    );
  }

  const latestSol = nasaService.getLatestSol(weatherData);
  const latestData = latestSol ? (weatherData[latestSol] as SolData) : null;

  if (!latestData) {
    return null;
  }

  return (
    <div className="card bg-base-200 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">
          <span className="text-2xl">🔴</span>
          Mars Weather - Sol {latestSol}
        </h2>
        <p className="text-sm opacity-70">
          {latestData.First_UTC} - {latestData.Last_UTC}
        </p>
        <p className="badge badge-outline">{latestData.Season}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {/* Temperature */}
          {latestData.AT && (
            <div className="stat bg-base-300 rounded-lg p-4">
              <div className="stat-title">Temperature</div>
              <div className="stat-value text-2xl">
                {latestData.AT.av.toFixed(1)}°C
              </div>
              <div className="stat-desc">
                Min: {latestData.AT.mn.toFixed(1)}°C | Max: {latestData.AT.mx.toFixed(1)}°C
              </div>
            </div>
          )}

          {/* Pressure */}
          {latestData.PRE && (
            <div className="stat bg-base-300 rounded-lg p-4">
              <div className="stat-title">Pressure</div>
              <div className="stat-value text-2xl">
                {latestData.PRE.av.toFixed(1)} Pa
              </div>
              <div className="stat-desc">
                Min: {latestData.PRE.mn.toFixed(1)} Pa | Max: {latestData.PRE.mx.toFixed(1)} Pa
              </div>
            </div>
          )}

          {/* Wind Speed */}
          {latestData.HWS && (
            <div className="stat bg-base-300 rounded-lg p-4">
              <div className="stat-title">Wind Speed</div>
              <div className="stat-value text-2xl">
                {latestData.HWS.av.toFixed(2)} m/s
              </div>
              <div className="stat-desc">
                Min: {latestData.HWS.mn.toFixed(2)} m/s | Max: {latestData.HWS.mx.toFixed(2)} m/s
              </div>
            </div>
          )}
        </div>

        {/* Wind Direction */}
        {latestData.WD?.most_common && (
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Wind Direction:</span>
              <span className="badge badge-primary">
                {latestData.WD.most_common.compass_point} 
                ({latestData.WD.most_common.compass_degrees}°)
              </span>
            </div>
          </div>
        )}

        <div className="card-actions justify-end mt-4">
          <div className="text-xs opacity-50">
            Data from NASA InSight Lander at Elysium Planitia
          </div>
        </div>
      </div>
    </div>
  );
};

