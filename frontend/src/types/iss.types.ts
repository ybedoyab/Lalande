/**
 * ISS (International Space Station) Data Types
 */

export interface ISSPosition {
  latitude: string; // API returns as string
  longitude: string; // API returns as string
}

export interface ISSCurrentLocation {
  message: string;
  timestamp: number;
  iss_position: ISSPosition;
}

export interface ISSPass {
  risetime: number;
  duration: number;
}

export interface ISSPassResponse {
  message: string;
  request: {
    altitude: number;
    datetime: number;
    latitude: number;
    longitude: number;
    passes: number;
  };
  response: ISSPass[];
}

export interface ISSAstronaut {
  name: string;
  craft: string;
}

export interface ISSAstronautsResponse {
  message: string;
  number: number;
  people: ISSAstronaut[];
}

