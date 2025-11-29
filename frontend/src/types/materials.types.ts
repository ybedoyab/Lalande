/**
 * Materials Project API Types
 * Types for Materials Project API responses
 */

export interface MaterialsProjectSummary {
  material_id: string;
  formula_pretty: string;
  formula_anonymous: string;
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
  density?: number;
  density_atomic?: number;
  symmetry?: {
    crystal_system?: string;
    symbol?: string;
    number?: number;
  };
  formation_energy_per_atom?: number;
  energy_above_hull?: number;
  band_gap?: number;
  is_gap_direct?: boolean;
  is_metal?: boolean;
  is_magnetic?: boolean;
  total_magnetization?: number;
  ordering?: string;
  num_sites?: number;
  num_elements?: number;
  elements?: string[];
  nelements?: number;
  nsites?: number;
  energy_per_atom?: number;
  energy_above_hull?: number;
  formation_energy_per_atom?: number;
  e_above_hull?: number;
  e_formation?: number;
  e_total?: number;
  volume?: number;
  density?: number;
  total_magnetization?: number;
  band_gap?: number;
  is_stable?: boolean;
  is_gap_direct?: boolean;
  is_metal?: boolean;
  is_magnetic?: boolean;
  [key: string]: unknown; // Allow additional properties from API
}

export interface MaterialsProjectResponse {
  data: MaterialsProjectSummary[];
  meta?: {
    total_doc?: number;
    page_total?: number;
  };
}

