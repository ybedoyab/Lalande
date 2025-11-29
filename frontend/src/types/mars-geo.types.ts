/**
 * Mars Geospatial Data Types
 * Types for USGS Astrogeology Mars data APIs
 */

export interface CraterData {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: {
    lon_e: number; // Longitude (east)
    lat: number; // Latitude
    diamkm: number; // Diameter in kilometers
    craterid: string; // Crater ID
    [key: string]: unknown; // Allow additional properties from API
  };
}

export interface CraterCollection {
  type: 'FeatureCollection';
  numberMatched: number;
  numberReturned: number;
  features: CraterData[];
}

export interface HiRISEObservation {
  type: 'Feature';
  geometry: {
    type: 'Polygon' | 'Point';
    coordinates: number[][][] | [number, number];
  };
  properties: {
    centerlat: number;
    centerlon: number;
    productid: string;
    datasetid: string;
    utcstart: string;
    utcend: string;
    prodtype: string;
  };
}

export interface HiRISECollection {
  type: 'FeatureCollection';
  features: HiRISEObservation[];
}

export interface GeologicUnit {
  type: 'Feature';
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
  properties: {
    unit: string;
    unitdesc: string;
    spharea_km: number;
  };
}

export interface GeologicCollection {
  type: 'FeatureCollection';
  features: GeologicUnit[];
}

