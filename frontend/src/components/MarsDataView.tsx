import { useState, useEffect } from 'react';
import type { LandingSite, REMSWeatherData, MarsStats } from '../services/mars.service';
import { marsService } from '../services/mars.service';
import { REMSWeatherCharts } from './REMSWeatherCharts';
import { MarsWeatherCard } from './MarsWeatherCard';
import { MarsWeatherCharts } from './MarsWeatherCharts';
import { MarsWeatherHistory } from './MarsWeatherHistory';
import { useMarsWeather } from '../hooks/useMarsWeather';

export const MarsDataView = () => {
  const [landingSites, setLandingSites] = useState<LandingSite[]>([]);
  const [remsData, setRemsData] = useState<REMSWeatherData[]>([]);
  const [stats, setStats] = useState<MarsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'insight-weather' | 'landing-sites' | 'rems-weather'>('insight-weather');
  
  // Load InSight weather data
  const { data: weatherData, loading: loadingWeather, error: weatherError } = useMarsWeather();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [sites, weather, statistics] = await Promise.all([
        marsService.getLandingSites(),
        marsService.getREMSWeather({ limit: 50, sort: '-solNumber' }),
        marsService.getStats()
      ]);

      setLandingSites(sites);
      setRemsData(weather.data);
      setStats(statistics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading Mars data');
      console.error('Error loading Mars data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Error: {error}</span>
        <button className="btn btn-sm" onClick={loadData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="stat bg-base-200 rounded-lg shadow">
            <div className="stat-title">Landing Sites</div>
            <div className="stat-value text-primary">{stats.landingSites.total}</div>
            <div className="stat-desc">Total missions</div>
          </div>
          <div className="stat bg-base-200 rounded-lg shadow">
            <div className="stat-title">REMS Records</div>
            <div className="stat-value text-secondary">{stats.remsWeather.total.toLocaleString()}</div>
            <div className="stat-desc">Weather data points</div>
          </div>
          <div className="stat bg-base-200 rounded-lg shadow">
            <div className="stat-title">Latest SOL</div>
            <div className="stat-value text-accent">{stats.remsWeather.latestSol || 'N/A'}</div>
            <div className="stat-desc">Most recent measurement</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs tabs-boxed mb-6">
        <button
          className={`tab ${activeTab === 'insight-weather' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('insight-weather')}
        >
          🌡️ InSight Weather
        </button>
        <button
          className={`tab ${activeTab === 'landing-sites' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('landing-sites')}
        >
          🚀 Landing Sites
        </button>
        <button
          className={`tab ${activeTab === 'rems-weather' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('rems-weather')}
        >
          🌡️ REMS Weather
        </button>
      </div>

      {/* InSight Weather Tab */}
      {activeTab === 'insight-weather' && (
        <div className="space-y-6">
          {/* Mars Weather Data - Current Sol */}
          <MarsWeatherCard 
            weatherData={weatherData} 
            loading={loadingWeather} 
            error={weatherError} 
          />

          {/* Show trends, charts and history only when data is loaded */}
          {!loadingWeather && !weatherError && weatherData && (
            <>
              {/* Mars Weather Charts (Recharts) */}
              <MarsWeatherCharts weatherData={weatherData} />

              {/* Mars Weather History */}
              <MarsWeatherHistory weatherData={weatherData} />
            </>
          )}
        </div>
      )}

      {/* Landing Sites Tab */}
      {activeTab === 'landing-sites' && (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>Mission</th>
                <th>Landing Site</th>
                <th>Date</th>
                <th>Coordinates</th>
                <th>Elevation</th>
              </tr>
            </thead>
            <tbody>
              {landingSites.map((site) => (
                <tr key={site._id}>
                  <td className="font-bold">{site.mission}</td>
                  <td>{site.landingSite}</td>
                  <td>{new Date(site.landingDate).toLocaleDateString()}</td>
                  <td>
                    {site.latitude.toFixed(2)}°N, {site.longitude.toFixed(2)}°E
                  </td>
                  <td>{site.elevationMeters} m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* REMS Weather Tab */}
      {activeTab === 'rems-weather' && (
        <div className="space-y-6">
          {/* REMS Weather Charts */}
          <REMSWeatherCharts 
            weatherData={remsData} 
            loading={loading}
            error={error}
          />

          {/* REMS Weather Data Table */}
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">
                <span className="text-2xl">📊</span>
                REMS Weather Data Table
              </h2>
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>SOL</th>
                      <th>Earth Date</th>
                      <th>Max Temp (°C)</th>
                      <th>Min Temp (°C)</th>
                      <th>Pressure (Pa)</th>
                      <th>Weather</th>
                    </tr>
                  </thead>
                  <tbody>
                    {remsData.map((data) => (
                      <tr key={data._id}>
                        <td className="font-bold">{data.solNumber}</td>
                        <td>
                          {data.earthDateTime 
                            ? new Date(data.earthDateTime.split(',')[1]?.trim() || data.earthDateTime).toLocaleDateString()
                            : 'N/A'}
                        </td>
                        <td>{data.maxAirTemp !== null ? `${data.maxAirTemp}°C` : 'N/A'}</td>
                        <td>{data.minAirTemp !== null ? `${data.minAirTemp}°C` : 'N/A'}</td>
                        <td>{data.meanPressure !== null ? data.meanPressure : 'N/A'}</td>
                        <td>
                          <span className="badge badge-outline">{data.weather || 'N/A'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

