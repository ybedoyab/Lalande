import type { InSightWeatherData, SolData } from '../types/nasa.types';

interface MarsWeatherTrendsProps {
  weatherData: InSightWeatherData;
}

/**
 * Mars Weather Trends Component
 * Displays trends across all available Sols
 * Follows Single Responsibility Principle - only displays trends
 */
export const MarsWeatherTrends = ({ weatherData }: MarsWeatherTrendsProps) => {
  if (!weatherData.sol_keys || weatherData.sol_keys.length === 0) {
    return null;
  }

  // Get all Sol data sorted by Sol number
  const solsData = weatherData.sol_keys
    .map((sol) => ({
      sol,
      data: weatherData[sol] as SolData,
    }))
    .filter((item) => item.data)
    .sort((a, b) => parseInt(a.sol) - parseInt(b.sol));

  if (solsData.length === 0) {
    return null;
  }

  // Calculate trends
  const temperatureData = solsData
    .filter((item) => item.data.AT)
    .map((item) => ({
      sol: item.sol,
      value: item.data.AT!.av,
      min: item.data.AT!.mn,
      max: item.data.AT!.mx,
    }));

  const pressureData = solsData
    .filter((item) => item.data.PRE)
    .map((item) => ({
      sol: item.sol,
      value: item.data.PRE!.av,
      min: item.data.PRE!.mn,
      max: item.data.PRE!.mx,
    }));

  const windSpeedData = solsData
    .filter((item) => item.data.HWS)
    .map((item) => ({
      sol: item.sol,
      value: item.data.HWS!.av,
      min: item.data.HWS!.mn,
      max: item.data.HWS!.mx,
    }));

  // Find min/max for scaling
  const tempMin = Math.min(...temperatureData.map((d) => d.min));
  const tempMax = Math.max(...temperatureData.map((d) => d.max));
  const tempRange = tempMax - tempMin;

  const pressureMin = Math.min(...pressureData.map((d) => d.min));
  const pressureMax = Math.max(...pressureData.map((d) => d.max));
  const pressureRange = pressureMax - pressureMin;

  const windMin = Math.min(...windSpeedData.map((d) => d.min));
  const windMax = Math.max(...windSpeedData.map((d) => d.max));
  const windRange = windMax - windMin;

  // Helper to calculate bar height percentage
  const getHeight = (value: number, min: number, max: number) => {
    if (max === min) return 50;
    return ((value - min) / (max - min)) * 100;
  };

  return (
    <div className="card bg-base-200 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">
          <span className="text-2xl">📊</span>
          Weather Trends - Last {solsData.length} Sols
        </h2>

        {/* Temperature Trend */}
        {temperatureData.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Temperature (°C)</h3>
            <div className="flex items-end gap-2 h-32">
              {temperatureData.map((item) => {
                const height = getHeight(item.value, tempMin, tempMax);
                return (
                  <div key={item.sol} className="flex-1 flex flex-col items-center">
                    <div className="relative w-full h-full flex items-end">
                      <div
                        className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t transition-all"
                        style={{ height: `${height}%` }}
                        title={`Sol ${item.sol}: ${item.value.toFixed(1)}°C`}
                      />
                    </div>
                    <div className="text-xs mt-1 text-center">
                      <div className="font-semibold">{item.value.toFixed(0)}°</div>
                      <div className="text-xs opacity-60">Sol {item.sol}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs opacity-60 mt-2">
              <span>Min: {tempMin.toFixed(1)}°C</span>
              <span>Max: {tempMax.toFixed(1)}°C</span>
            </div>
          </div>
        )}

        {/* Pressure Trend */}
        {pressureData.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Pressure (Pa)</h3>
            <div className="flex items-end gap-2 h-32">
              {pressureData.map((item) => {
                const height = getHeight(item.value, pressureMin, pressureMax);
                return (
                  <div key={item.sol} className="flex-1 flex flex-col items-center">
                    <div className="relative w-full h-full flex items-end">
                      <div
                        className="w-full bg-gradient-to-t from-green-500 to-green-300 rounded-t transition-all"
                        style={{ height: `${height}%` }}
                        title={`Sol ${item.sol}: ${item.value.toFixed(1)} Pa`}
                      />
                    </div>
                    <div className="text-xs mt-1 text-center">
                      <div className="font-semibold">{item.value.toFixed(0)}</div>
                      <div className="text-xs opacity-60">Sol {item.sol}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs opacity-60 mt-2">
              <span>Min: {pressureMin.toFixed(1)} Pa</span>
              <span>Max: {pressureMax.toFixed(1)} Pa</span>
            </div>
          </div>
        )}

        {/* Wind Speed Trend */}
        {windSpeedData.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Wind Speed (m/s)</h3>
            <div className="flex items-end gap-2 h-32">
              {windSpeedData.map((item) => {
                const height = getHeight(item.value, windMin, windMax);
                return (
                  <div key={item.sol} className="flex-1 flex flex-col items-center">
                    <div className="relative w-full h-full flex items-end">
                      <div
                        className="w-full bg-gradient-to-t from-orange-500 to-orange-300 rounded-t transition-all"
                        style={{ height: `${height}%` }}
                        title={`Sol ${item.sol}: ${item.value.toFixed(2)} m/s`}
                      />
                    </div>
                    <div className="text-xs mt-1 text-center">
                      <div className="font-semibold">{item.value.toFixed(1)}</div>
                      <div className="text-xs opacity-60">Sol {item.sol}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs opacity-60 mt-2">
              <span>Min: {windMin.toFixed(2)} m/s</span>
              <span>Max: {windMax.toFixed(2)} m/s</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

