/**
 * ISS (International Space Station) Service
 * Handles Open Notify API calls for ISS data
 * Follows Single Responsibility Principle - handles only ISS API calls
 * Follows DRY principle - reusable ISS API functions
 */

import type {
  ISSCurrentLocation,
  ISSPassResponse,
  ISSAstronautsResponse,
} from '../types/iss.types';

// Use HTTP (not HTTPS) - Open Notify API uses HTTP
const OPEN_NOTIFY_BASE = 'http://api.open-notify.org';

class ISSService {
  /**
   * Get current location of the ISS
   */
  async getCurrentLocation(): Promise<ISSCurrentLocation> {
    try {
      const response = await fetch(`${OPEN_NOTIFY_BASE}/iss-now.json`, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'omit',
      });

      if (!response.ok) {
        throw new Error(`ISS API error: ${response.status} ${response.statusText}`);
      }

      const data: ISSCurrentLocation = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching ISS location:', error);
      // Re-throw with more context
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to reach ISS API. Please check your connection.');
      }
      throw error;
    }
  }

  /**
   * Get predicted passes of the ISS over a location
   * @param lat Latitude
   * @param lon Longitude
   * @param altitude Altitude in kilometers (default: 100)
   * @param passes Number of passes to predict (default: 5)
   */
  async getPasses(
    lat: number,
    lon: number,
    altitude: number = 100,
    passes: number = 5
  ): Promise<ISSPassResponse> {
    try {
      const url = `${OPEN_NOTIFY_BASE}/iss-pass.json?lat=${lat}&lon=${lon}&alt=${altitude}&n=${passes}`;
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'omit',
      });

      if (!response.ok) {
        throw new Error(`ISS API error: ${response.status} ${response.statusText}`);
      }

      const data: ISSPassResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching ISS passes:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to reach ISS API. Please check your connection.');
      }
      throw error;
    }
  }

  /**
   * Get current astronauts on the ISS
   */
  async getAstronauts(): Promise<ISSAstronautsResponse> {
    try {
      const response = await fetch(`${OPEN_NOTIFY_BASE}/astros.json`, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'omit',
      });

      if (!response.ok) {
        throw new Error(`ISS API error: ${response.status} ${response.statusText}`);
      }

      const data: ISSAstronautsResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching ISS astronauts:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to reach ISS API. Please check your connection.');
      }
      throw error;
    }
  }
}

// Export singleton instance (follows DRY)
export const issService = new ISSService();

