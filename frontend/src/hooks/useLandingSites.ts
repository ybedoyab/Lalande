import { useState, useEffect, useRef } from 'react';
import type { LandingSite } from '../services/mars.service';
import { marsService } from '../services/mars.service';

/**
 * Custom Hook for Landing Sites Data
 * Follows Single Responsibility Principle - handles landing sites state
 * Follows DRY principle - reusable hook
 * Prevents double calls in React StrictMode
 */
export const useLandingSites = () => {
  const [data, setData] = useState<LandingSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    // Prevent double calls in StrictMode
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchLandingSites = async () => {
      try {
        setLoading(true);
        setError(null);
        const landingSites = await marsService.getLandingSites();
        setData(landingSites);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch landing sites';
        setError(errorMessage);
        console.error('Error fetching landing sites:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLandingSites();
  }, []);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const landingSites = await marsService.getLandingSites();
      setData(landingSites);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch landing sites';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch };
};

