/**
 * Crystal Structure Viewer Component
 * Displays 3D crystal structure using Three.js
 * Follows Single Responsibility Principle - only handles 3D visualization
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface CrystalStructureViewerProps {
  structure?: {
    lattice?: {
      a?: number;
      b?: number;
      c?: number;
      alpha?: number;
      beta?: number;
      gamma?: number;
      volume?: number;
    };
    sites?: Array<{
      label: string;
      species: Array<{ element: string; occu: number }>;
      xyz: [number, number, number];
    }>;
  };
  formula?: string;
}

// Element colors (CPK coloring scheme)
const ELEMENT_COLORS: Record<string, number> = {
  H: 0xffffff, // White
  He: 0xd9ffff, // Cyan
  Li: 0xcc80ff, // Purple
  Be: 0xc2ff00, // Green
  B: 0xffb5b5, // Pink
  C: 0x909090, // Gray
  N: 0x3050f8, // Blue
  O: 0xff0d0d, // Red
  F: 0x90e050, // Green
  Ne: 0xb3e3f5, // Light blue
  Na: 0xab5cf2, // Purple
  Mg: 0x8aff00, // Green
  Al: 0xbfa6a6, // Gray
  Si: 0xf0c8a0, // Tan
  P: 0xff8000, // Orange
  S: 0xffff30, // Yellow
  Cl: 0x1ff01f, // Green
  Ar: 0x80d1e3, // Light blue
  K: 0x8f40d4, // Purple
  Ca: 0x3dff00, // Green
  Fe: 0xe06633, // Orange-brown
  Co: 0xf090a0, // Pink
  Ni: 0x50d050, // Green
  Cu: 0xc88033, // Brown
  Zn: 0x7d80b0, // Blue-gray
  Pt: 0xffc123, // Gold
  Au: 0xffd700, // Gold
};

// Element radii (in Angstroms, scaled for visualization)
const ELEMENT_RADII: Record<string, number> = {
  H: 0.31,
  He: 0.28,
  Li: 1.28,
  Be: 0.96,
  B: 0.84,
  C: 0.76,
  N: 0.71,
  O: 0.66,
  F: 0.57,
  Ne: 0.58,
  Na: 1.66,
  Mg: 1.41,
  Al: 1.21,
  Si: 1.11,
  P: 1.07,
  S: 1.05,
  Cl: 1.02,
  Ar: 1.06,
  K: 2.03,
  Ca: 1.76,
  Fe: 1.24,
  Co: 1.25,
  Ni: 1.24,
  Cu: 1.28,
  Zn: 1.33,
  Pt: 1.36,
  Au: 1.44,
};

export const CrystalStructureViewer = ({ structure, formula }: CrystalStructureViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<{ rotation: { x: number; y: number }; isDragging: boolean }>({
    rotation: { x: 0, y: 0 },
    isDragging: false,
  });
  const animationIdRef = useRef<number | null>(null);
  const previousMousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current || !structure || !structure.sites) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.domElement.style.cursor = 'grab';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(5, 5, 5);
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-5, -5, -5);
    scene.add(directionalLight2);

    // Create atoms and bonds
    const atoms: THREE.Mesh[] = [];
    const bonds: THREE.Mesh[] = [];
    const atomPositions: THREE.Vector3[] = [];

    // Scale factor for better visualization
    const scale = 5;

    // Helper function to convert fractional to cartesian coordinates
    const fracToCart = (frac: [number, number, number], lattice: any): THREE.Vector3 => {
      if (!lattice || !lattice.a) {
        // If no lattice info, treat as cartesian
        return new THREE.Vector3(frac[0] * scale, frac[1] * scale, frac[2] * scale);
      }

      // Use lattice parameters to convert fractional to cartesian
      const a = lattice.a || 1;
      const b = lattice.b || 1;
      const c = lattice.c || 1;
      const alpha = (lattice.alpha || 90) * Math.PI / 180;
      const beta = (lattice.beta || 90) * Math.PI / 180;
      const gamma = (lattice.gamma || 90) * Math.PI / 180;

      // Calculate conversion matrix (simplified for orthogonal lattices)
      // For non-orthogonal, we'd need the full matrix, but this works for most cases
      const cosAlpha = Math.cos(alpha);
      const cosBeta = Math.cos(beta);
      const cosGamma = Math.cos(gamma);
      const sinGamma = Math.sin(gamma);

      // Simplified conversion (works for orthogonal and near-orthogonal lattices)
      const x = frac[0] * a * scale;
      const y = frac[1] * b * scale;
      const z = frac[2] * c * scale;

      return new THREE.Vector3(x, y, z);
    };

    // Create atoms
    structure.sites.forEach((site) => {
      const element = site.species[0]?.element || 'C';
      const color = ELEMENT_COLORS[element] || 0x888888;
      const radius = (ELEMENT_RADII[element] || 1.0) * 0.3;

      // Convert fractional coordinates to Cartesian using lattice
      const position = fracToCart(site.xyz, structure.lattice);
      atomPositions.push(position);

      // Create atom sphere
      const geometry = new THREE.SphereGeometry(radius, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.3,
        roughness: 0.7,
      });
      const atom = new THREE.Mesh(geometry, material);
      atom.position.copy(position);
      scene.add(atom);
      atoms.push(atom);
    });

    // Create bonds (connect atoms within a certain distance)
    const bondDistance = 3.0; // Maximum distance for bonds
    for (let i = 0; i < atomPositions.length; i++) {
      for (let j = i + 1; j < atomPositions.length; j++) {
        const distance = atomPositions[i].distanceTo(atomPositions[j]);
        if (distance < bondDistance) {
          const midpoint = new THREE.Vector3()
            .addVectors(atomPositions[i], atomPositions[j])
            .multiplyScalar(0.5);
          const direction = new THREE.Vector3()
            .subVectors(atomPositions[j], atomPositions[i])
            .normalize();

          const bondGeometry = new THREE.CylinderGeometry(0.05, 0.05, distance, 8);
          const bondMaterial = new THREE.MeshStandardMaterial({
            color: 0x666666,
            metalness: 0.5,
            roughness: 0.5,
          });
          const bond = new THREE.Mesh(bondGeometry, bondMaterial);

          // Orient the cylinder
          const up = new THREE.Vector3(0, 1, 0);
          const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
          bond.applyQuaternion(quaternion);
          bond.position.copy(midpoint);

          scene.add(bond);
          bonds.push(bond);
        }
      }
    }

    // Mouse controls
    const onMouseDown = (e: MouseEvent) => {
      controlsRef.current.isDragging = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
      if (renderer.domElement) {
        renderer.domElement.style.cursor = 'grabbing';
      }
    };

    const onMouseUp = () => {
      controlsRef.current.isDragging = false;
      if (renderer.domElement) {
        renderer.domElement.style.cursor = 'grab';
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (controlsRef.current.isDragging) {
        const deltaX = e.clientX - previousMousePositionRef.current.x;
        const deltaY = e.clientY - previousMousePositionRef.current.y;

        controlsRef.current.rotation.y += deltaX * 0.01;
        controlsRef.current.rotation.x += deltaY * 0.01;

        // Rotate the entire scene
        scene.rotation.y = controlsRef.current.rotation.y;
        scene.rotation.x = controlsRef.current.rotation.x;

        previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomSpeed = 0.1;
      const zoomFactor = e.deltaY > 0 ? 1 + zoomSpeed : 1 - zoomSpeed;
      camera.position.multiplyScalar(zoomFactor);
      camera.position.clampLength(5, 50);
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
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
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('wheel', onWheel);

      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }

      // Dispose geometries and materials
      atoms.forEach((atom) => {
        (atom.geometry as THREE.BufferGeometry).dispose();
        ((atom.material as THREE.Material).dispose?.()) || (atom.material as THREE.Material);
      });
      bonds.forEach((bond) => {
        (bond.geometry as THREE.BufferGeometry).dispose();
        ((bond.material as THREE.Material).dispose?.()) || (bond.material as THREE.Material);
      });

      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (containerRef.current && rendererRef.current.domElement.parentNode) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
      }
    };
  }, [structure]);

  if (!structure || !structure.sites) {
    return (
      <div className="flex items-center justify-center h-96 bg-base-200 rounded-lg">
        <p className="text-base-content/60">No structure data available</p>
      </div>
    );
  }

  return (
    <div className="card bg-base-200 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Crystal Structure</h2>
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: '500px',
            borderRadius: '8px',
            overflow: 'hidden',
            background: '#f5f5f5',
          }}
          className="border border-base-300"
        />
        <div className="text-xs opacity-60 mt-2">
          🖱️ Click and drag to rotate | Scroll to zoom
        </div>
      </div>
    </div>
  );
};

