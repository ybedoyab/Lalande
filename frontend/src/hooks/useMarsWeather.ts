import { useState, useEffect, useRef } from 'react';
import type { InSightWeatherData } from '../types/nasa.types';
import { nasaService } from '../services/nasa.service';

/**
 * Custom Hook for Mars Weather Data
 * Follows Single Responsibility Principle - handles weather data state
 * Follows DRY principle - reusable hook
 * Prevents double calls in React StrictMode
 */
export const useMarsWeather = () => {
  const [data, setData] = useState<InSightWeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    // Prevent double calls in StrictMode
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchWeather = async () => {
      try {
        setLoading(true);
        setError(null);
        const weatherData = await nasaService.getInSightWeather();
        setData(weatherData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch weather data';
        setError(errorMessage);
        console.error('Error fetching Mars weather:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, []);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const weatherData = await nasaService.getInSightWeather();
      setData(weatherData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch weather data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch };
};

