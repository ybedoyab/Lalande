/**
 * Material Detail Component
 * Displays detailed information about a material from Materials Project
 * Follows Single Responsibility Principle - only handles material display
 */

import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { materialsService } from '../services/materials.service';
import { CrystalToolkitWrapper } from './CrystalToolkitWrapper';
import type { MaterialsProjectSummary } from '../types/materials.types';

export const MaterialDetail = () => {
  const { material } = useParams<{ material: string }>();
  const [materialData, setMaterialData] = useState<MaterialsProjectSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Additional properties state
  const [bandStructure, setBandStructure] = useState<any>(null);
  const [magnetism, setMagnetism] = useState<any>(null);
  const [elasticity, setElasticity] = useState<any>(null);
  const [eos, setEOS] = useState<any>(null);
  const [xas, setXAS] = useState<any>(null);
  const [surfaceProperties, setSurfaceProperties] = useState<any>(null);
  const [similarMaterials, setSimilarMaterials] = useState<any[]>([]);
  const [grainBoundaries, setGrainBoundaries] = useState<any>(null);
  const [substrates, setSubstrates] = useState<any[]>([]);
  const [alloys, setAlloys] = useState<any[]>([]);
  const [loadingAdditional, setLoadingAdditional] = useState(false);
  const [substratesPage, setSubstratesPage] = useState(1);
  const substratesPerPage = 20;
  
  // Use ref to prevent duplicate calls in React StrictMode
  const hasFetchedRef = useRef<string | null>(null);
  
  // Helper function to check if value should be displayed (not 0 or null/undefined)
  const shouldDisplay = (value: any): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'number') {
      return value !== 0 && !isNaN(value);
    }
    return true;
  };
  
  // Get material name in Spanish
  const getMaterialName = (formula: string): string => {
    if (!formula) return '';
    
    // Extended element names dictionary in Spanish
    const elementNames: Record<string, string> = {
      'Fe': 'Hierro', 'Si': 'Silicio', 'Al': 'Aluminio', 'Cu': 'Cobre',
      'Au': 'Oro', 'Ag': 'Plata', 'Ti': 'Titanio', 'Mg': 'Magnesio',
      'Ca': 'Calcio', 'Na': 'Sodio', 'K': 'Potasio', 'O': 'Oxígeno',
      'H': 'Hidrógeno', 'C': 'Carbono', 'N': 'Nitrógeno', 'P': 'Fósforo',
      'S': 'Azufre', 'Cl': 'Cloro', 'Br': 'Bromo', 'I': 'Yodo',
      'F': 'Flúor', 'He': 'Helio', 'Ne': 'Neón', 'Ar': 'Argón',
      'Kr': 'Kriptón', 'Xe': 'Xenón', 'Rn': 'Radón', 'Li': 'Litio',
      'Be': 'Berilio', 'B': 'Boro', 'Sc': 'Escandio', 'V': 'Vanadio',
      'Cr': 'Cromo', 'Mn': 'Manganeso', 'Co': 'Cobalto', 'Ni': 'Níquel',
      'Zn': 'Cinc', 'Ga': 'Galio', 'Ge': 'Germanio', 'As': 'Arsénico',
      'Se': 'Selenio', 'Rb': 'Rubidio', 'Sr': 'Estroncio', 'Y': 'Itrio',
      'Zr': 'Circonio', 'Nb': 'Niobio', 'Mo': 'Molibdeno', 'Tc': 'Tecnecio',
      'Ru': 'Rutenio', 'Rh': 'Rodio', 'Pd': 'Paladio', 'Cd': 'Cadmio',
      'In': 'Indio', 'Sn': 'Estaño', 'Sb': 'Antimonio', 'Te': 'Telurio',
      'Cs': 'Cesio', 'Ba': 'Bario', 'La': 'Lantano', 'Ce': 'Cerio',
      'Pr': 'Praseodimio', 'Nd': 'Neodimio', 'Pm': 'Prometio', 'Sm': 'Samario',
      'Eu': 'Europio', 'Gd': 'Gadolinio', 'Tb': 'Terbio', 'Dy': 'Disprosio',
      'Ho': 'Holmio', 'Er': 'Erbio', 'Tm': 'Tulio', 'Yb': 'Iterbio',
      'Lu': 'Lutecio', 'Hf': 'Hafnio', 'Ta': 'Tantalio', 'W': 'Wolframio',
      'Re': 'Renio', 'Os': 'Osmio', 'Ir': 'Iridio', 'Pt': 'Platino',
      'Hg': 'Mercurio', 'Tl': 'Talio', 'Pb': 'Plomo', 'Bi': 'Bismuto',
      'Po': 'Polonio', 'At': 'Ástato', 'Fr': 'Francio', 'Ra': 'Radio',
      'Ac': 'Actinio', 'Th': 'Torio', 'Pa': 'Protactinio', 'U': 'Uranio',
      'Np': 'Neptunio', 'Pu': 'Plutonio', 'Am': 'Americio', 'Cm': 'Curio',
      'Bk': 'Berkelio', 'Cf': 'Californio', 'Es': 'Einstenio', 'Fm': 'Fermio',
      'Md': 'Mendelevio', 'No': 'Nobelio', 'Lr': 'Laurencio',
    };
    
    // If it's a single element, return the name
    if (elementNames[formula]) {
      return elementNames[formula];
    }
    
    // For compounds, try to extract element names
    // Simple pattern: match element symbols (1-2 letters, capital first)
    const elementPattern = /([A-Z][a-z]?)/g;
    const matches = formula.match(elementPattern);
    if (matches && matches.length <= 3) {
      // For simple compounds, show element names
      const names = matches.map(m => elementNames[m] || m).filter(Boolean);
      if (names.length > 0) {
        return names.join('-');
      }
    }
    
    // Fallback: return formula as-is
    return formula;
  };
  
  // Calculate pagination for substrates
  const totalSubstratesPages = Math.ceil((substrates.length || 0) / substratesPerPage);
  const displayedSubstrates = substrates.slice(
    (substratesPage - 1) * substratesPerPage,
    substratesPage * substratesPerPage
  );

  useEffect(() => {
    if (!material) {
      setError('Material ID is required');
      setLoading(false);
      return;
    }

    // Prevent duplicate calls - if we already fetched this material, skip
    if (hasFetchedRef.current === material) {
      return;
    }
    
    // Mark as fetching
    hasFetchedRef.current = material;

    const fetchMaterial = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching material:', material);
        const data = await materialsService.getMaterialSummary(material);
        console.log('Material data received:', data);
        setMaterialData(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load material data';
        console.error('Error loading material:', err);
        setError(errorMessage);
        hasFetchedRef.current = null; // Reset on error to allow retry
      } finally {
        setLoading(false);
      }
    };

    const fetchAdditionalProperties = async () => {
      if (!material) return;
      
      setLoadingAdditional(true);
      try {
        // Fetch all additional properties in parallel
        const [
          bandStruct,
          mag,
          elast,
          eosData,
          xasData,
          surface,
          similar,
          gb,
          subs,
          alloyData
        ] = await Promise.allSettled([
          materialsService.getBandStructure(material),
          materialsService.getMagnetism(material),
          materialsService.getElasticity(material),
          materialsService.getEOS(material),
          materialsService.getXAS(material),
          materialsService.getSurfaceProperties(material),
          materialsService.getSimilarMaterials(material, 10),
          materialsService.getGrainBoundaries(material),
          materialsService.getSubstrates(material),
          materialsService.getAlloys(material),
        ]);

        if (bandStruct.status === 'fulfilled') setBandStructure(bandStruct.value);
        if (mag.status === 'fulfilled') setMagnetism(mag.value);
        if (elast.status === 'fulfilled') setElasticity(elast.value);
        if (eosData.status === 'fulfilled') setEOS(eosData.value);
        if (xasData.status === 'fulfilled') setXAS(xasData.value);
        if (surface.status === 'fulfilled') setSurfaceProperties(surface.value);
        if (similar.status === 'fulfilled') setSimilarMaterials(similar.value || []);
        if (gb.status === 'fulfilled') setGrainBoundaries(gb.value);
        if (subs.status === 'fulfilled') setSubstrates(subs.value || []);
        if (alloyData.status === 'fulfilled') setAlloys(alloyData.value || []);
      } catch (err) {
        console.error('Error loading additional properties:', err);
      } finally {
        setLoadingAdditional(false);
      }
    };

    fetchMaterial();
    fetchAdditionalProperties();
    
    // Reset substrates page when material changes
    setSubstratesPage(1);
    
    // Cleanup function to reset ref when material changes
    return () => {
      if (hasFetchedRef.current === material) {
        hasFetchedRef.current = null;
      }
    };
  }, [material]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-error">Error</h2>
            <p>{error}</p>
            <div className="card-actions">
              <Link to="/" className="btn btn-primary">
                Volver al Inicio
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!materialData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Material No Encontrado</h2>
            <p>ID del Material: {material}</p>
            <div className="card-actions">
              <Link to="/" className="btn btn-primary">
                Volver al Inicio
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <Link to="/" className="btn btn-sm btn-outline">
          ← Volver al Inicio
        </Link>
      </div>

      {/* Header with Formula and Material ID */}
      <div className="mb-6">
        <div className="flex items-baseline gap-3 mb-2">
          <h1 className="text-4xl font-bold text-primary">
            {materialData.formula_pretty || materialData.formula_anonymous}
          </h1>
          <span className="text-2xl font-semibold text-base-content/70">
            ({getMaterialName(materialData.formula_pretty || materialData.formula_anonymous)})
          </span>
        </div>
        <div className="text-lg text-base-content/60">
          {materialData.material_id}
        </div>
      </div>

      {/* Main Content: 3D Structure on left, Properties on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left Column: 3D Crystal Structure */}
        <div className="lg:col-span-2">
          <CrystalToolkitWrapper
            structure={materialData.structure}
            formula={materialData.formula_pretty}
          />
        </div>

        {/* Right Column: Key Properties */}
        <div className="space-y-4">
          {/* Energy Above Hull */}
          {shouldDisplay(materialData.energy_above_hull) && (
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body p-4">
                <div className="text-sm text-base-content/60 mb-1">Energía Sobre el Casco</div>
                <div className="text-2xl font-bold">
                  {materialData.energy_above_hull.toFixed(3)} eV/átomo
                </div>
              </div>
            </div>
          )}

          {/* Space Group */}
          {materialData.symmetry?.symbol && (
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body p-4">
                <div className="text-sm text-base-content/60 mb-1">Grupo Espacial</div>
                <div className="text-xl font-semibold">{materialData.symmetry.symbol}</div>
              </div>
            </div>
          )}

          {/* Band Gap */}
          {shouldDisplay(materialData.band_gap) && (
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body p-4">
                <div className="text-sm text-base-content/60 mb-1">Brecha de Banda</div>
                <div className="text-2xl font-bold">
                  {materialData.band_gap.toFixed(2)} eV
                </div>
              </div>
            </div>
          )}

          {/* Formation Energy */}
          {shouldDisplay(materialData.formation_energy_per_atom) && (
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body p-4">
                <div className="text-sm text-base-content/60 mb-1">Energía de Formación Predicha</div>
                <div className="text-xl font-semibold">
                  {materialData.formation_energy_per_atom.toFixed(3)} eV/átomo
                </div>
              </div>
            </div>
          )}

          {/* Magnetic Ordering */}
          {materialData.is_magnetic !== undefined && (
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body p-4">
                <div className="text-sm text-base-content/60 mb-1">Ordenamiento Magnético</div>
                <div className="text-lg font-semibold">
                  {materialData.is_magnetic ? 'Ferromagnético' : 'No magnético'}
                </div>
                {materialData.total_magnetization !== undefined && (
                  <div className="text-sm mt-1">
                    Magnetización Total: {materialData.total_magnetization.toFixed(2)} μB/u.f.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stability */}
          {materialData.is_stable !== undefined && (
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body p-4">
                <div className="text-sm text-base-content/60 mb-1">Estabilidad</div>
                <div className={`badge badge-lg ${materialData.is_stable ? 'badge-success' : 'badge-warning'}`}>
                  {materialData.is_stable ? 'Estable Predicho' : 'Inestable'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Properties Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg">Propiedades Básicas</h2>
            <div className="space-y-2">
              {shouldDisplay(materialData.num_elements) && (
                <div>
                  <span className="font-semibold">Elementos:</span>{' '}
                  {materialData.elements?.join(', ') || materialData.num_elements}
                </div>
              )}
              {shouldDisplay(materialData.num_sites) && (
                <div>
                  <span className="font-semibold">Sitios:</span> {materialData.num_sites}
                </div>
              )}
              {shouldDisplay(materialData.density) && (
                <div>
                  <span className="font-semibold">Densidad:</span>{' '}
                  {materialData.density.toFixed(3)} g/cm³
                </div>
              )}
              {shouldDisplay(materialData.volume) && (
                <div>
                  <span className="font-semibold">Volumen:</span>{' '}
                  {materialData.volume.toFixed(2)} Å³
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Energy Properties */}
        {(shouldDisplay(materialData.formation_energy_per_atom) ||
          shouldDisplay(materialData.energy_above_hull) ||
          shouldDisplay(materialData.energy_per_atom)) && (
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-lg">Propiedades Energéticas</h2>
              <div className="space-y-2">
                {shouldDisplay(materialData.formation_energy_per_atom) && (
                  <div>
                    <span className="font-semibold">Energía de Formación:</span>{' '}
                    {materialData.formation_energy_per_atom.toFixed(4)} eV/átomo
                  </div>
                )}
                {shouldDisplay(materialData.energy_above_hull) && (
                  <div>
                    <span className="font-semibold">Energía Sobre el Casco:</span>{' '}
                    {materialData.energy_above_hull.toFixed(4)} eV/átomo
                  </div>
                )}
                {shouldDisplay(materialData.energy_per_atom) && (
                  <div>
                    <span className="font-semibold">Energía por Átomo:</span>{' '}
                    {materialData.energy_per_atom.toFixed(4)} eV
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Electronic Properties */}
        {(shouldDisplay(materialData.band_gap) ||
          materialData.is_metal !== undefined ||
          materialData.is_magnetic !== undefined) && (
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-lg">Propiedades Electrónicas</h2>
              <div className="space-y-2">
                {shouldDisplay(materialData.band_gap) && (
                  <div>
                    <span className="font-semibold">Brecha de Banda:</span>{' '}
                    {materialData.band_gap.toFixed(4)} eV
                    {materialData.is_gap_direct !== undefined && (
                      <span className="ml-2 text-xs">
                        ({materialData.is_gap_direct ? 'Directa' : 'Indirecta'})
                      </span>
                    )}
                  </div>
                )}
                {materialData.is_metal !== undefined && (
                  <div>
                    <span className="font-semibold">Metal:</span>{' '}
                    {materialData.is_metal ? 'Sí' : 'No'}
                  </div>
                )}
                {materialData.is_magnetic !== undefined && (
                  <div>
                    <span className="font-semibold">Magnético:</span>{' '}
                    {materialData.is_magnetic ? 'Sí' : 'No'}
                  </div>
                )}
                {shouldDisplay(materialData.total_magnetization) && (
                  <div>
                    <span className="font-semibold">Magnetización Total:</span>{' '}
                    {materialData.total_magnetization.toFixed(4)} μB
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Structure Information */}
      {materialData.structure && (
        <div className="card bg-base-200 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title text-lg mb-4">Estructura</h2>
            {materialData.structure.lattice && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Parámetros de Red</h3>
                  <div className="space-y-1 text-sm">
                    {shouldDisplay(materialData.structure.lattice.a) && (
                      <div>a = {materialData.structure.lattice.a.toFixed(4)} Å</div>
                    )}
                    {shouldDisplay(materialData.structure.lattice.b) && (
                      <div>b = {materialData.structure.lattice.b.toFixed(4)} Å</div>
                    )}
                    {shouldDisplay(materialData.structure.lattice.c) && (
                      <div>c = {materialData.structure.lattice.c.toFixed(4)} Å</div>
                    )}
                    {shouldDisplay(materialData.structure.lattice.alpha) && (
                      <div>α = {materialData.structure.lattice.alpha.toFixed(2)}°</div>
                    )}
                    {shouldDisplay(materialData.structure.lattice.beta) && (
                      <div>β = {materialData.structure.lattice.beta.toFixed(2)}°</div>
                    )}
                    {shouldDisplay(materialData.structure.lattice.gamma) && (
                      <div>γ = {materialData.structure.lattice.gamma.toFixed(2)}°</div>
                    )}
                    {shouldDisplay(materialData.structure.lattice.volume) && (
                      <div className="mt-2">
                        Volumen = {materialData.structure.lattice.volume.toFixed(2)} Å³
                      </div>
                    )}
                  </div>
                </div>
                {materialData.symmetry && (
                  <div>
                    <h3 className="font-semibold mb-2">Simetría</h3>
                    <div className="space-y-1 text-sm">
                      {materialData.symmetry.crystal_system && (
                        <div>
                          <span className="font-semibold">Sistema Cristalino:</span>{' '}
                          {materialData.symmetry.crystal_system}
                        </div>
                      )}
                      {materialData.symmetry.symbol && (
                        <div>
                          <span className="font-semibold">Grupo Espacial:</span>{' '}
                          {materialData.symmetry.symbol}
                        </div>
                      )}
                      {materialData.symmetry.number !== undefined && (
                        <div>
                          <span className="font-semibold">Número del Grupo Espacial:</span>{' '}
                          {materialData.symmetry.number}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {materialData.structure.sites && materialData.structure.sites.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Sitios Atómicos</h3>
                <div className="overflow-x-auto">
                  <table className="table table-zebra table-sm">
                    <thead>
                      <tr>
                        <th>Etiqueta</th>
                        <th>Elemento</th>
                        <th>X</th>
                        <th>Y</th>
                        <th>Z</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materialData.structure.sites.map((site, idx) => (
                        <tr key={idx}>
                          <td>{site.label}</td>
                          <td>
                            {site.species
                              .map((s) => `${s.element}${s.occu !== 1 ? ` (${s.occu})` : ''}`)
                              .join(', ')}
                          </td>
                          <td>{site.xyz[0].toFixed(4)}</td>
                          <td>{site.xyz[1].toFixed(4)}</td>
                          <td>{site.xyz[2].toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stability */}
      {materialData.is_stable !== undefined && (
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg">Estabilidad</h2>
            <div className={`badge badge-lg ${materialData.is_stable ? 'badge-success' : 'badge-warning'}`}>
              {materialData.is_stable ? 'Estable' : 'Inestable'}
            </div>
          </div>
        </div>
      )}

      {/* Additional Properties Sections */}
      {loadingAdditional && (
        <div className="flex justify-center my-4">
          <span className="loading loading-spinner loading-md"></span>
          <span className="ml-2">Cargando propiedades adicionales...</span>
        </div>
      )}

      {/* Magnetic Properties */}
      {magnetism && (
        <div className="card bg-base-200 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title text-lg mb-4">Propiedades Magnéticas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {magnetism.ordering && (
                <div>
                  <span className="font-semibold">Ordenamiento:</span> {magnetism.ordering}
                </div>
              )}
              {shouldDisplay(magnetism.total_magnetization) && (
                <div>
                  <span className="font-semibold">Magnetización Total:</span> {magnetism.total_magnetization.toFixed(4)} μB
                </div>
              )}
              {shouldDisplay(magnetism.num_magnetic_sites) && (
                <div>
                  <span className="font-semibold">Sitios Magnéticos:</span> {magnetism.num_magnetic_sites}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Elastic Constants */}
      {elasticity && (shouldDisplay(elasticity.k_vrh) || shouldDisplay(elasticity.g_vrh) || 
                      shouldDisplay(elasticity.universal_anisotropy) || shouldDisplay(elasticity.homogeneous_poisson)) && (
        <div className="card bg-base-200 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title text-lg mb-4">Constantes Elásticas</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {shouldDisplay(elasticity.k_vrh) && (
                <div>
                  <span className="font-semibold">Módulo Volumétrico (K_VRH):</span> {elasticity.k_vrh.toFixed(2)} GPa
                </div>
              )}
              {shouldDisplay(elasticity.g_vrh) && (
                <div>
                  <span className="font-semibold">Módulo de Cizalla (G_VRH):</span> {elasticity.g_vrh.toFixed(2)} GPa
                </div>
              )}
              {shouldDisplay(elasticity.universal_anisotropy) && (
                <div>
                  <span className="font-semibold">Anisotropía Universal:</span> {elasticity.universal_anisotropy.toFixed(4)}
                </div>
              )}
              {shouldDisplay(elasticity.homogeneous_poisson) && (
                <div>
                  <span className="font-semibold">Coeficiente de Poisson:</span> {elasticity.homogeneous_poisson.toFixed(4)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Equation of State */}
      {eos && eos.eos && (shouldDisplay(eos.eos.v0) || shouldDisplay(eos.eos.e0) || 
                          shouldDisplay(eos.eos.b0) || shouldDisplay(eos.eos.b1)) && (
        <div className="card bg-base-200 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title text-lg mb-4">Ecuación de Estado</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shouldDisplay(eos.eos.v0) && (
                <div>
                  <span className="font-semibold">Volumen de Equilibrio (V₀):</span> {eos.eos.v0.toFixed(4)} Å³
                </div>
              )}
              {shouldDisplay(eos.eos.e0) && (
                <div>
                  <span className="font-semibold">Energía de Equilibrio (E₀):</span> {eos.eos.e0.toFixed(4)} eV
                </div>
              )}
              {shouldDisplay(eos.eos.b0) && (
                <div>
                  <span className="font-semibold">Módulo Volumétrico (B₀):</span> {eos.eos.b0.toFixed(2)} GPa
                </div>
              )}
              {shouldDisplay(eos.eos.b1) && (
                <div>
                  <span className="font-semibold">Derivada de Presión (B'):</span> {eos.eos.b1.toFixed(4)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* X-ray Absorption Spectra */}
      {xas && Array.isArray(xas) && xas.length > 0 && (
        <div className="card bg-base-200 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title text-lg mb-4">Espectros de Absorción de Rayos X</h2>
            <div className="space-y-2">
              {xas.map((spectrum: any, idx: number) => (
                <div key={idx} className="p-3 bg-base-300 rounded">
                  {spectrum.spectrum_type && <div><span className="font-semibold">Tipo:</span> {spectrum.spectrum_type}</div>}
                  {spectrum.absorbing_element && <div><span className="font-semibold">Elemento:</span> {spectrum.absorbing_element}</div>}
                  {spectrum.edge && <div><span className="font-semibold">Borde:</span> {spectrum.edge}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Surface Properties */}
      {surfaceProperties && Array.isArray(surfaceProperties) && surfaceProperties.length > 0 && (
        <div className="card bg-base-200 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title text-lg mb-4">Propiedades Superficiales</h2>
            <div className="space-y-2">
              {surfaceProperties.map((prop: any, idx: number) => (
                <div key={idx} className="p-3 bg-base-300 rounded">
                  {shouldDisplay(prop.weighted_surface_energy) && (
                    <div><span className="font-semibold">Energía Superficial Ponderada:</span> {prop.weighted_surface_energy.toFixed(4)} J/m²</div>
                  )}
                  {shouldDisplay(prop.surface_energy_anisotropy) && (
                    <div><span className="font-semibold">Anisotropía de Energía Superficial:</span> {prop.surface_energy_anisotropy.toFixed(4)}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Suggested Substrates - Moved up and with pagination */}
      {substrates.length > 0 && (
        <div className="card bg-base-200 shadow-xl mb-6">
          <div className="card-body">
            <div className="flex justify-between items-center mb-4">
              <h2 className="card-title text-lg">Sustratos Sugeridos</h2>
              <div className="text-sm text-base-content/60">
                Mostrando {displayedSubstrates.length} de {substrates.length}
              </div>
            </div>
            <div className="overflow-x-auto mb-4">
              <table className="table table-zebra table-sm">
                <thead>
                  <tr>
                    {substrates.some((s: any) => s.substrate_id) && <th>ID del Sustrato</th>}
                    {substrates.some((s: any) => s.substrate_formula) && <th>Fórmula del Sustrato</th>}
                    {substrates.some((s: any) => shouldDisplay(s.area)) && <th>Área (Å²)</th>}
                    {substrates.some((s: any) => shouldDisplay(s.elastic_energy)) && <th>Energía Elástica (eV)</th>}
                  </tr>
                </thead>
                <tbody>
                  {displayedSubstrates.map((sub: any, idx: number) => (
                    <tr key={idx}>
                      {substrates.some((s: any) => s.substrate_id) && (
                        <td>
                          {sub.substrate_id ? (
                            <Link to={`/materials/${sub.substrate_id}`} className="link link-primary">
                              {sub.substrate_id}
                            </Link>
                          ) : 'N/A'}
                        </td>
                      )}
                      {substrates.some((s: any) => s.substrate_formula) && (
                        <td>{sub.substrate_formula || 'N/A'}</td>
                      )}
                      {substrates.some((s: any) => shouldDisplay(s.area)) && (
                        <td>{shouldDisplay(sub.area) ? sub.area.toFixed(2) : 'N/A'}</td>
                      )}
                      {substrates.some((s: any) => shouldDisplay(s.elastic_energy)) && (
                        <td>{shouldDisplay(sub.elastic_energy) ? sub.elastic_energy.toFixed(4) : 'N/A'}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalSubstratesPages > 1 && (
              <div className="flex justify-center items-center gap-2">
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => setSubstratesPage(p => Math.max(1, p - 1))}
                  disabled={substratesPage === 1}
                >
                  Anterior
                </button>
                <span className="text-sm">
                  Página {substratesPage} de {totalSubstratesPages}
                </span>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => setSubstratesPage(p => Math.min(totalSubstratesPages, p + 1))}
                  disabled={substratesPage === totalSubstratesPages}
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Similar Materials */}
      {similarMaterials.length > 0 && (
        <div className="card bg-base-200 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title text-lg mb-4">Materiales Relacionados</h2>
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>ID del Material</th>
                    {similarMaterials.some((s: any) => s.similarity !== null && s.similarity !== undefined) && (
                      <th>Similitud</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {similarMaterials.map((similar: any, idx: number) => (
                    <tr key={idx}>
                      <td>
                        {similar.material_id ? (
                          <Link to={`/materials/${similar.material_id}`} className="link link-primary">
                            {similar.material_id}
                          </Link>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      {similarMaterials.some((s: any) => s.similarity !== null && s.similarity !== undefined) && (
                        <td>
                          {similar.similarity !== null && similar.similarity !== undefined
                            ? typeof similar.similarity === 'number'
                              ? `${(similar.similarity * 100).toFixed(2)}%`
                              : `${similar.similarity}%`
                            : 'N/A'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Grain Boundaries */}
      {grainBoundaries && Array.isArray(grainBoundaries) && grainBoundaries.length > 0 && (
        <div className="card bg-base-200 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title text-lg mb-4">Límites de Grano</h2>
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Σ</th>
                    <th>Energía GB (J/m²)</th>
                    <th>Ángulo de Rotación (°)</th>
                  </tr>
                </thead>
                <tbody>
                  {grainBoundaries.map((gb: any, idx: number) => (
                    <tr key={idx}>
                      <td>{gb.sigma || 'N/A'}</td>
                      <td>{shouldDisplay(gb.gb_energy) ? gb.gb_energy.toFixed(4) : 'N/A'}</td>
                      <td>{shouldDisplay(gb.rotation_angle) ? gb.rotation_angle.toFixed(2) : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Alloy Systems */}
      {alloys.length > 0 && (
        <div className="card bg-base-200 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title text-lg mb-4">Sistemas de Aleación</h2>
            <div className="space-y-2">
              {alloys.map((alloy: any, idx: number) => (
                <div key={idx} className="p-3 bg-base-300 rounded">
                  <span className="font-semibold">Par de Aleación:</span> {alloy.alloy_pair || 'N/A'}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Raw Data (for debugging) */}
      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-base-content/60">
          Ver Datos JSON Sin Procesar
        </summary>
        <pre className="mt-2 p-4 bg-base-300 rounded-lg overflow-auto text-xs">
          {JSON.stringify(materialData, null, 2)}
        </pre>
      </details>
    </div>
  );
};

