import { useState, useEffect, useRef } from 'react';
import type { REMSWeatherResponse } from '../services/mars.service';
import { marsService } from '../services/mars.service';

/**
 * Custom Hook for REMS Weather Data
 * Follows Single Responsibility Principle - handles REMS weather state
 * Follows DRY principle - reusable hook
 * Prevents double calls in React StrictMode
 */
export const useREMSWeather = (params?: {
  limit?: number;
  skip?: number;
  sort?: string;
}) => {
  const [data, setData] = useState<REMSWeatherResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);
  const paramsRef = useRef(params);

  // Update params ref when params change
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  useEffect(() => {
    // Prevent double calls in StrictMode
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchREMSWeather = async () => {
      try {
        setLoading(true);
        setError(null);
        const weatherData = await marsService.getREMSWeather(paramsRef.current);
        setData(weatherData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch REMS weather data';
        setError(errorMessage);
        console.error('Error fetching REMS weather:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchREMSWeather();
  }, []);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const weatherData = await marsService.getREMSWeather(paramsRef.current);
      setData(weatherData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch REMS weather data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch };
};

