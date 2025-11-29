/**
 * ISS Globe Component
 * Displays interactive 3D Earth globe with ISS location
 * Follows Single Responsibility Principle - only handles 3D visualization
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useISSLocation } from '../hooks/useISSLocation';

export const ISSGlobe = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const earthRef = useRef<THREE.Mesh | null>(null);
  const issMarkerRef = useRef<THREE.Group | null>(null);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const animationIdRef = useRef<number | null>(null);
  const isHoveringMarkerRef = useRef<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  const previousMousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const autoRotateRef = useRef<boolean>(true);

  const { location } = useISSLocation(5000); // Update every 5 seconds

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
    scene.background = null;
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
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

    // Create Earth sphere
    const geometry = new THREE.SphereGeometry(2, 64, 64);
    const fallbackMaterial = new THREE.MeshStandardMaterial({
      color: 0x2233ff,
      roughness: 0.8,
      metalness: 0.2,
    });

    const earth = new THREE.Mesh(geometry, fallbackMaterial);
    scene.add(earth);
    earthRef.current = earth;

    // Load Earth texture
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      'https://raw.githubusercontent.com/turban/webgl-earth/master/images/2_no_clouds_4k.jpg',
      (texture) => {
        if (earthRef.current) {
          const material = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.8,
            metalness: 0.2,
          });
          earthRef.current.material = material;
        }
      },
      undefined,
      (error) => {
        console.warn('Failed to load Earth texture, using fallback:', error);
      }
    );

    // Create ISS marker group
    const issGroup = new THREE.Group();
    scene.add(issGroup);
    issMarkerRef.current = issGroup;

    // Raycaster
    const raycaster = new THREE.Raycaster();
    raycasterRef.current = raycaster;

    const updateTooltipPosition = (e: MouseEvent) => {
      if (!tooltipRef.current || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const tooltipWidth = 250;
      const tooltipHeight = 150;

      let left = e.clientX - containerRect.left + 15;
      let top = e.clientY - containerRect.top - tooltipHeight - 10;

      if (left + tooltipWidth > containerRect.width) {
        left = e.clientX - containerRect.left - tooltipWidth - 15;
      }
      if (left < 0) left = 10;
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
      if (!cameraRef.current || !containerRef.current || !tooltipRef.current || !issMarkerRef.current) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseRef.current, cameraRef.current);
      const intersects = raycaster.intersectObjects(issMarkerRef.current.children, true);

      if (intersects.length > 0 && !isDraggingRef.current && location) {
        if (!isHoveringMarkerRef.current) {
          isHoveringMarkerRef.current = true;
          const date = new Date(location.timestamp * 1000);
          tooltipRef.current.innerHTML = `
            <div style="padding: 8px; min-width: 220px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #3b82f6; font-size: 14px;">
                🛰️ International Space Station
              </h3>
              <p style="margin: 4px 0; font-size: 12px; color: #666;">
                <strong>Coordinates:</strong><br>
                ${parseFloat(location.iss_position.latitude).toFixed(4)}°N, ${parseFloat(location.iss_position.longitude).toFixed(4)}°E
              </p>
              <p style="margin: 4px 0; font-size: 11px; color: #999;">
                <strong>Speed:</strong> ~28,000 km/h<br>
                <strong>Updated:</strong> ${date.toLocaleTimeString()}
              </p>
            </div>
          `;
          tooltipRef.current.style.display = 'block';
        }
        updateTooltipPosition(e);
      } else {
        if (isHoveringMarkerRef.current) {
          isHoveringMarkerRef.current = false;
          tooltipRef.current.style.display = 'none';
        }
      }
    };

    const onMouseDown = (e: MouseEvent) => {
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
    };

    const onMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isDraggingRef.current = false;
      // Reset cursor
      if (renderer.domElement) {
        renderer.domElement.style.cursor = 'grab';
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        e.preventDefault();
        e.stopPropagation();
        const deltaX = e.clientX - previousMousePositionRef.current.x;
        const deltaY = e.clientY - previousMousePositionRef.current.y;

        // Rotate Earth and ISS marker together
        if (earthRef.current) {
          earthRef.current.rotation.y += deltaX * 0.01;
          // Limit X rotation to prevent flipping
          earthRef.current.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, earthRef.current.rotation.x + deltaY * 0.01));
        }

        if (issMarkerRef.current) {
          issMarkerRef.current.rotation.y += deltaX * 0.01;
          issMarkerRef.current.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, issMarkerRef.current.rotation.x + deltaY * 0.01));
        }

        previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
      } else {
        checkMarkerHover(e);
        previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    // Also handle mouseup on window to catch cases where mouse is released outside
    const onWindowMouseUp = () => {
      isDraggingRef.current = false;
      // Reset cursor
      if (renderer.domElement) {
        renderer.domElement.style.cursor = 'grab';
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const zoomSpeed = 0.05;
      const zoomFactor = e.deltaY > 0 ? 1 + zoomSpeed : 1 - zoomSpeed;
      const newLength = camera.position.length() * zoomFactor;
      if (newLength >= 2.5 && newLength <= 15) {
        camera.position.normalize().multiplyScalar(newLength);
      }
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown, { passive: false });
    renderer.domElement.addEventListener('mouseup', onMouseUp, { passive: false });
    renderer.domElement.addEventListener('mousemove', onMouseMove, { passive: false });
    // Also add to container as fallback
    container.addEventListener('mousedown', onMouseDown, { passive: false });
    container.addEventListener('mouseup', onMouseUp, { passive: false });
    container.addEventListener('mousemove', onMouseMove, { passive: false });
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('wheel', onWheel, { passive: false });
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
      
      // Only update if enough time has passed (throttle to ~60fps)
      if (deltaTime < 16) {
        renderer.render(scene, camera);
        return;
      }

      if (earthRef.current && !isDraggingRef.current && autoRotateRef.current) {
        const rotationSpeed = 0.002 * (deltaTime / 16); // Normalize to 60fps
        earthRef.current.rotation.y += rotationSpeed;
      }

      if (issMarkerRef.current && !isDraggingRef.current && autoRotateRef.current) {
        const rotationSpeed = 0.002 * (deltaTime / 16); // Normalize to 60fps
        issMarkerRef.current.rotation.y += rotationSpeed;
      }

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

      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }

      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (containerRef.current && rendererRef.current.domElement.parentNode) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
      }
    };
  }, []);

  // Update ISS marker position when location changes
  useEffect(() => {
    if (!location || !issMarkerRef.current || !sceneRef.current) return;

    const radius = 2.05; // Slightly above Earth surface
    const lat = parseFloat(location.iss_position.latitude);
    const lon = parseFloat(location.iss_position.longitude);
    const position = latLonToPosition(lat, lon, radius);

    // Clear existing marker
    issMarkerRef.current.clear();

    // Create ISS marker (blue/white to represent space station) - make it larger and more visible
    const markerGeometry = new THREE.SphereGeometry(0.08, 16, 16);
    const markerMaterial = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x1e40af,
      emissiveIntensity: 0.8,
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.copy(position);
    marker.userData = { isISSMarker: true }; // Mark for raycasting
    issMarkerRef.current.add(marker);

    // Add glow effect - make it more visible
    const glowGeometry = new THREE.SphereGeometry(0.12, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.4,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.copy(position);
    issMarkerRef.current.add(glow);

    // Ensure marker is visible
    marker.visible = true;
    glow.visible = true;
  }, [location]);

  // Update autoRotate ref when state changes
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  return (
    <div className="card bg-base-200 shadow-xl">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <h2 className="card-title">
            <span className="text-2xl">🛰️</span>
            ISS Location - Earth 3D Globe
          </h2>
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className="btn btn-sm btn-outline"
            title={autoRotate ? 'Pausar rotación automática' : 'Reanudar rotación automática'}
          >
            {autoRotate ? '⏸️ Pausar' : '▶️ Reanudar'}
          </button>
        </div>

        <div style={{ position: 'relative' }}>
          <div
            ref={containerRef}
            style={{
              height: '500px',
              width: '100%',
              borderRadius: '8px',
              overflow: 'hidden',
              marginTop: '1rem',
              background: 'radial-gradient(circle, #1a1a2e 0%, #000000 100%)',
              position: 'relative',
              touchAction: 'none',
            }}
            className="border border-base-300"
          />

          {/* Tooltip */}
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
          <div>🛰️ Blue marker: ISS current location</div>
          <div>🖱️ Hover over marker for details | Click and drag to rotate | Scroll to zoom</div>
        </div>
      </div>
    </div>
  );
};

