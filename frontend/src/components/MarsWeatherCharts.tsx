/**
 * Mars Weather Charts Component
 * Displays weather data using Recharts
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
import type { InSightWeatherData, SolData } from '../types/nasa.types';
import { nasaService } from '../services/nasa.service';

interface MarsWeatherChartsProps {
  weatherData: InSightWeatherData;
}

export const MarsWeatherCharts = ({ weatherData }: MarsWeatherChartsProps) => {
  const allSols = nasaService.getAllSols(weatherData);
  const lastSevenSols = allSols.slice(0, 7).reverse(); // Get last 7 and reverse for chronological order

  // Prepare data for charts
  const chartData = lastSevenSols.map((solEntry) => {
    const solData = solEntry.data as SolData;
    return {
      sol: `Sol ${solEntry.sol}`,
      solNumber: parseInt(solEntry.sol),
      temperature: solData.AT?.av ?? null,
      tempMin: solData.AT?.mn ?? null,
      tempMax: solData.AT?.mx ?? null,
      pressure: solData.PRE?.av ?? null,
      pressureMin: solData.PRE?.mn ?? null,
      pressureMax: solData.PRE?.mx ?? null,
      windSpeed: solData.HWS?.av ?? null,
      windMin: solData.HWS?.mn ?? null,
      windMax: solData.HWS?.mx ?? null,
      season: solData.Season,
    };
  });

  if (chartData.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Temperature Chart */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">
            <span className="text-2xl">🌡️</span>
            Temperature Trends
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="sol" />
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
                dataKey="temperature"
                stroke="#ef4444"
                strokeWidth={2}
                name="Average Temp (°C)"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="tempMin"
                stroke="#3b82f6"
                strokeWidth={1}
                strokeDasharray="5 5"
                name="Min Temp (°C)"
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="tempMax"
                stroke="#f59e0b"
                strokeWidth={1}
                strokeDasharray="5 5"
                name="Max Temp (°C)"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pressure Chart */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">
            <span className="text-2xl">📊</span>
            Atmospheric Pressure Trends
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="sol" />
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
                dataKey="pressure"
                stroke="#10b981"
                strokeWidth={2}
                name="Average Pressure (Pa)"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="pressureMin"
                stroke="#3b82f6"
                strokeWidth={1}
                strokeDasharray="5 5"
                name="Min Pressure (Pa)"
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="pressureMax"
                stroke="#f59e0b"
                strokeWidth={1}
                strokeDasharray="5 5"
                name="Max Pressure (Pa)"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Wind Speed Chart */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">
            <span className="text-2xl">💨</span>
            Wind Speed Trends
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="sol" />
              <YAxis label={{ value: 'Wind Speed (m/s)', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
              <Legend />
              <Bar dataKey="windSpeed" fill="#8b5cf6" name="Average Wind Speed (m/s)" />
              <Bar dataKey="windMin" fill="#3b82f6" name="Min Wind Speed (m/s)" />
              <Bar dataKey="windMax" fill="#f59e0b" name="Max Wind Speed (m/s)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

