/**
 * Mars Geospatial Data Service
 * Handles USGS Astrogeology Mars data APIs
 * Follows Single Responsibility Principle - handles only geo API calls
 * Follows DRY principle - reusable geo API functions
 */

import type {
  CraterCollection,
  HiRISECollection,
  GeologicCollection,
} from '../types/mars-geo.types';

const USGS_ASTROGEOLOGY_BASE = 'https://astrogeology.usgs.gov/pygeoapi';
const STAC_API_BASE = 'https://g6goyz4w56.execute-api.us-west-2.amazonaws.com/prod';

class MarsGeoService {
  /**
   * Fetch craters from Robbins V1 Crater Database
   * @param bbox Optional bounding box [minLon, minLat, maxLon, maxLat]
   * @param limit Maximum number of craters to return
   */
  async getCraters(
    bbox?: [number, number, number, number],
    limit: number = 100
  ): Promise<CraterCollection> {
    try {
      let url = `${USGS_ASTROGEOLOGY_BASE}/collections/mars/robbinsv1/items?limit=${limit}&f=json`;
      
      if (bbox) {
        url += `&bbox=${bbox.join(',')}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`USGS API error: ${response.status} ${response.statusText}`);
      }

      const data: CraterCollection = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching crater data:', error);
      throw error;
    }
  }

  /**
   * Fetch HiRISE observation footprints
   * @param bbox Optional bounding box [minLon, minLat, maxLon, maxLat]
   * @param limit Maximum number of observations to return
   */
  async getHiRISEObservations(
    bbox?: [number, number, number, number],
    limit: number = 50
  ): Promise<HiRISECollection> {
    try {
      let url = `${USGS_ASTROGEOLOGY_BASE}/collections/mars/hirise-observation-footprints-equatorial/items?limit=${limit}&f=json`;
      
      if (bbox) {
        url += `&bbox=${bbox.join(',')}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`USGS API error: ${response.status} ${response.statusText}`);
      }

      const data: HiRISECollection = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching HiRISE observations:', error);
      throw error;
    }
  }

  /**
   * Fetch global geologic map units
   * @param bbox Optional bounding box [minLon, minLat, maxLon, maxLat]
   */
  async getGeologicUnits(
    bbox?: [number, number, number, number]
  ): Promise<GeologicCollection> {
    try {
      let url = `${USGS_ASTROGEOLOGY_BASE}/collections/mars/sim3292_global_geologic_map/units/items?f=json`;
      
      if (bbox) {
        url += `&bbox=${bbox.join(',')}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`USGS API error: ${response.status} ${response.statusText}`);
      }

      const data: GeologicCollection = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching geologic units:', error);
      throw error;
    }
  }

  /**
   * Get craters near a specific location
   * @param lat Latitude
   * @param lon Longitude
   * @param radiusKm Radius in kilometers (approximate)
   */
  async getCratersNearLocation(
    lat: number,
    lon: number,
    radiusKm: number = 500
  ): Promise<CraterCollection> {
    // Approximate conversion: 1 degree ≈ 59 km at Mars equator
    const latDelta = radiusKm / 59;
    const lonDelta = radiusKm / (59 * Math.cos((lat * Math.PI) / 180));
    
    const bbox: [number, number, number, number] = [
      lon - lonDelta,
      lat - latDelta,
      lon + lonDelta,
      lat + latDelta,
    ];

    return this.getCraters(bbox, 50);
  }
}

// Export singleton instance (follows DRY)
export const marsGeoService = new MarsGeoService();

