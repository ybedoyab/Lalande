/**
 * Crystal Toolkit Wrapper Component
 * Wraps MP React Components' CrystalToolkitScene for displaying crystal structures
 * Converts our structure format to the format expected by CrystalToolkitScene
 */

import { useMemo } from 'react';
import { CrystalToolkitScene } from '@materialsproject/mp-react-components';

interface CrystalToolkitWrapperProps {
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
      xyz?: [number, number, number];
      abc?: [number, number, number];
    }>;
  };
  formula?: string;
}

/**
 * Convert our structure format to pymatgen Structure format for CrystalToolkitScene
 * CrystalToolkitScene expects a structure in pymatgen's JSON format
 */
const convertToPymatgenStructure = (structure: CrystalToolkitWrapperProps['structure']) => {
  if (!structure || !structure.lattice || !structure.sites) {
    return null;
  }

  const { lattice, sites } = structure;

  // Build lattice matrix from parameters
  const a = lattice.a || 1;
  const b = lattice.b || 1;
  const c = lattice.c || 1;
  const alpha = (lattice.alpha || 90) * (Math.PI / 180);
  const beta = (lattice.beta || 90) * (Math.PI / 180);
  const gamma = (lattice.gamma || 90) * (Math.PI / 180);

  // Calculate lattice matrix (triclinic to Cartesian conversion)
  const cosAlpha = Math.cos(alpha);
  const cosBeta = Math.cos(beta);
  const cosGamma = Math.cos(gamma);
  const sinGamma = Math.sin(gamma);
  
  const matrix = [
    [a, 0, 0],
    [b * cosGamma, b * sinGamma, 0],
    [
      c * cosBeta,
      c * (cosAlpha - cosBeta * cosGamma) / sinGamma,
      c * Math.sqrt(1 - cosBeta ** 2 - ((cosAlpha - cosBeta * cosGamma) / sinGamma) ** 2),
    ],
  ];

  // Convert to pymatgen Structure format
  // CrystalToolkitScene expects a structure object with lattice and sites
  const pymatgenStructure = {
    '@module': 'pymatgen.core.structure',
    '@class': 'Structure',
    lattice: {
      matrix: matrix,
    },
    sites: sites.map((site) => {
      // Use fractional coordinates (abc) if available
      // Note: Our backend stores fractional coords in xyz field when extracted from 'abc' in pymatgen
      let coords: [number, number, number];
      if (site.abc) {
        coords = site.abc;
      } else if (site.xyz) {
        // If xyz contains fractional coordinates (from backend's 'abc' extraction)
        // Check if values are in [0,1] range (typical for fractional)
        const isFractional = site.xyz.every((val: number) => val >= 0 && val <= 1);
        if (isFractional) {
          coords = site.xyz as [number, number, number];
        } else {
          // Convert Cartesian to fractional using inverse lattice matrix
          // For now, simple division (works for orthogonal lattices)
          coords = [
            site.xyz[0] / a,
            site.xyz[1] / b,
            site.xyz[2] / c,
          ] as [number, number, number];
        }
      } else {
        coords = [0, 0, 0];
      }
      
      const species = site.species[0]?.element || 'X';
      
      return {
        species: [{ element: species, occu: site.species[0]?.occu || 1 }],
        abc: coords,
        label: site.label || species,
      };
    }),
  };

  return pymatgenStructure;
};

export const CrystalToolkitWrapper = ({ structure, formula }: CrystalToolkitWrapperProps) => {
  const pymatgenStructure = useMemo(() => {
    return convertToPymatgenStructure(structure);
  }, [structure]);

  if (!pymatgenStructure || !structure?.sites || structure.sites.length === 0) {
    return (
      <div className="card bg-base-200 shadow-xl h-full flex items-center justify-center min-h-[400px]">
        <div className="card-body p-0">
          <div className="flex justify-center items-center h-full">
            <img 
              src="/Fe.png" 
              alt="Estructura" 
              className="max-w-full max-h-[500px] object-contain"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-200 shadow-xl h-full min-h-[500px]">
      <div className="card-body p-0">
        <div style={{ width: '100%', height: '500px', position: 'relative' }}>
          <CrystalToolkitScene
            data={pymatgenStructure}
            sceneSize="100%"
            settings={{
              renderer: 'webgl',
              antialias: true,
              transparentBackground: false,
              background: '#1e2329',
              staticScene: true,
              extractAxis: false,
              defaultZoom: 0.8,
              sphereSegments: 32,
              cylinderSegments: 16,
            }}
            showControls={true}
            showExpandButton={true}
            showExportButton={true}
            showImageButton={true}
            showPositionButton={true}
            className="w-full h-full"
          />
        </div>
        {formula && (
          <div className="p-4 border-t border-base-300 bg-base-200">
            <p className="text-sm font-semibold text-base-content">Fórmula: {formula}</p>
          </div>
        )}
      </div>
    </div>
  );
};

