/**
 * NASA InSight Mars Weather Service
 * Follows Single Responsibility Principle - handles only NASA InSight API calls
 */

import { env } from '../utils/env';
import type { InSightWeatherData } from '../types/nasa.types';

const NASA_API_BASE = 'https://api.nasa.gov';

class NasaService {
  private apiKey: string;

  constructor() {
    this.apiKey = env.NASA_API_KEY;
    
    if (!this.apiKey) {
      console.warn('NASA API key is not configured. Some features may not work.');
    }
  }

  /**
   * Fetch InSight Mars Weather data
   * Returns weather data for the last 7 available Sols (Martian days)
   */
  async getInSightWeather(): Promise<InSightWeatherData> {
    if (!this.apiKey) {
      throw new Error('NASA API key is not configured. Please set VITE_NASA_API_KEY in your .env file');
    }

    const url = `${NASA_API_BASE}/insight_weather/?api_key=${this.apiKey}&feedtype=json&ver=1.0`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`NASA API error: ${response.status} ${response.statusText}`);
      }

      const data: InSightWeatherData = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching InSight weather data:', error);
      throw error;
    }
  }

  /**
   * Get the most recent Sol data
   */
  getLatestSol(data: InSightWeatherData): string | null {
    if (!data.sol_keys || data.sol_keys.length === 0) {
      return null;
    }
    // sol_keys are typically in ascending order, so the last one is most recent
    return data.sol_keys[data.sol_keys.length - 1];
  }

  /**
   * Gets all available Sol data, sorted from latest to oldest.
   */
  getAllSols(data: InSightWeatherData) {
    if (!data || !data.sol_keys || data.sol_keys.length === 0) {
      return [];
    }
    return data.sol_keys
      .map(solKey => ({ sol: solKey, data: data[solKey] as any }))
      .filter(solEntry => solEntry.data) // Filter out invalid sol entries
      .sort((a, b) => parseInt(b.sol) - parseInt(a.sol)); // Sort by sol number, latest first
  }
}

// Export singleton instance (follows DRY)
export const nasaService = new NasaService();

