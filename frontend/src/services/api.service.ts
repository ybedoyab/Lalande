/**
 * API Service
 * Follows Single Responsibility Principle - handles all API calls
 * Follows DRY principle - reusable API functions
 */

import { env } from '../utils/env';

const API_BASE_URL = env.API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Generic fetch method with error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * NASA API methods
   */
  async fetchNasaData(endpoint: string) {
    const url = `https://api.nasa.gov${endpoint}`;
    const apiKey = env.NASA_API_KEY;
    
    if (!apiKey) {
      throw new Error('NASA API key is not configured');
    }

    const response = await fetch(`${url}?api_key=${apiKey}`);
    
    if (!response.ok) {
      throw new Error(`NASA API error: ${response.status}`);
    }

    return response.json();
  }
}

// Export singleton instance (follows DRY)
export const apiService = new ApiService();

