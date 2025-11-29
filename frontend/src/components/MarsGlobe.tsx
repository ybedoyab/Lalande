import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import type { InSightWeatherData, SolData } from '../types/nasa.types';
import type { CraterData } from '../types/mars-geo.types';
import type { LandingSite } from '../services/mars.service';
import type { CraterMaterialData } from '../services/colony.service';
import { nasaService } from '../services/nasa.service';
import { marsGeoService } from '../services/mars-geo.service';
import { colonyService } from '../services/colony.service';

interface MarsGlobeProps {
  weatherData?: InSightWeatherData | null;
  landingSites?: LandingSite[];
  showCraters?: boolean;
  showHiRISE?: boolean;
}

/**
 * Mars Globe Component
 * Displays interactive 3D Mars globe with InSight Lander location, craters, and geo features
 * Follows Single Responsibility Principle - only handles 3D visualization
 */
export const MarsGlobe = ({ weatherData, landingSites = [], showCraters = true, showHiRISE = false }: MarsGlobeProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const marsGroupRef = useRef<THREE.Group | null>(null); // Parent group for all Mars-related objects
  const marsRef = useRef<THREE.Mesh | null>(null);
  const markerRef = useRef<THREE.Group | null>(null);
  const markerMeshRef = useRef<THREE.Mesh | null>(null);
  const colonyMarkerRef = useRef<THREE.Group | null>(null);
  const landingSitesRef = useRef<THREE.Group | null>(null);
  const cratersRef = useRef<THREE.Group | null>(null);
  const hoveredCraterRef = useRef<THREE.Mesh | null>(null);
  const hoveredLandingSiteRef = useRef<LandingSite | null>(null);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const animationIdRef = useRef<number | null>(null);
  const pulseDataRef = useRef<{ scale: number; speed: number }>({ scale: 1, speed: 0.02 });
  const isHoveringMarkerRef = useRef<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  const previousMousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [craters, setCraters] = useState<CraterData[]>([]);
  const [loadingCraters, setLoadingCraters] = useState(false);
  const cratersLoadedRef = useRef<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const autoRotateRef = useRef<boolean>(true);
  const [craterMaterials, setCraterMaterials] = useState<Map<string, CraterMaterialData>>(new Map());
  const navigate = useNavigate();
  const isHoveringRef = useRef<boolean>(false);

  // Sync autoRotateRef with autoRotate state
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  // InSight Lander location: Elysium Planitia (4.5°N, 135.9°E)
  const INSIGHT_LAT = 4.5;
  const INSIGHT_LON = 135.9;
  
  // Colony location: Near Elysium Planitia (slightly offset from InSight)
  const COLONY_LAT = 4.8;
  const COLONY_LON = 136.2;

  // Helper function to convert lat/lon to 3D position on sphere
  const latLonToPosition = (lat: number, lon: number, radius: number): THREE.Vector3 => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = lon * (Math.PI / 180);
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    return new THREE.Vector3(x, y, z);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = null; // Transparent background to show container gradient
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    // Renderer with transparent background
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true, // Enable transparency
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0); // Transparent background
    // Ensure canvas can receive pointer and wheel events
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.pointerEvents = 'auto';
    renderer.domElement.style.cursor = 'grab';
    renderer.domElement.style.userSelect = 'none';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    // Create parent group for all Mars-related objects (Mars + markers + craters)
      // This allows us to rotate everything together as a single unit
      const marsGroup = new THREE.Group();
      scene.add(marsGroup);
      marsGroupRef.current = marsGroup;

      // Create Mars sphere
      const geometry = new THREE.SphereGeometry(2, 64, 64);
      
      // Create fallback material first (in case texture fails)
      const fallbackMaterial = new THREE.MeshStandardMaterial({
        color: 0xcc4422,
        roughness: 0.8,
        metalness: 0.2,
      });

      // Start with fallback material, will be replaced if texture loads
      const mars = new THREE.Mesh(geometry, fallbackMaterial);
      marsGroup.add(mars);
      marsRef.current = mars;

    // Use fallback material for Mars (textures have CORS issues)
    // The fallback color material provides a nice Mars-like appearance
    // If you want to add textures later, you can load them from your own server
    // to avoid CORS issues

    // Add InSight Lander marker
    const markerGroup = new THREE.Group();
    
    // Convert lat/lon to 3D position on sphere
    const radius = 2.05; // Slightly above surface
    const insightPos = latLonToPosition(INSIGHT_LAT, INSIGHT_LON, radius);

    // Create marker (red sphere with glow) - make it slightly larger for better hover detection
    const markerGeometry = new THREE.SphereGeometry(0.08, 16, 16);
    const markerMaterial = new THREE.MeshStandardMaterial({
      color: 0xff4444,
      emissive: 0xff0000,
      emissiveIntensity: 0.5,
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.copy(insightPos);
    markerGroup.add(marker);
    markerMeshRef.current = marker;
    
    // Make marker visible to raycasting
    marker.visible = true;

    // Add glow effect
    const glowGeometry = new THREE.SphereGeometry(0.08, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0.3,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.copy(insightPos);
    markerGroup.add(glow);

    marsGroup.add(markerGroup);
    markerRef.current = markerGroup;

    // Add Colony marker
    const colonyGroup = new THREE.Group();
    const colonyPos = latLonToPosition(COLONY_LAT, COLONY_LON, radius);
    
    // Create colony marker (green/cyan sphere with glow) - different from InSight
    // Make it slightly larger than InSight marker for better visibility
    const colonyGeometry = new THREE.SphereGeometry(0.12, 16, 16);
    const colonyMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 0.8,
    });
    const colonyMarker = new THREE.Mesh(colonyGeometry, colonyMaterial);
    colonyMarker.position.copy(colonyPos);
    colonyMarker.visible = true; // Ensure visible for raycasting
    colonyMarker.userData = { isColonyMarker: true }; // Mark for raycasting
    colonyGroup.add(colonyMarker);
    
    // Add glow effect for colony - make it larger and more visible
    const colonyGlowGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const colonyGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.5,
    });
    const colonyGlow = new THREE.Mesh(colonyGlowGeometry, colonyGlowMaterial);
    colonyGlow.position.copy(colonyPos);
    colonyGlow.visible = true; // Ensure visible
    colonyGroup.add(colonyGlow);
    
    // Store colony marker data for click navigation
    colonyGroup.userData = { isColonyMarker: true };
    
    marsGroup.add(colonyGroup);
    colonyMarkerRef.current = colonyGroup;

    // Create group for craters
    const cratersGroup = new THREE.Group();
    marsGroup.add(cratersGroup);
    cratersRef.current = cratersGroup;

    // Create group for landing sites
    const landingSitesGroup = new THREE.Group();
    marsGroup.add(landingSitesGroup);
    landingSitesRef.current = landingSitesGroup;

    // Raycaster for detecting marker hover
    const raycaster = new THREE.Raycaster();
    raycasterRef.current = raycaster;

    // Mouse controls for rotation - refs are already declared above

    const updateTooltipPosition = (e: MouseEvent) => {
      if (!tooltipRef.current || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const tooltipWidth = 250; // maxWidth
      const tooltipHeight = 200; // estimated height
      
      let left = e.clientX - containerRect.left + 15;
      let top = e.clientY - containerRect.top - tooltipHeight - 10;
      
      // Keep tooltip within container bounds
      if (left + tooltipWidth > containerRect.width) {
        left = e.clientX - containerRect.left - tooltipWidth - 15;
      }
      if (left < 0) {
        left = 10;
      }
      if (top < 0) {
        top = e.clientY - containerRect.top + 20;
      }
      if (top + tooltipHeight > containerRect.height) {
        top = containerRect.height - tooltipHeight - 10;
      }
      
      tooltipRef.current.style.left = `${left}px`;
      tooltipRef.current.style.top = `${top}px`;
    };

    const checkMarkerHover = (e: MouseEvent) => {
      if (!cameraRef.current || !containerRef.current || !tooltipRef.current) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseRef.current, cameraRef.current);
      
      // Check craters first (they're smaller, so check them first)
      let hoveredObject: THREE.Object3D | null = null;
      let hoveredCrater: CraterData | null = null;
      let hoveredLandingSite: LandingSite | null = null;
      let hasHover = false;

      if (cratersRef.current && cratersRef.current.children.length > 0) {
        const craterIntersects = raycaster.intersectObjects(cratersRef.current.children, true);
        if (craterIntersects.length > 0) {
          hoveredObject = craterIntersects[0].object;
          hasHover = true;
          // Find the parent group that contains the crater data
          // First check if it's a colony crater (has craterMaterial)
          let parent = hoveredObject.parent;
          let foundColonyCrater = false;
          while (parent && parent !== cratersRef.current) {
            if (parent.userData && parent.userData.craterMaterial) {
              // Colony crater with materials - this will be handled in the tooltip section
              foundColonyCrater = true;
              break;
            }
            if (parent.userData && parent.userData.crater) {
              hoveredCrater = parent.userData.crater;
              break;
            }
            parent = parent.parent;
          }
          // If not found in parent, check the object itself
          if (!hoveredCrater && !foundColonyCrater && hoveredObject.userData && hoveredObject.userData.crater) {
            hoveredCrater = hoveredObject.userData.crater;
          }
          // Also check if the object itself has craterMaterial
          if (!foundColonyCrater && hoveredObject.userData && hoveredObject.userData.craterMaterial) {
            foundColonyCrater = true;
          }
          // If it's a colony crater, we don't want to process it as a regular crater
          if (foundColonyCrater) {
            hoveredCrater = null;
          }
        }
      }

      // Check landing sites if no crater is hovered
      if (!hoveredObject && landingSitesRef.current && landingSitesRef.current.children.length > 0) {
        const landingSiteIntersects = raycaster.intersectObjects(landingSitesRef.current.children, true);
        if (landingSiteIntersects.length > 0) {
          hoveredObject = landingSiteIntersects[0].object;
          hasHover = true;
          // Find the parent group that contains the landing site data
          let parent = hoveredObject.parent;
          while (parent && parent !== landingSitesRef.current) {
            if (parent.userData && parent.userData.landingSite) {
              hoveredLandingSite = parent.userData.landingSite;
              break;
            }
            parent = parent.parent;
          }
          // If not found in parent, check the object itself
          if (!hoveredLandingSite && hoveredObject.userData && hoveredObject.userData.landingSite) {
            hoveredLandingSite = hoveredObject.userData.landingSite;
          }
        }
      }

      // Check colony marker if no crater or landing site is hovered
      if (!hoveredObject && colonyMarkerRef.current) {
        const intersects = raycaster.intersectObjects(colonyMarkerRef.current.children, true);
        if (intersects.length > 0) {
          hoveredObject = intersects[0].object;
          hasHover = true;
        }
      }

      // Check InSight marker if no crater, landing site, or colony is hovered
      if (!hoveredObject && markerRef.current) {
        const intersects = raycaster.intersectObjects(markerRef.current.children, true);
        if (intersects.length > 0) {
          hoveredObject = intersects[0].object;
          hasHover = true;
        }
      }

      // Check if hovering over Mars itself - don't count this as blocking hover for rotation
      let hoveringOverMars = false;
      if (!hoveredObject && marsRef.current) {
        const marsIntersects = raycaster.intersectObject(marsRef.current, false);
        if (marsIntersects.length > 0) {
          hoveringOverMars = true;
          hasHover = true;
          hoveredObject = marsRef.current;
          // Show basic Mars info tooltip
          if (tooltipRef.current && !isDraggingRef.current) {
            const tooltipContent = `
              <div style="padding: 8px; min-width: 200px;">
                <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #cc4422; font-size: 14px;">
                  🪐 Mars
                </h3>
                <p style="margin: 4px 0; font-size: 11px; color: #999; font-style: italic;">
                  The Red Planet
                </p>
                <div style="margin: 4px 0; font-size: 12px; color: #666;">
                  <p style="margin: 2px 0;">
                    <strong>Diameter:</strong> 6,779 km
                  </p>
                  <p style="margin: 2px 0;">
                    <strong>Distance from Sun:</strong> 227.9 million km
                  </p>
                  <p style="margin: 2px 0;">
                    <strong>Day Length:</strong> 24.6 hours
                  </p>
                </div>
              </div>
            `;
            tooltipRef.current.innerHTML = tooltipContent;
            tooltipRef.current.style.display = 'block';
            updateTooltipPosition(e);
          }
        }
      }

      // Update hover state - only pause auto-rotate when hovering over specific markers/craters, not Mars surface
      if (hasHover !== isHoveringRef.current && !isDraggingRef.current) {
        isHoveringRef.current = hasHover;
        // Only pause auto-rotate if hovering over a marker/crater/landing site, not Mars surface
        if (hasHover && hoveredObject && !hoveringOverMars) {
          autoRotateRef.current = false; // Pause auto-rotate on hover over specific objects
        } else if (!hasHover || hoveringOverMars) {
          // Resume auto-rotate when not hovering or when hovering over Mars surface
          autoRotateRef.current = autoRotate;
          // Hide tooltip when not hovering
          if (tooltipRef.current && !hasHover) {
            tooltipRef.current.style.display = 'none';
          }
        }
      } else if (hoveringOverMars && !isDraggingRef.current) {
        // If hovering over Mars, ensure auto-rotate continues
        autoRotateRef.current = autoRotate;
      }

      if (hoveredObject && !isDraggingRef.current) {
        // Check if it's a colony crater with materials - search in parent hierarchy
        let colonyCraterData = null;
        let currentObject: THREE.Object3D | null = hoveredObject;
        while (currentObject && currentObject !== cratersRef.current) {
          if (currentObject.userData?.craterMaterial || currentObject.userData?.hasMaterials) {
            colonyCraterData = currentObject.userData.craterMaterial || currentObject.userData;
            break;
          }
          currentObject = currentObject.parent;
        }
        
        if (colonyCraterData) {
          const craterMaterial = colonyCraterData;
          const craterName = craterMaterial.craterId || 'Unnamed';
          const diameter = craterMaterial.diameter || 0;
          const lat = craterMaterial.latitude || 0;
          const lon = craterMaterial.longitude || 0;
          const explorationStatus = craterMaterial.explorationStatus || 'unexplored';
          
          const statusLabels: { [key: string]: { text: string; color: string; emoji: string } } = {
            'mapped': { text: 'Mapeado', color: '#00ff88', emoji: '✅' },
            'sampled': { text: 'Muestreado', color: '#4289e1', emoji: '🔬' },
            'scanned': { text: 'Escaneado', color: '#ffd700', emoji: '📡' },
            'unexplored': { text: 'Sin Explorar', color: '#ff6b6b', emoji: '❓' }
          };
          
          const statusInfo = statusLabels[explorationStatus] || statusLabels['unexplored'];
          
          // Build tooltip for colony crater with materials
          let tooltipContent = `
            <div style="padding: 8px; min-width: 220px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold; color: ${statusInfo.color}; font-size: 14px;">
                🌑 Crater ${craterName} ${statusInfo.emoji}
              </h3>
              <p style="margin: 4px 0; font-size: 11px; color: ${statusInfo.color}; font-weight: bold;">
                Estado: ${statusInfo.text}
              </p>
              <p style="margin: 4px 0; font-size: 11px; color: #999; font-style: italic;">
                Impact Crater with Materials
              </p>
              <div style="margin: 4px 0; font-size: 12px; color: #666;">
                <p style="margin: 2px 0;">
                  <strong>Diameter:</strong> ${diameter >= 1 ? `${diameter.toFixed(2)} km` : `${(diameter * 1000).toFixed(0)} m`}
                </p>
                <p style="margin: 2px 0;">
                  <strong>Coordinates:</strong><br>
                  ${lat >= 0 ? lat.toFixed(2) + '°N' : Math.abs(lat).toFixed(2) + '°S'}, 
                  ${lon >= 0 ? lon.toFixed(2) + '°E' : Math.abs(lon).toFixed(2) + '°W'}
                </p>
          `;
          
          if (craterMaterial.materials && craterMaterial.materials.length > 0) {
            tooltipContent += `
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
                  <p style="margin: 4px 0; font-weight: bold; color: #4a5568; font-size: 12px;">
                    🔬 Materials Found (${craterMaterial.materials.length})
                  </p>
            `;
            
            craterMaterial.materials.slice(0, 5).forEach((material: any) => {
              const uses = material.uses?.join(', ') || 'Research';
              const materialId = material.materialId || '';
              tooltipContent += `
                  <div style="margin: 4px 0; padding: 4px; background: #f7fafc; border-radius: 4px;">
                    <p style="margin: 2px 0; font-weight: 600; font-size: 11px; color: #2d3748;">
                      ${material.name} (${material.formula})
                    </p>
                    <p style="margin: 2px 0; font-size: 10px; color: #718096;">
                      Uses: ${uses}
                    </p>
                    ${materialId ? `
                    <a 
                      href="/materials/${materialId}" 
                      style="display: inline-block; margin-top: 4px; padding: 2px 6px; background: #4299e1; color: white; border-radius: 3px; cursor: pointer; font-size: 9px; text-decoration: none;"
                      onmouseover="this.style.background='#3182ce'"
                      onmouseout="this.style.background='#4299e1'"
                      onclick="event.stopPropagation();"
                    >
                      View Details →
                    </a>
                    ` : ''}
                  </div>
              `;
            });
            
            if (craterMaterial.materials.length > 5) {
              tooltipContent += `
                  <p style="margin: 4px 0; font-size: 10px; color: #718096; font-style: italic;">
                    +${craterMaterial.materials.length - 5} more materials
                  </p>
              `;
            }
            
            tooltipContent += `
                  <button 
                    onclick="window.location.href='/materials'; event.stopPropagation();"
                    style="margin-top: 8px; padding: 4px 8px; background: #4299e1; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; width: 100%;"
                    onmouseover="this.style.background='#3182ce'"
                    onmouseout="this.style.background='#4299e1'"
                  >
                    View All Materials →
                  </button>
                </div>
            `;
          }
          
          tooltipContent += `
              </div>
            </div>
          `;
          
          tooltipRef.current.innerHTML = tooltipContent;
          tooltipRef.current.style.display = 'block';
          updateTooltipPosition(e);
        } else if (hoveredCrater) {
          // Show crater tooltip with all available information
          const props = hoveredCrater.properties;
          const craterName = props.craterid || 'Unnamed';
          const diameter = props.diamkm || 0;
          const lat = props.lat || 0;
          const lon = props.lon_e || 0;
          
          // Get material data if available
          const craterId = hoveredObject.userData?.craterId || craterName;
          const materialData = craterMaterials.get(craterId);
          
          // Format diameter with appropriate units
          let diameterDisplay = '';
          if (diameter >= 1) {
            diameterDisplay = `${diameter.toFixed(2)} km`;
          } else {
            diameterDisplay = `${(diameter * 1000).toFixed(0)} m`;
          }
          
          // Build tooltip content
          let tooltipContent = `
            <div style="padding: 8px; min-width: 220px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #8b4513; font-size: 14px;">
                🌑 Crater ${craterName}
              </h3>
              <p style="margin: 4px 0; font-size: 11px; color: #999; font-style: italic;">
                Impact Crater
              </p>
              <div style="margin: 4px 0; font-size: 12px; color: #666;">
                <p style="margin: 2px 0;">
                  <strong>Diameter:</strong> ${diameterDisplay}
                </p>
                <p style="margin: 2px 0;">
                  <strong>Coordinates:</strong><br>
                  ${lat >= 0 ? lat.toFixed(2) + '°N' : Math.abs(lat).toFixed(2) + '°S'}, 
                  ${lon >= 0 ? lon.toFixed(2) + '°E' : Math.abs(lon).toFixed(2) + '°W'}
                </p>
          `;
          
          // Add materials if available - only show "No materials detected" if we've checked and there are none
          const hasCheckedForMaterials = craterMaterials.size > 0 || materialData !== undefined;
          if (materialData && materialData.materials && materialData.materials.length > 0) {
            tooltipContent += `
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
                  <p style="margin: 4px 0; font-weight: bold; color: #4a5568; font-size: 12px;">
                    🔬 Materials Found (${materialData.materials.length})
                  </p>
            `;
            
            materialData.materials.slice(0, 5).forEach((material, idx) => {
              const uses = material.uses?.join(', ') || 'Research';
              const materialId = material.materialId || '';
              tooltipContent += `
                  <div style="margin: 4px 0; padding: 4px; background: #f7fafc; border-radius: 4px;">
                    <p style="margin: 2px 0; font-weight: 600; font-size: 11px; color: #2d3748;">
                      ${material.name} (${material.formula})
                    </p>
                    <p style="margin: 2px 0; font-size: 10px; color: #718096;">
                      Uses: ${uses}
                    </p>
                    ${material.estimatedQuantity ? `
                    <p style="margin: 2px 0; font-size: 10px; color: #718096;">
                      Quantity: ${(material.estimatedQuantity / 1000).toFixed(1)} tons
                    </p>
                    ` : ''}
                    ${materialId ? `
                    <a 
                      href="/materials/${materialId}" 
                      style="display: inline-block; margin-top: 4px; padding: 2px 6px; background: #4299e1; color: white; border-radius: 3px; cursor: pointer; font-size: 9px; text-decoration: none;"
                      onmouseover="this.style.background='#3182ce'"
                      onmouseout="this.style.background='#4299e1'"
                      onclick="event.stopPropagation();"
                    >
                      View Details →
                    </a>
                    ` : ''}
                  </div>
              `;
            });
            
            if (materialData.materials.length > 5) {
              tooltipContent += `
                  <p style="margin: 4px 0; font-size: 10px; color: #718096; font-style: italic;">
                    +${materialData.materials.length - 5} more materials
                  </p>
              `;
            }
            
            tooltipContent += `
                  <button 
                    onclick="window.location.href='/materials'; event.stopPropagation();"
                    style="margin-top: 8px; padding: 4px 8px; background: #4299e1; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; width: 100%;"
                    onmouseover="this.style.background='#3182ce'"
                    onmouseout="this.style.background='#4299e1'"
                  >
                    View All Materials →
                  </button>
                </div>
            `;
          } else if (hasCheckedForMaterials) {
            // Only show "No materials detected" if we've actually checked the database
            tooltipContent += `
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
                  <p style="margin: 4px 0; font-size: 11px; color: #999; font-style: italic;">
                    No materials detected yet
                  </p>
                </div>
            `;
          }
          
          // Add any additional properties if they exist
          const additionalProps: string[] = [];
          Object.keys(props).forEach(key => {
            if (!['lon_e', 'lat', 'diamkm', 'craterid'].includes(key)) {
              const value = props[key];
              if (value !== null && value !== undefined && value !== '') {
                additionalProps.push(`<strong>${key}:</strong> ${String(value)}`);
              }
            }
          });
          
          if (additionalProps.length > 0) {
            tooltipContent += `
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
                  ${additionalProps.map(prop => `<p style="margin: 2px 0; font-size: 11px;">${prop}</p>`).join('')}
                </div>
            `;
          }
          
          tooltipContent += `
              </div>
            </div>
          `;
          
          tooltipRef.current.innerHTML = tooltipContent;
          tooltipRef.current.style.display = 'block';
          updateTooltipPosition(e);
        } else if (hoveredLandingSite) {
          // Show landing site tooltip
          hoveredLandingSiteRef.current = hoveredLandingSite;
          const site = hoveredLandingSite;
          const landingDate = new Date(site.landingDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
          
          const latDir = site.latitude >= 0 ? 'N' : 'S';
          const lonDir = site.longitude >= 0 ? 'E' : 'W';
          
          const tooltipContent = `
            <div style="padding: 8px; min-width: 240px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #4a5568; font-size: 14px;">
                🚀 ${site.mission}
              </h3>
              <p style="margin: 4px 0; font-size: 11px; color: #999; font-style: italic;">
                ${site.landingSite}
              </p>
              <div style="margin: 4px 0; font-size: 12px; color: #666;">
                <p style="margin: 2px 0;">
                  <strong>Landing Date:</strong> ${landingDate}
                </p>
                <p style="margin: 2px 0;">
                  <strong>Coordinates:</strong><br>
                  ${Math.abs(site.latitude).toFixed(2)}°${latDir}, 
                  ${Math.abs(site.longitude).toFixed(2)}°${lonDir}
                </p>
                ${site.elevationMeters ? `
                  <p style="margin: 2px 0;">
                    <strong>Elevation:</strong> ${site.elevationMeters.toFixed(0)} m
                  </p>
                ` : ''}
              </div>
            </div>
          `;
          
          tooltipRef.current.innerHTML = tooltipContent;
          tooltipRef.current.style.display = 'block';
          updateTooltipPosition(e);
        } else if (colonyMarkerRef.current && (
          colonyMarkerRef.current.children.includes(hoveredObject) || 
          (hoveredObject.parent && colonyMarkerRef.current.children.includes(hoveredObject.parent)) ||
          hoveredObject.userData?.isColonyMarker ||
          (hoveredObject.parent && hoveredObject.parent.userData?.isColonyMarker)
        )) {
          // Show Colony marker tooltip
          const tooltipContent = `
            <div style="padding: 8px; min-width: 220px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #00ff88; font-size: 14px;">
                🏛️ Lalande Colony
              </h3>
              <p style="margin: 4px 0; font-size: 11px; color: #999; font-style: italic;">
                Mars Colony Base
              </p>
              <div style="margin: 4px 0; font-size: 12px; color: #666;">
                <p style="margin: 2px 0;">
                  <strong>Location:</strong> Elysium Planitia<br>
                  <strong>Coordinates:</strong> ${COLONY_LAT >= 0 ? COLONY_LAT.toFixed(2) + '°N' : Math.abs(COLONY_LAT).toFixed(2) + '°S'}, ${COLONY_LON >= 0 ? COLONY_LON.toFixed(2) + '°E' : Math.abs(COLONY_LON).toFixed(2) + '°W'}
                </p>
                <button 
                  onclick="window.location.href='/colony'; event.stopPropagation();"
                  style="margin-top: 8px; padding: 4px 8px; background: #00ff88; color: #000; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; width: 100%; font-weight: bold;"
                  onmouseover="this.style.background='#00cc66'"
                  onmouseout="this.style.background='#00ff88'"
                >
                  View Colony Dashboard →
                </button>
              </div>
            </div>
          `;
          tooltipRef.current.innerHTML = tooltipContent;
          tooltipRef.current.style.display = 'block';
          updateTooltipPosition(e);
        } else if (markerRef.current && markerRef.current.children.includes(hoveredObject)) {
          // Show InSight marker tooltip
          if (!isHoveringMarkerRef.current) {
            isHoveringMarkerRef.current = true;
            if (!tooltipRef.current.innerHTML || tooltipRef.current.innerHTML.trim() === '') {
              tooltipRef.current.innerHTML = `
                <div style="padding: 8px;">
                  <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #ff4444; font-size: 14px;">
                    🔴 InSight Lander
                  </h3>
                  <p style="margin: 4px 0; font-size: 12px; color: #666;">
                    <strong>Location:</strong> Elysium Planitia<br>
                    <strong>Coordinates:</strong> 4.5°N, 135.9°E
                  </p>
                </div>
              `;
            }
            tooltipRef.current.style.display = 'block';
          }
          updateTooltipPosition(e);
        }
      } else {
        // No hover detected - reset everything and resume auto-rotate
        if (isHoveringMarkerRef.current || hoveredCrater || hoveredLandingSite) {
          isHoveringMarkerRef.current = false;
          hoveredLandingSiteRef.current = null;
          if (tooltipRef.current) {
            tooltipRef.current.style.display = 'none';
          }
        }
        // Reset hover state when no hover
        if (isHoveringRef.current) {
          isHoveringRef.current = false;
        }
        // Always resume auto-rotate when not hovering (unless manually disabled)
        if (!isDraggingRef.current) {
          autoRotateRef.current = autoRotate;
        }
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      // Only prevent default and stop propagation if clicking on the canvas itself
      // Don't prevent default if clicking on UI elements like buttons
      const target = e.target as HTMLElement;
      if (target === renderer.domElement || target.closest('[data-canvas-container]')) {
        e.preventDefault();
        e.stopPropagation();
        isDraggingRef.current = true;
        previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
        if (tooltipRef.current) {
          tooltipRef.current.style.display = 'none';
        }
        // Change cursor to indicate dragging
        if (renderer.domElement) {
          renderer.domElement.style.cursor = 'grabbing';
        }
        // Pause auto-rotate when manually dragging
        autoRotateRef.current = false;
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        e.preventDefault();
        e.stopPropagation();
        isDraggingRef.current = false;
        // Reset cursor
        if (renderer.domElement) {
          renderer.domElement.style.cursor = 'grab';
        }
        // Resume auto-rotate if it was enabled
        autoRotateRef.current = autoRotate;
      }
    };

    // Also handle mouseup on window to catch cases where mouse is released outside
    const onWindowMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        // Reset cursor
        if (renderer.domElement) {
          renderer.domElement.style.cursor = 'grab';
        }
        // Resume auto-rotate if it was enabled
        autoRotateRef.current = autoRotate;
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        e.preventDefault();
        e.stopPropagation();
        const deltaX = e.clientX - previousMousePositionRef.current.x;
        const deltaY = e.clientY - previousMousePositionRef.current.y;

        // Rotate the entire Mars group (Mars + all markers + craters together as one unit)
        if (marsGroupRef.current) {
          marsGroupRef.current.rotation.y += deltaX * 0.01;
          // Limit X rotation to prevent flipping
          marsGroupRef.current.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, marsGroupRef.current.rotation.x + deltaY * 0.01));
        }
        
        // Update previous position
        previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
      } else {
        // Always check for hover, but don't prevent rotation
        checkMarkerHover(e);
        // Update previous position even when not dragging
        previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const zoomSpeed = 0.05; // Reduced for smoother zoom
      const zoomFactor = e.deltaY > 0 ? 1 + zoomSpeed : 1 - zoomSpeed;
      const newLength = camera.position.length() * zoomFactor;
      // Clamp zoom between 2.5 and 15
      if (newLength >= 2.5 && newLength <= 15) {
        camera.position.normalize().multiplyScalar(newLength);
      }
    };

    // Add event listeners - ensure they work properly
    const addEventListeners = (element: HTMLElement) => {
      element.addEventListener('mousedown', onMouseDown, { passive: false });
      element.addEventListener('mouseup', onMouseUp, { passive: false });
      element.addEventListener('mousemove', onMouseMove, { passive: false });
      element.addEventListener('wheel', onWheel, { passive: false });
      element.addEventListener('mouseenter', () => {
        // Ensure pointer events work
        element.style.pointerEvents = 'auto';
      });
    };

    addEventListeners(renderer.domElement);
    addEventListeners(container);
    window.addEventListener('mouseup', onWindowMouseUp);
    renderer.domElement.addEventListener('mouseleave', () => {
      if (tooltipRef.current) {
        tooltipRef.current.style.display = 'none';
      }
      isHoveringMarkerRef.current = false;
      isDraggingRef.current = false;
      // Reset cursor
      if (renderer.domElement) {
        renderer.domElement.style.cursor = 'grab';
      }
    });

    // Animation loop - optimized for performance
    let lastTime = performance.now();
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      
      // Clamp deltaTime to prevent huge jumps when tab is inactive
      const clampedDeltaTime = Math.min(deltaTime, 100);
      
      // Rotate Mars group slowly (and everything with it) when not dragging, auto-rotate is enabled
      if (marsGroupRef.current && !isDraggingRef.current && autoRotateRef.current) {
        const rotationSpeed = 0.002 * (clampedDeltaTime / 16); // Normalize to 60fps
        marsGroupRef.current.rotation.y += rotationSpeed;
      }

      // Pulse marker - update based on deltaTime
      if (markerRef.current && markerRef.current.children.length > 1) {
        const pulseData = pulseDataRef.current;
        pulseData.scale += pulseData.speed * (clampedDeltaTime / 16);
        if (pulseData.scale > 1.3 || pulseData.scale < 0.9) {
          pulseData.speed *= -1;
        }
        const glowMesh = markerRef.current.children[1] as THREE.Mesh;
        if (glowMesh) {
          glowMesh.scale.setScalar(pulseData.scale);
        }
      }

      // Always render to ensure smooth animation
      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;

      cameraRef.current.aspect = newWidth / newHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mouseup', onWindowMouseUp);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('wheel', onWheel);
      container.removeEventListener('mousedown', onMouseDown);
      container.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('mouseleave', () => {});

      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }

      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (containerRef.current && rendererRef.current.domElement.parentNode) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
      }
      
      // Reset craters loaded flag on cleanup
      cratersLoadedRef.current = false;
    };
  }, []);

  // Load crater materials first
  useEffect(() => {
    const loadMaterials = async () => {
      try {
        const materialsResponse = await colonyService.getCraterMaterials({ limit: 1000, hasMaterials: true });
        const materialsMap = new Map<string, CraterMaterialData>();
        materialsResponse.data.forEach(material => {
          materialsMap.set(material.craterId, material);
        });
        setCraterMaterials(materialsMap);
      } catch (error) {
        console.error('Error loading crater materials:', error);
      }
    };
    
    loadMaterials();
  }, []);

  // Fetch and render craters (both from USGS and from colony database)
  useEffect(() => {
    if (!showCraters || !sceneRef.current || !cratersRef.current) return;
    
    // Prevent double loading in React StrictMode
    if (cratersLoadedRef.current) return;
    cratersLoadedRef.current = true;

    const loadCraters = async () => {
      try {
        setLoadingCraters(true);
        
        // Get craters from both sources
        const [usgsCraterData, colonyCraters] = await Promise.all([
          marsGeoService.getCratersNearLocation(INSIGHT_LAT, INSIGHT_LON, 1000).catch(() => ({ features: [] })),
          colonyService.getCraterMaterials({ limit: 100, hasMaterials: true }).catch(() => ({ data: [] }))
        ]);
        
        setCraters(usgsCraterData.features);

        // Render craters on the globe
        const cratersGroup = cratersRef.current;
        if (!cratersGroup) return;
        cratersGroup.clear();

        const marsRadius = 2.0;
        
        // Render USGS craters
        usgsCraterData.features.forEach((crater) => {
          const lat = crater.properties.lat;
          const lon = crater.properties.lon_e;
          const diameter = crater.properties.diamkm;
          
          // Skip invalid craters
          if (!lat || !lon || !diameter || diameter <= 0) {
            return;
          }

          // Convert lat/lon to 3D position
          const position = latLonToPosition(lat, lon, marsRadius);

          // Create crater visualization
          const craterScale = Math.max(0.08, Math.min(0.25, diameter / 50));
          const craterGroup = new THREE.Group();
          
          // Create crater rim (torus)
          const rimGeometry = new THREE.TorusGeometry(craterScale, craterScale * 0.2, 16, 32);
          const rimMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            emissive: 0x4a2c2a,
            emissiveIntensity: 0.5,
            side: THREE.DoubleSide,
            metalness: 0.3,
            roughness: 0.7,
          });
          const rim = new THREE.Mesh(rimGeometry, rimMaterial);
          rim.rotation.x = Math.PI / 2;
          rim.visible = true; // Ensure visible for raycasting
          rim.userData = { isCraterRim: true }; // Mark for raycasting
          craterGroup.add(rim);
          
          // Add center dot
          const centerGeometry = new THREE.SphereGeometry(craterScale * 0.4, 12, 12);
          const centerMaterial = new THREE.MeshStandardMaterial({
            color: 0xa0522d,
            emissive: 0x5a2a1a,
            emissiveIntensity: 0.6,
            metalness: 0.2,
            roughness: 0.8,
          });
          const center = new THREE.Mesh(centerGeometry, centerMaterial);
          center.visible = true; // Ensure visible for raycasting
          center.userData = { isCraterCenter: true }; // Mark for raycasting
          craterGroup.add(center);
          
          craterGroup.position.copy(position);
          craterGroup.lookAt(new THREE.Vector3(0, 0, 0));
          craterGroup.rotateX(Math.PI / 2);
          craterGroup.visible = true; // Ensure visible
          
          const craterId = crater.properties.craterid;
          craterGroup.userData = { crater, craterId };
          // Also store in rim and center for easier hover detection
          rim.userData.crater = crater;
          rim.userData.craterId = craterId;
          center.userData.crater = crater;
          center.userData.craterId = craterId;
          cratersGroup.add(craterGroup);
        });

        // Render colony craters with different colors based on exploration status
        colonyCraters.data.forEach((craterMaterial) => {
          const lat = craterMaterial.latitude;
          const lon = craterMaterial.longitude;
          const diameter = craterMaterial.diameter;
          const explorationStatus = craterMaterial.explorationStatus || 'unexplored';
          const hasMaterials = craterMaterial.materials && craterMaterial.materials.length > 0;
          
          if (!lat || !lon || !diameter || diameter <= 0) {
            return;
          }

          const position = latLonToPosition(lat, lon, marsRadius);
          const craterScale = Math.max(0.1, Math.min(0.3, diameter / 50));
          const craterGroup = new THREE.Group();
          
          // Color based on exploration status
          let color, emissiveColor, emissiveIntensity;
          if (explorationStatus === 'mapped') {
            // Mapped = Green (fully explored)
            color = 0x00ff88;
            emissiveColor = 0x00cc66;
            emissiveIntensity = 0.7;
          } else if (explorationStatus === 'sampled') {
            // Sampled = Blue (partially explored)
            color = 0x4289e1;
            emissiveColor = 0x2d6fc7;
            emissiveIntensity = 0.6;
          } else if (explorationStatus === 'scanned') {
            // Scanned = Yellow (scanned but not sampled)
            color = 0xffd700;
            emissiveColor = 0xffaa00;
            emissiveIntensity = 0.5;
          } else {
            // Unexplored = Red/Orange (not explored)
            color = hasMaterials ? 0xff6b6b : 0x8b4513;
            emissiveColor = hasMaterials ? 0xff4444 : 0x6b3410;
            emissiveIntensity = hasMaterials ? 0.8 : 0.3;
          }
          
          const rimGeometry = new THREE.TorusGeometry(craterScale, craterScale * 0.2, 16, 32);
          const rimMaterial = new THREE.MeshStandardMaterial({
            color: color,
            emissive: emissiveColor,
            emissiveIntensity: emissiveIntensity,
            side: THREE.DoubleSide,
            metalness: 0.5,
            roughness: 0.5,
          });
          const rim = new THREE.Mesh(rimGeometry, rimMaterial);
          rim.rotation.x = Math.PI / 2;
          rim.visible = true; // Ensure visible for raycasting
          rim.userData = { isCraterRim: true }; // Mark for raycasting
          craterGroup.add(rim);
          
          const centerGeometry = new THREE.SphereGeometry(craterScale * 0.5, 12, 12);
          const centerMaterial = new THREE.MeshStandardMaterial({
            color: color,
            emissive: emissiveColor,
            emissiveIntensity: emissiveIntensity + 0.1,
            metalness: 0.4,
            roughness: 0.6,
          });
          const center = new THREE.Mesh(centerGeometry, centerMaterial);
          center.visible = true; // Ensure visible for raycasting
          center.userData = { isCraterCenter: true }; // Mark for raycasting
          craterGroup.add(center);
          
          craterGroup.position.copy(position);
          craterGroup.lookAt(new THREE.Vector3(0, 0, 0));
          craterGroup.rotateX(Math.PI / 2);
          craterGroup.visible = true; // Ensure visible
          
          // Store data in group AND in individual meshes for easier access
          craterGroup.userData = { 
            craterMaterial, 
            craterId: craterMaterial.craterId, 
            hasMaterials: hasMaterials,
            explorationStatus: explorationStatus
          };
          // Also store in rim and center for easier hover detection
          rim.userData.craterMaterial = craterMaterial;
          rim.userData.hasMaterials = hasMaterials;
          center.userData.craterMaterial = craterMaterial;
          center.userData.hasMaterials = hasMaterials;
          cratersGroup.add(craterGroup);
        });
      } catch (error) {
        console.error('Error loading craters:', error);
        if (cratersRef.current) {
          cratersRef.current.clear();
        }
      } finally {
        setLoadingCraters(false);
      }
    };

    loadCraters();
  }, [showCraters, INSIGHT_LAT, INSIGHT_LON, craterMaterials]);

  // Render landing sites
  useEffect(() => {
    if (!landingSites || landingSites.length === 0 || !sceneRef.current || !landingSitesRef.current || !marsGroupRef.current) return;

    const landingSitesGroup = landingSitesRef.current;
    landingSitesGroup.clear();

    const radius = 2.05; // Slightly above surface
    const markerSize = 0.08; // Increased size for better visibility

    // Define colors for different missions (distinct colors)
    const missionColors: { [key: string]: number } = {
      'Viking 1': 0xff6b6b, // Red
      'Viking 2': 0x4ecdc4, // Cyan
      'Pathfinder': 0x95e1d3, // Light green
      'Spirit': 0xf38181, // Pink
      'Opportunity': 0xa8e6cf, // Light green
      'Phoenix': 0xffd93d, // Yellow
      'Curiosity': 0x6c5ce7, // Purple
      'InSight': 0xff4444, // Red (same as existing marker)
      'Perseverance': 0x00b894, // Teal
      'Tianwen-1': 0xe17055, // Orange
    };

    landingSites.forEach((site) => {
      const lat = site.latitude;
      const lon = site.longitude;
      
      // Skip InSight as it's already shown separately
      if (site.mission === 'InSight') return;

      const position = latLonToPosition(lat, lon, radius);
      const color = missionColors[site.mission] || 0xffffff;

      // Create marker group
      const siteGroup = new THREE.Group();
      
      // Create marker sphere
      const markerGeometry = new THREE.SphereGeometry(markerSize, 16, 16);
      const markerMaterial = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.6, // Increased for better visibility
      });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.copy(position);
      siteGroup.add(marker);

      // Add glow effect
      const glowGeometry = new THREE.SphereGeometry(markerSize * 1.5, 16, 16); // Larger glow
      const glowMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.3, // Increased opacity for better visibility
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.copy(position);
      siteGroup.add(glow);

      // Store landing site data for tooltip
      siteGroup.userData = { landingSite: site };
      
      landingSitesGroup.add(siteGroup);
    });
  }, [landingSites]);

  // Update tooltip content when weather data changes
  useEffect(() => {
    if (!tooltipRef.current) return;
    
    const weatherInfo = getWeatherInfo();
    if (!weatherInfo) {
      tooltipRef.current.innerHTML = `
        <div style="padding: 8px;">
          <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #ff4444; font-size: 14px;">
            🔴 InSight Lander
          </h3>
          <p style="margin: 4px 0; font-size: 12px; color: #666;">
            <strong>Location:</strong> Elysium Planitia<br>
            <strong>Coordinates:</strong> 4.5°N, 135.9°E
          </p>
          <p style="margin: 8px 0 0 0; font-size: 11px; color: #999;">
            Loading weather data...
          </p>
        </div>
      `;
      return;
    }

    const { sol, data } = weatherInfo;
    tooltipRef.current.innerHTML = `
      <div style="padding: 8px; min-width: 200px;">
        <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #ff4444; font-size: 14px;">
          🔴 InSight Lander
        </h3>
        <p style="margin: 4px 0; font-size: 12px; color: #666;">
          <strong>Location:</strong> Elysium Planitia<br>
          <strong>Coordinates:</strong> 4.5°N, 135.9°E
        </p>
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd;">
          <p style="margin: 4px 0; font-size: 12px; font-weight: bold;">
            Sol ${sol} - ${data.Season}
          </p>
          ${data.AT ? `
            <p style="margin: 3px 0; font-size: 11px;">
              🌡️ Temp: ${data.AT.av.toFixed(1)}°C<br>
              <span style="color: #999; font-size: 10px;">
                Min: ${data.AT.mn.toFixed(1)}°C | Max: ${data.AT.mx.toFixed(1)}°C
              </span>
            </p>
          ` : ''}
          ${data.PRE ? `
            <p style="margin: 3px 0; font-size: 11px;">
              📊 Pressure: ${data.PRE.av.toFixed(1)} Pa<br>
              <span style="color: #999; font-size: 10px;">
                Min: ${data.PRE.mn.toFixed(1)} Pa | Max: ${data.PRE.mx.toFixed(1)} Pa
              </span>
            </p>
          ` : ''}
          ${data.HWS ? `
            <p style="margin: 3px 0; font-size: 11px;">
              💨 Wind: ${data.HWS.av.toFixed(2)} m/s<br>
              <span style="color: #999; font-size: 10px;">
                Min: ${data.HWS.mn.toFixed(2)} m/s | Max: ${data.HWS.mx.toFixed(2)} m/s
              </span>
            </p>
          ` : ''}
          ${data.WD?.most_common ? `
            <p style="margin: 3px 0; font-size: 11px;">
              🧭 Direction: ${data.WD.most_common.compass_point} (${data.WD.most_common.compass_degrees}°)
            </p>
          ` : ''}
        </div>
      </div>
    `;
  }, [weatherData]);

  // Update autoRotate ref when state changes
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  // Get weather info for display
  const getWeatherInfo = () => {
    if (!weatherData) return null;

    const latestSol = nasaService.getLatestSol(weatherData);
    if (!latestSol) return null;

    const latestData = weatherData[latestSol] as SolData;
    return { sol: latestSol, data: latestData };
  };

  const weatherInfo = getWeatherInfo();

  // Build tooltip content
  const getTooltipContent = () => {
    if (!weatherInfo) {
      return `
        <div style="padding: 8px;">
          <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #ff4444; font-size: 14px;">
            🔴 InSight Lander
          </h3>
          <p style="margin: 4px 0; font-size: 12px; color: #666;">
            <strong>Location:</strong> Elysium Planitia<br>
            <strong>Coordinates:</strong> 4.5°N, 135.9°E
          </p>
          <p style="margin: 8px 0 0 0; font-size: 11px; color: #999;">
            Loading weather data...
          </p>
        </div>
      `;
    }

    const { sol, data } = weatherInfo;
    return `
      <div style="padding: 8px; min-width: 200px;">
        <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #ff4444; font-size: 14px;">
          🔴 InSight Lander
        </h3>
        <p style="margin: 4px 0; font-size: 12px; color: #666;">
          <strong>Location:</strong> Elysium Planitia<br>
          <strong>Coordinates:</strong> 4.5°N, 135.9°E
        </p>
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd;">
          <p style="margin: 4px 0; font-size: 12px; font-weight: bold;">
            Sol ${sol} - ${data.Season}
          </p>
          ${data.AT ? `
            <p style="margin: 3px 0; font-size: 11px;">
              🌡️ Temp: ${data.AT.av.toFixed(1)}°C<br>
              <span style="color: #999; font-size: 10px;">
                Min: ${data.AT.mn.toFixed(1)}°C | Max: ${data.AT.mx.toFixed(1)}°C
              </span>
            </p>
          ` : ''}
          ${data.PRE ? `
            <p style="margin: 3px 0; font-size: 11px;">
              📊 Pressure: ${data.PRE.av.toFixed(1)} Pa<br>
              <span style="color: #999; font-size: 10px;">
                Min: ${data.PRE.mn.toFixed(1)} Pa | Max: ${data.PRE.mx.toFixed(1)} Pa
              </span>
            </p>
          ` : ''}
          ${data.HWS ? `
            <p style="margin: 3px 0; font-size: 11px;">
              💨 Wind: ${data.HWS.av.toFixed(2)} m/s<br>
              <span style="color: #999; font-size: 10px;">
                Min: ${data.HWS.mn.toFixed(2)} m/s | Max: ${data.HWS.mx.toFixed(2)} m/s
              </span>
            </p>
          ` : ''}
          ${data.WD?.most_common ? `
            <p style="margin: 3px 0; font-size: 11px;">
              🧭 Direction: ${data.WD.most_common.compass_point} (${data.WD.most_common.compass_degrees}°)
            </p>
          ` : ''}
        </div>
      </div>
    `;
  };

  return (
    <div className="card bg-base-200 shadow-xl">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <h2 className="card-title">
            <span className="text-2xl">🔴</span>
            Mars 3D Globe - Landing Sites
          </h2>
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className="btn btn-sm btn-outline"
            title={autoRotate ? 'Pausar rotación automática' : 'Reanudar rotación automática'}
          >
            {autoRotate ? '⏸️ Pausar' : '▶️ Reanudar'}
          </button>
        </div>
        
        {weatherInfo && (
          <div className="mb-2">
            <p className="text-sm">
              <strong>Sol {weatherInfo.sol}</strong> - {weatherInfo.data.Season}
              {weatherInfo.data.AT && (
                <span className="ml-2">🌡️ {weatherInfo.data.AT.av.toFixed(1)}°C</span>
              )}
            </p>
          </div>
        )}

        <div style={{ position: 'relative' }}>
          <div
            ref={containerRef}
            data-canvas-container
            style={{
              height: '500px',
              width: '100%',
              borderRadius: '8px',
              overflow: 'hidden',
              marginTop: '1rem',
              background: 'radial-gradient(circle, #1a1a2e 0%, #000000 100%)',
              position: 'relative',
              touchAction: 'none', // Prevent default touch behaviors
            }}
            className="border border-base-300"
          />
          
          {/* Tooltip - positioned relative to parent container */}
          <div
            ref={tooltipRef}
            style={{
              position: 'absolute',
              display: 'none',
              pointerEvents: 'none',
              zIndex: 1000,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #ddd',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              maxWidth: '250px',
              top: 0,
              left: 0,
            }}
          />
        </div>
        
        <div className="text-xs opacity-60 mt-2 space-y-1">
          <div>🔴 Red marker: InSight Lander at Elysium Planitia (4.5°N, 135.9°E)</div>
          <div>🏛️ Green marker: Lalande Colony at Elysium Planitia (4.8°N, 136.2°E)</div>
          {landingSites && landingSites.length > 0 && (
            <div>
              🚀 Colored markers: {landingSites.length} Landing Sites ({landingSites.filter(s => s.mission !== 'InSight').length} shown on globe)
            </div>
          )}
          {showCraters && (
            <div>
              🌑 Craters {loadingCraters ? '(loading...)' : `(${craters.length} shown)`}
              <div className="ml-4 mt-1 text-xs">
                <div>✅ Verde: Mapeado | 🔬 Azul: Muestreado | 📡 Amarillo: Escaneado | ❓ Rojo: Sin Explorar</div>
              </div>
            </div>
          )}
          <div>🖱️ Hover over markers and craters for details | Click and drag to rotate | Scroll to zoom</div>
        </div>
      </div>
    </div>
  );
};

