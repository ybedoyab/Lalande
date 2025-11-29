/**
 * Custom Hook for ISS Location Data
 * Follows Single Responsibility Principle - handles ISS location state
 * Follows DRY principle - reusable hook
 */

import { useState, useEffect, useRef } from 'react';
import type { ISSCurrentLocation } from '../types/iss.types';
import { issService } from '../services/iss.service';

/**
 * Custom Hook for ISS Location
 * Fetches and updates ISS location every 5 seconds
 */
export const useISSLocation = (updateInterval: number = 5000) => {
  const [location, setLocation] = useState<ISSCurrentLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const fetchLocation = async () => {
      try {
        if (isMounted) {
          setLoading(true);
          setError(null);
        }
        const data = await issService.getCurrentLocation();
        if (isMounted) {
          setLocation(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to fetch ISS location';
          setError(errorMessage);
          console.error('Error fetching ISS location:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Initial fetch
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchLocation();
    }

    // Set up interval to update location (only if we have a successful fetch or want to retry)
    intervalRef.current = window.setInterval(() => {
      fetchLocation();
    }, updateInterval);

    // Cleanup
    return () => {
      isMounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [updateInterval]);

  return { location, loading, error };
};

