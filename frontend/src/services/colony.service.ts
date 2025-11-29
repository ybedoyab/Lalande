/**
 * Colony Service
 * Handles API calls for colony resources and crater materials
 */

import { apiService } from './api.service';

export type ResourceType = 'water' | 'oxygen' | 'energy' | 'food' | 'constructionMaterials' | 'lifeSupportMaterials';

export type Resource = {
  current: number;
  max: number;
  consumptionRate: number;
  unit: string;
};

export type ResourceMonitor = {
  _id: string;
  colonyId: string;
  resources: {
    water: Resource;
    oxygen: Resource;
    energy: Resource;
    food: Resource;
    constructionMaterials: Resource;
    lifeSupportMaterials: Resource;
  };
  population: {
    current: number;
    max: number;
    growthRate: number;
  };
  status: 'healthy' | 'warning' | 'critical' | 'emergency';
  lastUpdate: string;
  history: Array<{
    timestamp: string;
    resources: {
      water: number;
      oxygen: number;
      energy: number;
      food: number;
      constructionMaterials: number;
      lifeSupportMaterials: number;
    };
    population: number;
    status: string;
  }>;
  simulation: {
    enabled: boolean;
    updateInterval: number;
    lastSimulation: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type CraterMaterialData = {
  _id: string;
  craterId: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  latitude: number;
  longitude: number;
  diameter: number;
  materials: Array<{
    materialId: string;
    name: string;
    formula: string;
    composition: Record<string, number>;
    estimatedQuantity: number;
    purity: number;
    uses: string[];
    description: string;
    properties?: {
      density?: number;
      meltingPoint?: number;
      boilingPoint?: number;
      hardness?: number;
      conductivity?: number;
    };
    discoveredAt: string;
  }>;
  explorationStatus: 'unexplored' | 'scanned' | 'sampled' | 'mapped';
  lastExplored: string;
  explorationPriority: number;
  createdAt: string;
  updatedAt: string;
};

export type CraterMaterialsResponse = {
  success: boolean;
  count: number;
  total: number;
  skip: number;
  limit: number;
  data: CraterMaterialData[];
};

export type ResourceHistoryResponse = {
  success: boolean;
  count: number;
  data: ResourceMonitor['history'];
};

class ColonyService {
  /**
   * Obtiene el estado actual del monitor de recursos
   */
  async getResourceMonitor(): Promise<ResourceMonitor> {
    const response = await apiService.get<{ success: boolean; data: ResourceMonitor }>('/api/resources');
    return response.data;
  }

  /**
   * Agrega recursos a la colonia
   */
  async addResource(resourceType: ResourceType, amount: number): Promise<ResourceMonitor> {
    const response = await apiService.post<{ success: boolean; data: ResourceMonitor }>('/api/resources/add', {
      resourceType,
      amount
    });
    return response.data;
  }

  /**
   * Obtiene el historial de recursos
   */
  async getResourceHistory(limit?: number): Promise<ResourceHistoryResponse> {
    const queryParams = limit ? `?limit=${limit}` : '';
    const response = await apiService.get<ResourceHistoryResponse>(`/api/resources/history${queryParams}`);
    return response;
  }

  /**
   * Obtiene todos los materiales de cráteres
   */
  async getCraterMaterials(params?: {
    limit?: number;
    skip?: number;
    explorationStatus?: string;
    minPriority?: number;
    hasMaterials?: boolean;
  }): Promise<CraterMaterialsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.explorationStatus) queryParams.append('explorationStatus', params.explorationStatus);
    if (params?.minPriority) queryParams.append('minPriority', params.minPriority.toString());
    if (params?.hasMaterials) queryParams.append('hasMaterials', 'true');

    const queryString = queryParams.toString();
    const endpoint = `/api/crater-materials${queryString ? `?${queryString}` : ''}`;
    
    return apiService.get<CraterMaterialsResponse>(endpoint);
  }

  /**
   * Obtiene materiales de un cráter específico
   */
  async getCraterMaterial(craterId: string): Promise<CraterMaterialData> {
    const response = await apiService.get<{ success: boolean; data: CraterMaterialData }>(`/api/crater-materials/${craterId}`);
    return response.data;
  }

  /**
   * Obtiene materiales de cráteres cercanos a una ubicación
   */
  async getNearbyCraterMaterials(lat: number, lon: number, maxDistance?: number): Promise<CraterMaterialsResponse> {
    const distance = maxDistance || 1000;
    const response = await apiService.get<CraterMaterialsResponse>(`/api/crater-materials/near/${lat}/${lon}?maxDistance=${distance}`);
    return response;
  }

  /**
   * Obtiene estadísticas de materiales en cráteres
   */
  async getCraterMaterialsStats(): Promise<{
    success: boolean;
    data: {
      totalCraters: number;
      exploredCraters: number;
      cratersWithMaterials: number;
      totalMaterials: number;
      topMaterials: Array<{ _id: string; count: number }>;
    };
  }> {
    return apiService.get('/api/crater-materials/stats/summary');
  }

  /**
   * Obtiene todos los colonos
   */
  async getColonists(params?: {
    status?: string;
    role?: string;
    limit?: number;
    skip?: number;
  }): Promise<{
    success: boolean;
    count: number;
    total: number;
    data: Array<{
      _id: string;
      colonistId: string;
      name: string;
      role: string;
      status: string;
      consumption: {
        water: number;
        oxygen: number;
        food: number;
        energy: number;
      };
      stats: {
        daysOnMars: number;
        resourcesConsumed: {
          water: number;
          oxygen: number;
          food: number;
          energy: number;
        };
      };
      lastActivity: string;
    }>;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.role) queryParams.append('role', params.role);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.skip) queryParams.append('skip', params.skip.toString());

    const queryString = queryParams.toString();
    const endpoint = `/api/colonists${queryString ? `?${queryString}` : ''}`;
    
    return apiService.get(endpoint);
  }

  /**
   * Obtiene el último uso de un recurso
   */
  async getLastResourceUsage(resourceType: ResourceType): Promise<{
    success: boolean;
    data: {
      _id: string;
      resourceType: string;
      amount: number;
      colonistId: string;
      colonistName: string;
      colonistRole: string;
      reason: string;
      location: string;
      timestamp: string;
    } | null;
  }> {
    return apiService.get(`/api/resource-usage/last/${resourceType}`);
  }

  /**
   * Obtiene los usos recientes de un recurso
   */
  async getRecentResourceUsage(resourceType: ResourceType, limit?: number): Promise<{
    success: boolean;
    count: number;
    data: Array<{
      _id: string;
      resourceType: string;
      amount: number;
      colonistId: string;
      colonistName: string;
      colonistRole: string;
      reason: string;
      location: string;
      timestamp: string;
    }>;
  }> {
    const queryParams = limit ? `?limit=${limit}` : '';
    return apiService.get(`/api/resource-usage/recent/${resourceType}${queryParams}`);
  }

  /**
   * Solicita recursos y los agrega automáticamente
   */
  async requestResources(): Promise<{
    success: boolean;
    message: string;
    resourcesAdded: { [key: string]: number };
    data: ResourceMonitor;
  }> {
    return apiService.post('/api/resources/request');
  }

  /**
   * Genera un análisis con IA del estado de la colonia
   */
  async generateAIAnalysis(): Promise<{
    success: boolean;
    data: {
      analysis: string;
      context: {
        colonia: {
          estado: string;
          poblacion: number;
          recursos: number;
        };
        crateres: number;
        colonos: number;
      };
      timestamp: string;
    };
  }> {
    return apiService.post('/api/ai-analysis/colony', {});
  }
}

export const colonyService = new ColonyService();

