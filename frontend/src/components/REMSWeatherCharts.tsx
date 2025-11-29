/**
 * REMS Weather Charts Component
 * Displays REMS weather data using Recharts
 * Follows Single Responsibility Principle - only handles chart visualization
 */

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { REMSWeatherData } from '../services/mars.service';

interface REMSWeatherChartsProps {
  weatherData: REMSWeatherData[];
  loading?: boolean;
  error?: string | null;
}

export const REMSWeatherCharts = ({ weatherData, loading, error }: REMSWeatherChartsProps) => {
  if (loading) {
    return (
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <div className="flex items-center justify-center h-64">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <div className="alert alert-error">
            <span>Error loading REMS weather data: {error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!weatherData || weatherData.length === 0) {
    return null;
  }

  // Sort by solNumber (most recent first, then reverse for chronological display)
  const sortedData = [...weatherData]
    .sort((a, b) => b.solNumber - a.solNumber)
    .slice(0, 50) // Take last 50 records
    .reverse(); // Reverse for chronological order

  // Prepare data for charts
  const chartData = sortedData.map((item) => {
    // Parse wind speed if available
    let windSpeed: number | null = null;
    if (item.windSpeed) {
      const parsed = parseFloat(item.windSpeed);
      if (!isNaN(parsed)) {
        windSpeed = parsed;
      }
    }

    // Parse humidity if available
    let humidity: number | null = null;
    if (item.humidity) {
      const parsed = parseFloat(item.humidity);
      if (!isNaN(parsed)) {
        humidity = parsed;
      }
    }

    return {
      sol: `Sol ${item.solNumber}`,
      solNumber: item.solNumber,
      maxGroundTemp: item.maxGroundTemp,
      minGroundTemp: item.minGroundTemp,
      maxAirTemp: item.maxAirTemp,
      minAirTemp: item.minAirTemp,
      meanPressure: item.meanPressure,
      windSpeed,
      humidity,
      uvRadiation: item.uvRadiation,
      weather: item.weather,
      earthDate: item.earthDateTime.replace('Earth, ', '').replace(' UTC', ''),
    };
  });

  if (chartData.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Air Temperature Chart */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">
            <span className="text-2xl">🌡️</span>
            REMS Air Temperature Trends
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="sol" 
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="maxAirTemp"
                stroke="#ef4444"
                strokeWidth={2}
                name="Max Air Temp (°C)"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="minAirTemp"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Min Air Temp (°C)"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ground Temperature Chart */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">
            <span className="text-2xl">🌍</span>
            REMS Ground Temperature Trends
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="sol" 
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="maxGroundTemp"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Max Ground Temp (°C)"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="minGroundTemp"
                stroke="#8b5cf6"
                strokeWidth={2}
                name="Min Ground Temp (°C)"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pressure Chart - only if we have pressure data */}
      {chartData.some((d) => d.meanPressure !== null) && (
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <span className="text-2xl">📊</span>
              REMS Atmospheric Pressure
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="sol" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis label={{ value: 'Pressure (Pa)', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="meanPressure"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Mean Pressure (Pa)"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Wind Speed Chart - only if we have wind speed data */}
      {chartData.some((d) => d.windSpeed !== null) && (
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <span className="text-2xl">💨</span>
              REMS Wind Speed
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="sol" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis label={{ value: 'Wind Speed (m/s)', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}
                />
                <Legend />
                <Bar dataKey="windSpeed" fill="#8b5cf6" name="Wind Speed (m/s)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

