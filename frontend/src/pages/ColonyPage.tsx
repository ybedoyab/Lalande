/**
 * Colony Page Component
 * Dashboard for Mars colony monitoring and resource management
 */

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { colonyService, type ResourceMonitor, type CraterMaterialsResponse, type ResourceType } from '../services/colony.service';
import { MarsGlobe } from '../components/MarsGlobe';
import { useLandingSites } from '../hooks/useLandingSites';
import { useMarsWeather } from '../hooks/useMarsWeather';

export const ColonyPage = () => {
  const [resourceMonitor, setResourceMonitor] = useState<ResourceMonitor | null>(null);
  const [craterMaterials, setCraterMaterials] = useState<CraterMaterialsResponse | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'resources' | 'materials' | 'overview'>('overview');
  const [hoveredResource, setHoveredResource] = useState<{ type: ResourceType; usage: any } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showResourceRequestModal, setShowResourceRequestModal] = useState(false);
  const [resourceRequestData, setResourceRequestData] = useState<{
    success: boolean;
    message: string;
    resourcesAdded: { [key: string]: number };
    locations?: string[];
  } | null>(null);
  const [isRequestingResources, setIsRequestingResources] = useState(false);
  const [requestProgress, setRequestProgress] = useState(0);
  const [showAIAnalysisModal, setShowAIAnalysisModal] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  
  // Load Mars data for the 3D globe
  const { data: landingSites } = useLandingSites();
  const { data: weatherData } = useMarsWeather();

  useEffect(() => {
    loadData();
    // Auto-refresh every 10 seconds to reduce API calls
    const interval = setInterval(loadData, 10000);
    return () => {
      clearInterval(interval);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [monitor, materials, materialsStats] = await Promise.all([
        colonyService.getResourceMonitor(),
        colonyService.getCraterMaterials({ limit: 50, hasMaterials: true }),
        colonyService.getCraterMaterialsStats()
      ]);

      setResourceMonitor(monitor);
      setCraterMaterials(materials);
      setStats(materialsStats.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos de la colonia');
      console.error('Error loading colony data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-orange-500';
      case 'emergency': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      healthy: 'badge-success',
      warning: 'badge-warning',
      critical: 'badge-error',
      emergency: 'badge-error'
    };
    return colors[status as keyof typeof colors] || 'badge';
  };

  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined || isNaN(num)) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(0);
  };

  const getResourcePercentage = (current: number, max: number) => {
    return Math.min(100, (current / max) * 100);
  };

  const getResourceColor = (percentage: number) => {
    if (percentage >= 75) return 'bg-success';
    if (percentage >= 50) return 'bg-info';
    if (percentage >= 25) return 'bg-warning';
    return 'bg-error';
  };

  const handleResourceHover = async (resourceType: ResourceType) => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    try {
      const usage = await colonyService.getLastResourceUsage(resourceType);
      setHoveredResource({ type: resourceType, usage: usage.data });
    } catch (err) {
      console.error('Error fetching resource usage:', err);
    }
  };

  const handleResourceLeave = () => {
    // Delay hiding to allow moving to tooltip
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredResource(null);
    }, 200);
  };

  if (loading && !resourceMonitor) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>Error: {error}</span>
        <button className="btn btn-sm" onClick={loadData}>Reintentar</button>
      </div>
    );
  }

  return (
    <main className="space-y-6">
      {/* Mars 3D Globe */}
      <MarsGlobe 
        weatherData={weatherData || null}
        landingSites={landingSites || []}
        showCraters={true}
        showHiRISE={false}
      />

      {/* Header */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">🏛️ Panel de Control de la Colonia Marciana</h1>
              <p className="text-base-content/70">Monitor de recursos y materiales de la colonia</p>
            </div>
            {resourceMonitor && (
              <div className="text-right">
                <div className={`badge badge-lg ${getStatusBadge(resourceMonitor.status)}`}>
                  {resourceMonitor.status === 'healthy' ? 'SALUDABLE' :
                   resourceMonitor.status === 'warning' ? 'ADVERTENCIA' :
                   resourceMonitor.status === 'critical' ? 'CRÍTICO' :
                   resourceMonitor.status === 'emergency' ? 'EMERGENCIA' :
                   resourceMonitor.status.toUpperCase()}
                </div>
                {resourceMonitor.status === 'warning' && (
                  <div className="mt-2 p-2 bg-warning/20 rounded text-xs text-warning-content">
                    ⚠️ Advertencia: Algunos recursos están por debajo del 50% de capacidad. Considera solicitar recursos adicionales.
                  </div>
                )}
                {resourceMonitor.status === 'critical' && (
                  <div className="mt-2 p-2 bg-error/30 rounded text-xs text-error-content border border-error">
                    🚨 <strong>CRÍTICO:</strong> Recursos por debajo del 25%. Se requiere acción inmediata para evitar emergencia.
                  </div>
                )}
                {resourceMonitor.status === 'emergency' && (
                  <div className="mt-2 p-2 bg-error rounded text-xs text-error-content">
                    🔴 EMERGENCIA: Recursos por debajo del 10%. La colonia está en peligro inminente.
                  </div>
                )}
                <p className="text-sm mt-2 text-base-content/70">
                  Última actualización: {new Date(resourceMonitor.lastUpdate).toLocaleString('es-ES')}
                </p>
                <p className="text-xs mt-1 text-base-content/60">
                  🔄 Simulación en tiempo real activa
                </p>
                <button
                  className="btn btn-sm btn-secondary mt-3 mr-2"
                  disabled={isGeneratingAnalysis}
                  onClick={async () => {
                    setIsGeneratingAnalysis(true);
                    setAiAnalysis(null);
                    setShowAIAnalysisModal(true);
                    try {
                      const response = await colonyService.generateAIAnalysis();
                      if (response.success) {
                        setAiAnalysis(response.data.analysis);
                      } else {
                        setAiAnalysis('Error al generar el análisis. Por favor, intenta de nuevo.');
                      }
                    } catch (err) {
                      console.error('Error generating AI analysis:', err);
                      setAiAnalysis('Error al generar el análisis. Por favor, verifica que la API key de OpenAI esté configurada correctamente.');
                    } finally {
                      setIsGeneratingAnalysis(false);
                    }
                  }}
                >
                  {isGeneratingAnalysis ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Generando análisis...
                    </>
                  ) : (
                    '🤖 Análisis con IA'
                  )}
                </button>
                <button
                  className="btn btn-sm btn-primary mt-3"
                  disabled={isRequestingResources}
                  onClick={async () => {
                    setIsRequestingResources(true);
                    setRequestProgress(0);
                    
                    // Simular progreso mientras los astronautas van al cráter
                    const progressInterval = setInterval(() => {
                      setRequestProgress(prev => {
                        if (prev >= 90) {
                          clearInterval(progressInterval);
                          return prev;
                        }
                        return prev + 10;
                      });
                    }, 500);
                    
                    try {
                      // Esperar 3 segundos antes de hacer la petición (simulando viaje)
                      await new Promise(resolve => setTimeout(resolve, 3000));
                      
                      const response = await colonyService.requestResources();
                      
                      clearInterval(progressInterval);
                      setRequestProgress(100);
                      
                      // Esperar un poco más para mostrar el 100%
                      await new Promise(resolve => setTimeout(resolve, 500));
                      
                      if (response.success) {
                        const locations = craterMaterials?.data
                          .filter(c => c.materials && c.materials.length > 0)
                          .sort((a, b) => {
                            if (a.explorationStatus === 'unexplored' && b.explorationStatus !== 'unexplored') return -1;
                            if (a.explorationStatus !== 'unexplored' && b.explorationStatus === 'unexplored') return 1;
                            return (b.explorationPriority || 0) - (a.explorationPriority || 0);
                          })
                          .slice(0, 5)
                          .map(c => {
                            const statusEmoji = c.explorationStatus === 'unexplored' ? '❓' : 
                                               c.explorationStatus === 'scanned' ? '📡' :
                                               c.explorationStatus === 'sampled' ? '🔬' : '✅';
                            return `${statusEmoji} ${c.craterId} (${c.latitude.toFixed(1)}°, ${c.longitude.toFixed(1)}°)`;
                          }) || [];
                        
                        setResourceRequestData({
                          ...response,
                          locations
                        });
                        setShowResourceRequestModal(true);
                        loadData(); // Recargar datos
                      }
                    } catch (err) {
                      clearInterval(progressInterval);
                      console.error('Error requesting resources:', err);
                      setResourceRequestData({
                        success: false,
                        message: 'Error al solicitar recursos. Por favor, intenta de nuevo.',
                        resourcesAdded: {}
                      });
                      setShowResourceRequestModal(true);
                    } finally {
                      setIsRequestingResources(false);
                      setRequestProgress(0);
                    }
                  }}
                >
                  {isRequestingResources ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Enviando equipo... {requestProgress}%
                    </>
                  ) : (
                    '📦 Solicitar Recursos'
                  )}
                </button>
                {isRequestingResources && (
                  <div className="mt-2">
                    <progress className="progress progress-primary w-full" value={requestProgress} max="100"></progress>
                    <p className="text-xs text-center mt-1 text-base-content/70">
                      🚀 Equipo de astronautas en camino al cráter...
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed">
        <button
          className={`tab ${activeTab === 'overview' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Resumen
        </button>
        <button
          className={`tab ${activeTab === 'resources' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('resources')}
        >
          💧 Recursos
        </button>
        <button
          className={`tab ${activeTab === 'materials' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('materials')}
        >
          🔬 Materiales
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && resourceMonitor && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Population Card */}
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">👥 Población</h2>
              <div className="stat">
                <div className="stat-value text-primary">
                  {Math.round(resourceMonitor.population.current)}
                </div>
                <div className="stat-desc">
                  Máx: {resourceMonitor.population.max} | Crecimiento: {(resourceMonitor.population.growthRate * 100).toFixed(2)}%/día
                </div>
              </div>
              <progress
                className="progress progress-primary w-full"
                value={getResourcePercentage(resourceMonitor.population.current, resourceMonitor.population.max)}
                max="100"
              ></progress>
            </div>
          </div>

          {/* Status Summary */}
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">⚡ Estado</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Estado de la Colonia:</span>
                  <span className={`font-bold ${getStatusColor(resourceMonitor.status)}`}>
                    {resourceMonitor.status === 'healthy' ? 'Saludable' :
                     resourceMonitor.status === 'warning' ? 'Advertencia' :
                     resourceMonitor.status === 'critical' ? 'Crítico' :
                     resourceMonitor.status === 'emergency' ? 'Emergencia' :
                     resourceMonitor.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>ID de Colonia:</span>
                  <span className="font-mono text-sm">{resourceMonitor.colonyId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Simulación:</span>
                  <span>{resourceMonitor.simulation.enabled ? '✅ Activa' : '❌ Inactiva'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Materials Stats */}
          {stats && (
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">🌑 Cráteres</h2>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total de Cráteres:</span>
                    <span className="font-bold">{stats.totalCraters}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Explorados:</span>
                    <span className="font-bold">{stats.exploredCraters}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Con Materiales:</span>
                    <span className="font-bold text-success">{stats.cratersWithMaterials}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total de Materiales:</span>
                    <span className="font-bold text-primary">{stats.totalMaterials}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Resource Overview */}
          {Object.entries(resourceMonitor.resources).map(([key, resource]) => {
            const percentage = getResourcePercentage(resource.current, resource.max);
            const resourceType = key as ResourceType;
            const isHovered = hoveredResource?.type === resourceType;
            return (
              <div
                key={key}
                className="card bg-base-200 shadow-xl relative"
                onMouseEnter={() => handleResourceHover(resourceType)}
                onMouseLeave={handleResourceLeave}
              >
                <div className="card-body">
                  <h3 className="card-title text-sm">
                    {key === 'constructionMaterials' ? '🏗️ Construcción' : 
                     key === 'lifeSupportMaterials' ? '🛡️ Soporte Vital' :
                     key === 'water' ? '💧 Agua' :
                     key === 'oxygen' ? '🌬️ Oxígeno' :
                     key === 'energy' ? '⚡ Energía' :
                     key === 'food' ? '🍽️ Alimentos' : key}
                  </h3>
                  <div className="stat p-0">
                    <div className="stat-value text-lg">
                      {formatNumber(resource.current)} / {formatNumber(resource.max)}
                    </div>
                    <div className="stat-desc">{resource.unit}</div>
                  </div>
                  <progress
                    className={`progress w-full ${getResourceColor(percentage)}`}
                    value={percentage}
                    max="100"
                  ></progress>
                  <p className="text-xs text-base-content/70">
                    Consumo: {formatNumber(resource.consumptionRate)}/{resource.unit}/día
                  </p>
                </div>
                {isHovered && hoveredResource.usage && (
                  <div className="absolute top-full left-0 mt-2 z-50 w-64 p-3 bg-base-300 rounded-lg shadow-xl border border-base-content/20">
                    <h4 className="font-bold text-sm mb-2">📋 Último Uso</h4>
                    <div className="space-y-1 text-xs">
                      <p><span className="font-semibold">Colono:</span> {hoveredResource.usage.colonistName}</p>
                      <p><span className="font-semibold">Rol:</span> {hoveredResource.usage.colonistRole}</p>
                      <p><span className="font-semibold">Cantidad:</span> {formatNumber(hoveredResource.usage.amount)} {resource.unit}</p>
                      <p><span className="font-semibold">Razón:</span> {hoveredResource.usage.reason || 'N/A'}</p>
                      <p><span className="font-semibold">Ubicación:</span> {hoveredResource.usage.location || 'Colonia'}</p>
                      <p className="text-base-content/70">
                        {new Date(hoveredResource.usage.timestamp).toLocaleString('es-ES')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Resources Tab */}
      {activeTab === 'resources' && resourceMonitor && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(resourceMonitor.resources).map(([key, resource]) => {
              const percentage = getResourcePercentage(resource.current, resource.max);
              const resourceType = key as ResourceType;
              const isHovered = hoveredResource?.type === resourceType;
              return (
                <div
                  key={key}
                  className="card bg-base-200 shadow-xl relative"
                  onMouseEnter={() => handleResourceHover(resourceType)}
                  onMouseLeave={handleResourceLeave}
                >
                  <div className="card-body">
                    <h2 className="card-title">
                      {key === 'constructionMaterials' ? '🏗️ Materiales de Construcción' :
                       key === 'lifeSupportMaterials' ? '🛡️ Materiales de Soporte Vital' :
                       key === 'water' ? '💧 Agua' :
                       key === 'oxygen' ? '🌬️ Oxígeno' :
                       key === 'energy' ? '⚡ Energía' :
                       '🍽️ Alimentos'}
                    </h2>
                    <div className="stat">
                      <div className="stat-value text-3xl">
                        {formatNumber(resource.current)}
                      </div>
                      <div className="stat-desc">
                        de {formatNumber(resource.max)} {resource.unit}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Porcentaje:</span>
                        <span className="font-bold">{percentage.toFixed(1)}%</span>
                      </div>
                      <progress
                        className={`progress w-full ${getResourceColor(percentage)}`}
                        value={percentage}
                        max="100"
                      ></progress>
                      <div className="flex justify-between text-xs text-base-content/70">
                        <span>Tasa de Consumo:</span>
                        <span>{formatNumber(resource.consumptionRate)} {resource.unit}/día</span>
                      </div>
                      <div className="flex justify-between text-xs text-base-content/70">
                        <span>Tiempo Restante:</span>
                        <span>
                          {resource.consumptionRate > 0
                            ? `${Math.floor(resource.current / resource.consumptionRate)} días`
                            : '∞'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {isHovered && hoveredResource.usage && (
                    <div className="absolute top-full left-0 mt-2 z-50 w-72 p-4 bg-base-300 rounded-lg shadow-xl border border-base-content/20">
                      <h4 className="font-bold text-sm mb-3">📋 Trazabilidad - Último Uso</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-semibold">👤 Colono:</span>
                          <p className="ml-4">{hoveredResource.usage.colonistName}</p>
                        </div>
                        <div>
                          <span className="font-semibold">🎭 Rol:</span>
                          <p className="ml-4">{hoveredResource.usage.colonistRole}</p>
                        </div>
                        <div>
                          <span className="font-semibold">📊 Cantidad Usada:</span>
                          <p className="ml-4">{formatNumber(hoveredResource.usage.amount)} {resource.unit}</p>
                        </div>
                        <div>
                          <span className="font-semibold">📝 Razón:</span>
                          <p className="ml-4">{hoveredResource.usage.reason || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="font-semibold">📍 Ubicación:</span>
                          <p className="ml-4">{hoveredResource.usage.location || 'Colonia'}</p>
                        </div>
                        <div className="pt-2 border-t border-base-content/20">
                          <span className="font-semibold">🕐 Fecha/Hora:</span>
                          <p className="ml-4 text-xs text-base-content/70">
                            {new Date(hoveredResource.usage.timestamp).toLocaleString('es-ES')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Materials Tab */}
      {activeTab === 'materials' && (
        <div className="space-y-6">
          {/* Stats Summary */}
          {stats && (
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">📊 Estadísticas de Materiales</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="stat">
                    <div className="stat-title">Total de Cráteres</div>
                    <div className="stat-value text-2xl">{stats.totalCraters}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">Explorados</div>
                    <div className="stat-value text-2xl text-info">{stats.exploredCraters}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">Con Materiales</div>
                    <div className="stat-value text-2xl text-success">{stats.cratersWithMaterials}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">Total de Materiales</div>
                    <div className="stat-value text-2xl text-primary">{stats.totalMaterials}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Top Materials */}
          {stats && stats.topMaterials && stats.topMaterials.length > 0 && (
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="card-title">
                    <span>⭐ Materiales Principales</span>
                    <span className="badge badge-primary badge-lg ml-2">{stats.topMaterials.length}</span>
                  </h2>
                </div>
                <p className="text-sm text-base-content/70 mb-4">
                  Materiales más frecuentes encontrados en los cráteres. Haz clic en "Ver Propiedades" para consultar detalles técnicos, composición y propiedades físicas.
                </p>
                <div className="overflow-x-auto">
                  <table className="table table-zebra">
                    <thead>
                      <tr>
                        <th>Material</th>
                        <th>Encontrado en Cráteres</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.topMaterials.map((material: any, idx: number) => (
                        <tr key={idx} className="hover:bg-base-300 transition-colors">
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="avatar placeholder">
                                <div className="bg-primary text-primary-content rounded-full w-10">
                                  <span className="text-sm font-bold">#{idx + 1}</span>
                                </div>
                              </div>
                              <div>
                                <div className="font-mono text-base font-bold text-primary">{material._id}</div>
                                <div className="text-xs text-base-content/60">ID del Material</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="badge badge-primary badge-lg gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {material.count} {material.count === 1 ? 'cráter' : 'cráteres'}
                            </div>
                          </td>
                          <td>
                            <Link
                              to={`/materials/${material._id}`}
                              className="btn btn-sm btn-primary gap-2 hover:btn-secondary transition-all shadow-md hover:shadow-lg"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Ver Propiedades
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Craters with Materials */}
          {craterMaterials && craterMaterials.data.length > 0 && (
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">🌑 Cráteres con Materiales ({craterMaterials.count})</h2>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>ID del Cráter</th>
                        <th>Ubicación</th>
                        <th>Diámetro (km)</th>
                        <th>Materiales</th>
                        <th>Estado</th>
                        <th>Prioridad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {craterMaterials.data.map((crater) => (
                        <tr key={crater._id}>
                          <td className="font-mono text-sm">{crater.craterId}</td>
                          <td>
                            {crater.latitude >= 0 ? crater.latitude.toFixed(2) + '°N' : Math.abs(crater.latitude).toFixed(2) + '°S'}, {' '}
                            {crater.longitude >= 0 ? crater.longitude.toFixed(2) + '°E' : Math.abs(crater.longitude).toFixed(2) + '°W'}
                          </td>
                          <td>{crater.diameter.toFixed(2)}</td>
                          <td>
                            <div className="flex flex-wrap gap-2 max-w-lg">
                              {crater.materials.length > 0 ? (
                                <>
                                  {crater.materials.slice(0, 3).map((material: any, idx: number) => (
                                    <Link
                                      key={idx}
                                      to={`/materials/${material.materialId}`}
                                      className="badge badge-primary badge-lg hover:badge-secondary transition-all cursor-pointer group shadow-md hover:shadow-lg"
                                      title={`Ver propiedades de ${material.name}`}
                                    >
                                      <span className="font-semibold">{material.name}</span>
                                      <span className="ml-1 opacity-70 text-xs font-mono">({material.formula})</span>
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </Link>
                                  ))}
                                  {crater.materials.length > 3 && (
                                    <div className="badge badge-ghost badge-lg">
                                      +{crater.materials.length - 3} más
                                    </div>
                                  )}
                                </>
                              ) : (
                                <span className="badge badge-ghost">Sin materiales</span>
                              )}
                            </div>
                            {crater.materials.length > 3 && (
                              <details className="mt-2">
                                <summary className="text-xs text-base-content/70 cursor-pointer hover:text-base-content">
                                  Ver todos los materiales ({crater.materials.length})
                                </summary>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {crater.materials.slice(3).map((material: any, idx: number) => (
                                    <Link
                                      key={idx + 3}
                                      to={`/materials/${material.materialId}`}
                                      className="badge badge-outline badge-md hover:badge-primary transition-all cursor-pointer"
                                      title={`Ver propiedades de ${material.name}`}
                                    >
                                      {material.name} ({material.formula})
                                    </Link>
                                  ))}
                                </div>
                              </details>
                            )}
                          </td>
                          <td>
                            <div className={`badge badge-sm ${
                              crater.explorationStatus === 'mapped' ? 'badge-success' :
                              crater.explorationStatus === 'sampled' ? 'badge-info' :
                              crater.explorationStatus === 'scanned' ? 'badge-warning' :
                              'badge-ghost'
                            }`}>
                              {crater.explorationStatus === 'mapped' ? 'Mapeado' :
                               crater.explorationStatus === 'sampled' ? 'Muestreado' :
                               crater.explorationStatus === 'scanned' ? 'Escaneado' :
                               crater.explorationStatus === 'unexplored' ? 'Sin Explorar' :
                               crater.explorationStatus}
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <progress
                                className="progress progress-primary w-16 h-2"
                                value={crater.explorationPriority * 10}
                                max="100"
                              ></progress>
                              <span className="text-xs">{crater.explorationPriority}/10</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {craterMaterials && craterMaterials.data.length === 0 && (
            <div className="alert alert-info">
              <span>No se encontraron cráteres con materiales.</span>
            </div>
          )}
        </div>
      )}

      {/* Modal de Solicitud de Recursos */}
      {showResourceRequestModal && resourceRequestData && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <span className="text-2xl">📋</span>
              Solicitud de Recursos
            </h3>
            
            {resourceRequestData.success ? (
              <>
                <div className="alert alert-success mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{resourceRequestData.message}</span>
                </div>

                {Object.keys(resourceRequestData.resourcesAdded || {}).length > 0 ? (
                  <>
                    <div className="mb-4">
                      <h4 className="font-semibold mb-2 text-base-content/80">Recursos Agregados:</h4>
                      <div className="space-y-2">
                        {Object.entries(resourceRequestData.resourcesAdded).map(([key, val]: [string, any]) => {
                          const names: { [key: string]: { name: string; icon: string; unit: string } } = {
                            water: { name: 'Agua', icon: '💧', unit: 'litros' },
                            oxygen: { name: 'Oxígeno', icon: '🌬️', unit: 'kg' },
                            energy: { name: 'Energía', icon: '⚡', unit: 'kWh' },
                            food: { name: 'Alimentos', icon: '🍽️', unit: 'kg' },
                            constructionMaterials: { name: 'Materiales de Construcción', icon: '🏗️', unit: 'kg' },
                            lifeSupportMaterials: { name: 'Materiales de Soporte Vital', icon: '🛡️', unit: 'kg' }
                          };
                          const resourceInfo = names[key] || { name: key, icon: '📦', unit: '' };
                          return (
                            <div key={key} className="flex items-center justify-between p-2 bg-base-300 rounded-lg">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{resourceInfo.icon}</span>
                                <span className="font-medium">{resourceInfo.name}</span>
                              </div>
                              <span className="badge badge-success badge-lg">
                                +{val.toLocaleString()} {resourceInfo.unit}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {resourceRequestData.locations && resourceRequestData.locations.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-semibold mb-2 text-base-content/80">Los recursos fueron obtenidos de:</h4>
                        <div className="space-y-1">
                          {resourceRequestData.locations.map((location, idx) => (
                            <div key={idx} className="p-2 bg-base-300 rounded text-sm">
                              {location}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="alert alert-info">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>Todos los recursos están en niveles adecuados. No se requiere solicitud de recursos en este momento.</span>
                  </div>
                )}
              </>
            ) : (
              <div className="alert alert-error">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{resourceRequestData.message}</span>
              </div>
            )}

            <div className="modal-action">
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowResourceRequestModal(false);
                  setResourceRequestData(null);
                }}
              >
                Aceptar
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => {
            setShowResourceRequestModal(false);
            setResourceRequestData(null);
          }}></div>
        </div>
      )}

      {/* Modal de Análisis con IA */}
      {showAIAnalysisModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-2xl mb-4 flex items-center gap-2">
              <span className="text-3xl">🤖</span>
              Análisis Inteligente de la Colonia
            </h3>
            
            {isGeneratingAnalysis ? (
              <div className="flex flex-col items-center justify-center py-12">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <p className="mt-4 text-base-content/70">Generando análisis con IA...</p>
                <p className="mt-2 text-sm text-base-content/60">Esto puede tomar unos segundos</p>
              </div>
            ) : aiAnalysis ? (
              <div className="space-y-4">
                <div className="alert alert-info">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span>Análisis generado con inteligencia artificial basado en el estado actual de la colonia.</span>
                </div>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="whitespace-pre-wrap text-base-content/90 leading-relaxed">
                    {aiAnalysis.split('\n').map((line, idx) => {
                      // Detectar títulos (líneas que empiezan con # o números)
                      if (line.match(/^#+\s/) || line.match(/^\d+\.\s+\*\*/)) {
                        return (
                          <h3 key={idx} className="text-xl font-bold mt-6 mb-3 text-primary">
                            {line.replace(/^#+\s/, '').replace(/^\d+\.\s+\*\*/, '').replace(/\*\*/g, '')}
                          </h3>
                        );
                      }
                      // Detectar subtítulos
                      if (line.match(/^\*\*/) && line.match(/\*\*$/)) {
                        return (
                          <h4 key={idx} className="text-lg font-semibold mt-4 mb-2 text-secondary">
                            {line.replace(/\*\*/g, '')}
                          </h4>
                        );
                      }
                      // Detectar listas
                      if (line.match(/^[-•]\s/) || line.match(/^\d+\.\s/)) {
                        return (
                          <p key={idx} className="ml-4 mb-2">
                            {line}
                          </p>
                        );
                      }
                      // Texto normal
                      if (line.trim()) {
                        return (
                          <p key={idx} className="mb-3">
                            {line}
                          </p>
                        );
                      }
                      return <br key={idx} />;
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="alert alert-error">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>No se pudo generar el análisis.</span>
              </div>
            )}

            <div className="modal-action">
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowAIAnalysisModal(false);
                  setAiAnalysis(null);
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => {
            setShowAIAnalysisModal(false);
            setAiAnalysis(null);
          }}></div>
        </div>
      )}
    </main>
  );
};

