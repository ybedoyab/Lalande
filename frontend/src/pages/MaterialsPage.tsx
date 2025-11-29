/**
 * Materials Page Component
 * Displays a search interface and list of materials from Materials Project
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MaterialsInput } from '@materialsproject/mp-react-components';
import { materialsService } from '../services/materials.service';
import type { MaterialsProjectSummary } from '../types/materials.types';
import { ErrorBoundary } from '../components/ErrorBoundary';

export const MaterialsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MaterialsProjectSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  // Note: MaterialsInput has a known issue with PeriodicContext when periodicTableMode="none"
  // The component tries to access element configuration that doesn't exist, causing errors
  // Defaulting to false to avoid console errors. Users can enable it if they want to try.
  const [useAdvancedInput, setUseAdvancedInput] = useState(false);

  // Ensure component is mounted before rendering MaterialsInput
  // Add a small delay to ensure all contexts are properly initialized
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Memoize props to ensure stability
  const allowedInputTypesMap = useMemo(() => ({
    formula: { field: 'formula' },
    elements: { field: 'elements' },
    mpid: { field: 'material_ids' },
  }), []);

  const helpItems = useMemo(() => [
    { label: 'Ejemplos de búsqueda' },
    { label: 'Por fórmula', examples: ['Fe2O3', 'Si', 'Al2O3'] },
    { label: 'Por elementos', examples: ['Fe,O', 'Si', 'Al,O'] },
    { label: 'Por MPID', examples: ['mp-13', 'mp-149', 'mp-30'] },
  ], []);


  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      setError('Por favor ingresa un término de búsqueda');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Try to search by formula first
      const results = await materialsService.searchByFormula(searchQuery);
      setSearchResults(results);
      
      if (results.length === 0) {
        setError('No se encontraron materiales');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al buscar materiales';
      setError(errorMessage);
      console.error('Error searching materials:', err);
    } finally {
      setLoading(false);
    }
  };

  // Example materials for quick access
  const exampleMaterials = [
    { id: 'mp-13', name: 'Hierro (Fe)', formula: 'Fe' },
    { id: 'mp-149', name: 'Silicio', formula: 'Si' },
    { id: 'mp-2260', name: 'FePt', formula: 'FePt' },
    { id: 'mp-30', name: 'Hierro (Fe)', formula: 'Fe' },
    { id: 'mp-126', name: 'Aluminio (Al)', formula: 'Al' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-4xl font-bold mb-2">Materials Project</h1>
        <p className="text-base-content/70">
          Busca y explora materiales de la base de datos de Materials Project
        </p>
      </div>

      {/* Search Form with MaterialsInput */}
      <div className="card bg-base-200 shadow-xl mb-6">
        <div className="card-body">
          <form onSubmit={handleSearch} className="flex flex-col gap-4">
            <div className="flex gap-2">
              <div className="flex-1">
                {mounted && useAdvancedInput ? (
                  <ErrorBoundary
                    fallback={
                      <div>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Buscar por fórmula, elementos o MPID (ej: Fe2O3, Si, Al2O3, mp-13)"
                          className="input input-bordered w-full"
                        />
                        <div className="alert alert-warning mt-2">
                          <span className="text-xs">Componente avanzado no disponible. Usando búsqueda básica.</span>
                          <button
                            className="btn btn-sm btn-ghost mt-2"
                            onClick={() => setUseAdvancedInput(false)}
                          >
                            Usar búsqueda básica permanentemente
                          </button>
                        </div>
                      </div>
                    }
                    onError={() => setUseAdvancedInput(false)}
                  >
                    <MaterialsInput
                      value={searchQuery}
                      onChange={(value: string) => setSearchQuery(value)}
                      placeholder="Buscar por fórmula, elementos o MPID (ej: Fe2O3, Si, Al2O3, mp-13)"
                      allowedInputTypesMap={allowedInputTypesMap}
                      periodicTableMode="none"
                      helpItems={helpItems}
                      className="w-full"
                    />
                  </ErrorBoundary>
                ) : (
                  <div className="w-full">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por fórmula, elementos o MPID (ej: Fe2O3, Si, Al2O3, mp-13)"
                      className="input input-bordered w-full"
                    />
                    {!useAdvancedInput && (
                      <button
                        className="btn btn-sm btn-ghost mt-2"
                        onClick={() => setUseAdvancedInput(true)}
                      >
                        Intentar usar componente avanzado
                      </button>
                    )}
                  </div>
                )}
              </div>
              <button 
                type="submit" 
                className={`btn btn-primary ${loading ? 'loading' : ''}`}
                disabled={loading || !searchQuery.trim()}
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-error mb-6">
          <span>{error}</span>
        </div>
      )}

      {/* Example Materials */}
      {searchResults.length === 0 && !loading && (
        <div className="card bg-base-200 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title mb-4">Materiales de Ejemplo</h2>
            <p className="text-sm text-base-content/70 mb-4">
              Haz clic en cualquier material a continuación para ver sus detalles:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exampleMaterials.map((material) => (
                <Link
                  key={material.id}
                  to={`/materials/${material.id}`}
                  className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="card-body">
                    <h3 className="card-title text-lg">{material.name}</h3>
                    <p className="text-sm text-base-content/70">Formula: {material.formula}</p>
                    <p className="text-xs text-base-content/50">ID: {material.id}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">
              Resultados de Búsqueda ({searchResults.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((material) => (
                <Link
                  key={material.material_id}
                  to={`/materials/${material.material_id}`}
                  className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="card-body">
                    <h3 className="card-title text-lg">
                      {material.formula_pretty || material.formula_anonymous}
                    </h3>
                    <div className="space-y-1 text-sm">
                      {material.band_gap !== undefined && material.band_gap > 0 && (
                        <p>
                          <span className="font-semibold">Brecha de Banda:</span>{' '}
                          {material.band_gap.toFixed(2)} eV
                        </p>
                      )}
                      {material.density !== undefined && (
                        <p>
                          <span className="font-semibold">Densidad:</span>{' '}
                          {material.density.toFixed(2)} g/cm³
                        </p>
                      )}
                      {material.is_metal !== undefined && (
                        <p>
                          <span className="font-semibold">Tipo:</span>{' '}
                          {material.is_metal ? 'Metal' : 'No metal'}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-base-content/50 mt-2">
                      ID: {material.material_id}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

