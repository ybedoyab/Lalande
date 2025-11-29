/**
 * Mars Data Service
 * Handles API calls for Mars landing sites and REMS weather data
 */

import { apiService } from './api.service';

// Type definitions - exported separately for better tree-shaking
export type LandingSite = {
  _id: string;
  mission: string;
  landingDate: string;
  landingSite: string;
  latitude: number;
  longitude: number;
  elevationMeters: number;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  importedAt: string;
};

export type REMSWeatherData = {
  _id: string;
  earthDateTime: string;
  marsDateTime: string;
  solNumber: number;
  maxGroundTemp: number | null;
  minGroundTemp: number | null;
  maxAirTemp: number | null;
  minAirTemp: number | null;
  meanPressure: number | null;
  windSpeed: string | null;
  humidity: string | null;
  sunrise: string | null;
  sunset: string | null;
  uvRadiation: string | null;
  weather: string | null;
  importedAt: string;
};

export type REMSWeatherResponse = {
  success: boolean;
  count: number;
  total: number;
  skip: number;
  limit: number;
  data: REMSWeatherData[];
};

export type LandingSitesResponse = {
  success: boolean;
  count: number;
  data: LandingSite[];
};

export type MarsStats = {
  landingSites: {
    total: number;
  };
  remsWeather: {
    total: number;
    latestSol: number | null;
    latestDate: string | null;
  };
};

class MarsService {
  /**
   * Obtiene todos los sitios de aterrizaje
   */
  async getLandingSites(): Promise<LandingSite[]> {
    const response = await apiService.get<LandingSitesResponse>('/api/mars/landing-sites');
    return response.data;
  }

  /**
   * Obtiene datos de REMS con filtros opcionales
   */
  async getREMSWeather(params?: {
    limit?: number;
    skip?: number;
    sort?: string;
    solNumber?: number;
  }): Promise<REMSWeatherResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.sort) queryParams.append('sort', params.sort);
    if (params?.solNumber) queryParams.append('solNumber', params.solNumber.toString());

    const queryString = queryParams.toString();
    const endpoint = `/api/mars/rems-weather${queryString ? `?${queryString}` : ''}`;
    
    return apiService.get<REMSWeatherResponse>(endpoint);
  }

  /**
   * Obtiene el último registro de REMS
   */
  async getLatestREMSWeather(): Promise<REMSWeatherData> {
    const response = await apiService.get<{ success: boolean; data: REMSWeatherData }>('/api/mars/rems-weather/latest');
    return response.data;
  }

  /**
   * Obtiene estadísticas generales
   */
  async getStats(): Promise<MarsStats> {
    const response = await apiService.get<{ success: boolean; data: MarsStats }>('/api/mars/stats');
    return response.data;
  }
}

export const marsService = new MarsService();

