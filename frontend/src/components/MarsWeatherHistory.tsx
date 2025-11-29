import type { InSightWeatherData, SolData } from '../types/nasa.types';

interface MarsWeatherHistoryProps {
  weatherData: InSightWeatherData;
}

/**
 * Mars Weather History Component
 * Displays all available Sol data in a table format
 * Follows Single Responsibility Principle - only displays history
 */
export const MarsWeatherHistory = ({ weatherData }: MarsWeatherHistoryProps) => {
  if (!weatherData.sol_keys || weatherData.sol_keys.length === 0) {
    return null;
  }

  // Get all Sol data sorted by Sol number (newest first)
  const solsData = weatherData.sol_keys
    .map((sol) => ({
      sol,
      data: weatherData[sol] as SolData,
    }))
    .filter((item) => item.data)
    .sort((a, b) => parseInt(b.sol) - parseInt(a.sol));

  if (solsData.length === 0) {
    return null;
  }

  return (
    <div className="card bg-base-200 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">
          <span className="text-2xl">📅</span>
          Weather History - Last {solsData.length} Sols
        </h2>

        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Sol</th>
                <th>Season</th>
                <th>Temperature (°C)</th>
                <th>Pressure (Pa)</th>
                <th>Wind Speed (m/s)</th>
                <th>Wind Direction</th>
                <th>Date Range</th>
              </tr>
            </thead>
            <tbody>
              {solsData.map((item) => (
                <tr key={item.sol}>
                  <td className="font-bold">Sol {item.sol}</td>
                  <td>
                    <span className="badge badge-outline">{item.data.Season}</span>
                  </td>
                  <td>
                    {item.data.AT ? (
                      <div>
                        <div className="font-semibold">{item.data.AT.av.toFixed(1)}°C</div>
                        <div className="text-xs opacity-60">
                          {item.data.AT.mn.toFixed(1)}° - {item.data.AT.mx.toFixed(1)}°
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs opacity-50">N/A</span>
                    )}
                  </td>
                  <td>
                    {item.data.PRE ? (
                      <div>
                        <div className="font-semibold">{item.data.PRE.av.toFixed(1)}</div>
                        <div className="text-xs opacity-60">
                          {item.data.PRE.mn.toFixed(1)} - {item.data.PRE.mx.toFixed(1)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs opacity-50">N/A</span>
                    )}
                  </td>
                  <td>
                    {item.data.HWS ? (
                      <div>
                        <div className="font-semibold">{item.data.HWS.av.toFixed(2)}</div>
                        <div className="text-xs opacity-60">
                          {item.data.HWS.mn.toFixed(2)} - {item.data.HWS.mx.toFixed(2)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs opacity-50">N/A</span>
                    )}
                  </td>
                  <td>
                    {item.data.WD?.most_common ? (
                      <span className="badge badge-primary">
                        {item.data.WD.most_common.compass_point}
                      </span>
                    ) : (
                      <span className="text-xs opacity-50">N/A</span>
                    )}
                  </td>
                  <td>
                    <div className="text-xs">
                      <div>{new Date(item.data.First_UTC).toLocaleDateString()}</div>
                      <div className="opacity-60">
                        {new Date(item.data.First_UTC).toLocaleTimeString()} -{' '}
                        {new Date(item.data.Last_UTC).toLocaleTimeString()}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

