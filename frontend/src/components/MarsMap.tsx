import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { InSightWeatherData, SolData } from '../types/nasa.types';
import { nasaService } from '../services/nasa.service';

interface MarsMapProps {
  weatherData?: InSightWeatherData | null;
}

/**
 * Mars Map Component
 * Displays Mars map with InSight Lander location and weather data
 * Follows Single Responsibility Principle - only handles map visualization
 */
export const MarsMap = ({ weatherData }: MarsMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // InSight Lander location: Elysium Planitia (4.5°N, 135.9°E)
  const INSIGHT_LAT = 4.5;
  const INSIGHT_LON = 135.9;

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create custom Mars-style tile layer
    // Using CartoDB Positron as base and applying Mars-like styling
    const marsTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: 'Mars Map | InSight Lander Location | Map data &copy; OpenStreetMap',
      maxZoom: 18,
      // Apply Mars-like color filter via CSS
    });

    // Alternative: Use a simple colored background for Mars
    // For a more realistic Mars map, you would need Mars-specific tiles from NASA

    // Initialize map centered on InSight location
    const map = L.map(mapContainerRef.current, {
      center: [INSIGHT_LAT, INSIGHT_LON],
      zoom: 5,
      zoomControl: true,
      layers: [marsTileLayer],
      minZoom: 2,
      maxZoom: 10,
    });

    // Apply Mars-like styling to the map container
    const mapContainer = mapContainerRef.current;
    if (mapContainer) {
      mapContainer.style.filter = 'sepia(30%) saturate(150%) hue-rotate(10deg) brightness(0.9)';
    }

    // Create custom Mars icon
    const marsIcon = L.divIcon({
      className: 'mars-lander-icon',
      html: `
        <div style="
          background: radial-gradient(circle, #ff4444 0%, #cc0000 100%);
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 0 10px rgba(255, 68, 68, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 16px;
        ">🔴</div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    // Add marker for InSight Lander
    const marker = L.marker([INSIGHT_LAT, INSIGHT_LON], { icon: marsIcon }).addTo(map);

    // Get latest weather data for popup
    let popupContent = `
      <div style="min-width: 200px;">
        <h3 style="margin: 0 0 10px 0; font-weight: bold; color: #ff4444;">
          🔴 InSight Lander
        </h3>
        <p style="margin: 5px 0; font-size: 12px; color: #666;">
          <strong>Location:</strong> Elysium Planitia<br>
          <strong>Coordinates:</strong> ${INSIGHT_LAT}°N, ${INSIGHT_LON}°E
        </p>
    `;

    if (weatherData) {
      const latestSol = nasaService.getLatestSol(weatherData);
      if (latestSol) {
        const latestData = weatherData[latestSol] as SolData;
        popupContent += `
          <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd;">
            <p style="margin: 5px 0; font-size: 12px;">
              <strong>Sol ${latestSol}</strong> - ${latestData.Season}
            </p>
        `;

        if (latestData.AT) {
          popupContent += `
            <p style="margin: 3px 0; font-size: 11px;">
              🌡️ Temp: ${latestData.AT.av.toFixed(1)}°C
            </p>
          `;
        }

        if (latestData.PRE) {
          popupContent += `
            <p style="margin: 3px 0; font-size: 11px;">
              📊 Pressure: ${latestData.PRE.av.toFixed(1)} Pa
            </p>
          `;
        }

        if (latestData.HWS) {
          popupContent += `
            <p style="margin: 3px 0; font-size: 11px;">
              💨 Wind: ${latestData.HWS.av.toFixed(2)} m/s
            </p>
          `;
        }

        if (latestData.WD?.most_common) {
          popupContent += `
            <p style="margin: 3px 0; font-size: 11px;">
              🧭 Direction: ${latestData.WD.most_common.compass_point}
            </p>
          `;
        }

        popupContent += `</div>`;
      }
    }

    popupContent += `</div>`;

    marker.bindPopup(popupContent).openPopup();

    mapRef.current = map;
    markerRef.current = marker;

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update popup when weather data changes
  useEffect(() => {
    if (!markerRef.current || !weatherData) return;

    const latestSol = nasaService.getLatestSol(weatherData);
    if (!latestSol) return;

    const latestData = weatherData[latestSol] as SolData;

    let popupContent = `
      <div style="min-width: 200px;">
        <h3 style="margin: 0 0 10px 0; font-weight: bold; color: #ff4444;">
          🔴 InSight Lander
        </h3>
        <p style="margin: 5px 0; font-size: 12px; color: #666;">
          <strong>Location:</strong> Elysium Planitia<br>
          <strong>Coordinates:</strong> ${INSIGHT_LAT}°N, ${INSIGHT_LON}°E
        </p>
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd;">
          <p style="margin: 5px 0; font-size: 12px;">
            <strong>Sol ${latestSol}</strong> - ${latestData.Season}
          </p>
    `;

    if (latestData.AT) {
      popupContent += `
        <p style="margin: 3px 0; font-size: 11px;">
          🌡️ Temp: ${latestData.AT.av.toFixed(1)}°C
        </p>
      `;
    }

    if (latestData.PRE) {
      popupContent += `
        <p style="margin: 3px 0; font-size: 11px;">
          📊 Pressure: ${latestData.PRE.av.toFixed(1)} Pa
        </p>
      `;
    }

    if (latestData.HWS) {
      popupContent += `
        <p style="margin: 3px 0; font-size: 11px;">
          💨 Wind: ${latestData.HWS.av.toFixed(2)} m/s
        </p>
      `;
    }

    if (latestData.WD?.most_common) {
      popupContent += `
        <p style="margin: 3px 0; font-size: 11px;">
          🧭 Direction: ${latestData.WD.most_common.compass_point}
        </p>
      `;
    }

    popupContent += `</div></div>`;

    markerRef.current.setPopupContent(popupContent);
  }, [weatherData]);

  return (
    <div className="card bg-base-200 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">
          <span className="text-2xl">🗺️</span>
          Mars Map - InSight Lander Location
        </h2>
        <div
          ref={mapContainerRef}
          style={{
            height: '500px',
            width: '100%',
            borderRadius: '8px',
            overflow: 'hidden',
            marginTop: '1rem',
          }}
          className="border border-base-300"
        />
        <div className="text-xs opacity-60 mt-2">
          InSight Lander at Elysium Planitia, Mars | Click marker for weather data
        </div>
      </div>
    </div>
  );
};

