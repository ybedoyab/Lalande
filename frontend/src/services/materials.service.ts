/**
 * Materials Project Service
 * Handles Materials Project API calls through backend proxy
 * Follows Single Responsibility Principle - handles only Materials Project API calls
 */

import type { MaterialsProjectSummary } from '../types/materials.types';

// Get API base URL from environment variable (must have VITE_ prefix)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

class MaterialsService {
  /**
   * Get material summary by material ID
   * Uses backend proxy to avoid CORS issues and handle authentication
   * @param materialId Materials Project material ID (e.g., "mp-1234")
   */
  async getMaterialSummary(materialId: string): Promise<MaterialsProjectSummary | null> {
    try {
      const url = `${API_BASE_URL}/api/materials/${materialId}`;
      
      console.log('Fetching material from backend:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        console.error('Backend API error:', errorData);
        throw new Error(errorData.message || errorData.error || `API error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        return result.data;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching material data:', error);
      throw error;
    }
  }

  /**
   * Search materials by formula
   * @param formula Chemical formula (e.g., "Fe2O3")
   */
  async searchByFormula(formula: string): Promise<MaterialsProjectSummary[]> {
    try {
      const url = `${API_BASE_URL}/api/materials/search/formula/${encodeURIComponent(formula)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.message || errorData.error || `API error: ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error searching materials:', error);
      throw error;
    }
  }

  /**
   * Helper method to fetch additional material properties
   */
  private async fetchProperty(materialId: string, property: string): Promise<any> {
    try {
      const url = `${API_BASE_URL}/api/materials/${materialId}/${property}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.message || errorData.error || `API error: ${response.status}`);
      }

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error(`Error fetching ${property}:`, error);
      return null;
    }
  }

  async getBandStructure(materialId: string) {
    return this.fetchProperty(materialId, 'bandstructure');
  }

  async getMagnetism(materialId: string) {
    return this.fetchProperty(materialId, 'magnetism');
  }

  async getElasticity(materialId: string) {
    return this.fetchProperty(materialId, 'elasticity');
  }

  async getEOS(materialId: string) {
    return this.fetchProperty(materialId, 'eos');
  }

  async getXAS(materialId: string) {
    return this.fetchProperty(materialId, 'xas');
  }

  async getSurfaceProperties(materialId: string) {
    return this.fetchProperty(materialId, 'surface-properties');
  }

  async getSimilarMaterials(materialId: string, limit: number = 10) {
    try {
      const url = `${API_BASE_URL}/api/materials/${materialId}/similarity?limit=${limit}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        if (response.status === 404) return [];
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.message || errorData.error || `API error: ${response.status}`);
      }

      const result = await response.json();
      return result.success ? result.data : [];
    } catch (error) {
      console.error('Error fetching similar materials:', error);
      return [];
    }
  }

  async getGrainBoundaries(materialId: string) {
    return this.fetchProperty(materialId, 'grain-boundaries');
  }

  async getSubstrates(materialId: string) {
    return this.fetchProperty(materialId, 'substrates');
  }

  async getAlloys(materialId: string) {
    return this.fetchProperty(materialId, 'alloys');
  }
}

// Create singleton instance
const materialsService = new MaterialsService();

// Export singleton instance (follows DRY)
export { materialsService };
