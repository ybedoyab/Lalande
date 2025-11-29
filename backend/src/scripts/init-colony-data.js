/**
 * Script de inicialización de datos de colonia
 * Crea datos de simulación para recursos y materiales en cráteres
 */

import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import ResourceMonitor from '../models/ResourceMonitor.js';
import CraterMaterial from '../models/CraterMaterial.js';

dotenv.config();

// Materiales útiles para la vida en Marte
// Solo definimos lo básico: materialId, formula, name, uses
// Las propiedades detalladas (composition, properties, etc.) las proporciona el materials service
const LIFE_SUPPORT_MATERIALS = [
  {
    materialId: 'mp-13',
    formula: 'Si',
    name: 'Silicon',
    uses: ['construction', 'electronics', 'manufacturing']
  },
  {
    materialId: 'mp-30',
    formula: 'Fe',
    name: 'Iron',
    uses: ['construction', 'manufacturing']
  },
  {
    materialId: 'mp-126',
    formula: 'Al',
    name: 'Aluminum',
    uses: ['construction', 'manufacturing']
  },
  {
    materialId: 'mp-2258',
    formula: 'Fe2O3',
    name: 'Hematite',
    uses: ['life-support', 'energy']
  },
  {
    materialId: 'mp-2259',
    formula: 'Fe3O4',
    name: 'Magnetite',
    uses: ['life-support', 'energy']
  },
  {
    materialId: 'mp-2260',
    formula: 'SiO2',
    name: 'Quartz',
    uses: ['construction', 'electronics']
  },
  {
    materialId: 'mp-2261',
    formula: 'ClO4',
    name: 'Perchlorate',
    uses: ['life-support']
  },
  {
    materialId: 'mp-2262',
    formula: 'H2O',
    name: 'Water Ice',
    uses: ['life-support', 'food-production']
  },
  {
    materialId: 'mp-2263',
    formula: 'CaCO3',
    name: 'Calcium Carbonate',
    uses: ['construction', 'life-support']
  },
  {
    materialId: 'mp-2264',
    formula: 'SO4',
    name: 'Sulfate Minerals',
    uses: ['life-support', 'food-production']
  }
];

// Función para obtener materiales aleatorios para un cráter
function getRandomMaterials() {
  const numMaterials = Math.floor(Math.random() * 3) + 1; // 1-3 materiales por cráter
  const shuffled = [...LIFE_SUPPORT_MATERIALS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, numMaterials).map(material => ({
    materialId: material.materialId,
    formula: material.formula,
    name: material.name,
    uses: material.uses,
    // Datos de simulación específicos de la colonia (no vienen del materials service)
    estimatedQuantity: (5000 + Math.random() * 95000), // 5k - 100k kg
    purity: 50 + Math.random() * 50, // 50-100%
    discoveredAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Últimos 30 días
  }));
}

// Función para determinar prioridad de exploración
function getExplorationPriority(diameter, materials) {
  let priority = 5; // Base
  
  // Cráteres más grandes tienen mayor prioridad
  if (diameter > 10) priority += 2;
  else if (diameter > 5) priority += 1;
  
  // Si tiene materiales útiles, mayor prioridad
  if (materials && materials.length > 0) {
    const hasLifeSupport = materials.some(m => m.uses.includes('life-support'));
    if (hasLifeSupport) priority += 2;
    priority += materials.length;
  }
  
  return Math.min(10, Math.max(1, priority));
}

async function initColonyData() {
  try {
    console.log('🚀 Iniciando inicialización de datos de colonia...\n');
    
    // Conectar a MongoDB
    await connectDB();
    console.log('✅ Conectado a MongoDB\n');
    
    // 1. Crear o actualizar monitor de recursos
    console.log('📊 Creando monitor de recursos...');
    let resourceMonitor = await ResourceMonitor.findOne({});
    
    if (!resourceMonitor) {
      resourceMonitor = new ResourceMonitor({
        resources: {
          water: { current: 5000, max: 10000 },
          oxygen: { current: 2500, max: 5000 },
          energy: { current: 5000, max: 10000 },
          food: { current: 1000, max: 2000 },
          constructionMaterials: { current: 10000, max: 50000 },
          lifeSupportMaterials: { current: 2000, max: 10000 }
        },
        population: { current: 25, max: 100 }
      });
      await resourceMonitor.save();
      console.log('✅ Monitor de recursos creado');
    } else {
      console.log('✅ Monitor de recursos ya existe');
    }
    console.log('');
    
    // 2. Obtener cráteres existentes (si hay datos cargados)
    // Por ahora, crearemos algunos cráteres de ejemplo con coordenadas conocidas de Marte
    console.log('🌑 Creando materiales en cráteres...');
    
    // Función para normalizar longitud al rango -180 a 180
    const normalizeLongitude = (lon) => {
      while (lon > 180) lon -= 360;
      while (lon < -180) lon += 360;
      return lon;
    };

    // Cráteres de ejemplo en Marte (coordenadas reales)
    // Nota: Algunas longitudes están en formato 0-360, las convertimos a -180 a 180
    const exampleCraters = [
      // Cráteres explorados con materiales
      { craterId: 'gale-crater', lat: -5.4, lon: normalizeLongitude(137.8), diameter: 154, explorationStatus: 'mapped', hasMaterials: true },
      { craterId: 'jezero-crater', lat: 18.4, lon: normalizeLongitude(77.5), diameter: 49, explorationStatus: 'sampled', hasMaterials: true },
      { craterId: 'gusev-crater', lat: -14.6, lon: normalizeLongitude(175.4), diameter: 160, explorationStatus: 'mapped', hasMaterials: true },
      { craterId: 'endeavour-crater', lat: -2.3, lon: normalizeLongitude(354.8), diameter: 22, explorationStatus: 'sampled', hasMaterials: true },
      { craterId: 'victoria-crater', lat: -2.1, lon: normalizeLongitude(354.5), diameter: 0.75, explorationStatus: 'scanned', hasMaterials: true },
      { craterId: 'eagle-crater', lat: -1.9, lon: normalizeLongitude(354.5), diameter: 0.022, explorationStatus: 'sampled', hasMaterials: true },
      { craterId: 'endurance-crater', lat: -1.9, lon: normalizeLongitude(354.5), diameter: 0.13, explorationStatus: 'scanned', hasMaterials: true },
      { craterId: 'burns-formation', lat: -14.6, lon: normalizeLongitude(175.4), diameter: 0.1, explorationStatus: 'sampled', hasMaterials: true },
      { craterId: 'home-plate', lat: -14.6, lon: normalizeLongitude(175.4), diameter: 0.09, explorationStatus: 'scanned', hasMaterials: true },
      { craterId: 'columbia-hills', lat: -14.6, lon: normalizeLongitude(175.4), diameter: 0.5, explorationStatus: 'sampled', hasMaterials: true },
      
      // Cráteres explorados sin materiales detectados
      { craterId: 'schiaparelli-crater', lat: -2.7, lon: normalizeLongitude(16.8), diameter: 461, explorationStatus: 'scanned', hasMaterials: false },
      { craterId: 'hellas-basin', lat: -42.4, lon: normalizeLongitude(70.5), diameter: 2300, explorationStatus: 'scanned', hasMaterials: false },
      { craterId: 'argyre-basin', lat: -50.2, lon: normalizeLongitude(43.9), diameter: 1800, explorationStatus: 'scanned', hasMaterials: false },
      { craterId: 'isidis-basin', lat: 12.9, lon: normalizeLongitude(87.0), diameter: 1500, explorationStatus: 'scanned', hasMaterials: false },
      { craterId: 'utopia-planitia', lat: 46.7, lon: normalizeLongitude(117.5), diameter: 3200, explorationStatus: 'scanned', hasMaterials: false },
      
      // Cráteres sin explorar (con potencial de materiales)
      { craterId: 'syrtis-major-crater-1', lat: 8.2, lon: normalizeLongitude(69.6), diameter: 45, explorationStatus: 'unexplored', hasMaterials: true },
      { craterId: 'syrtis-major-crater-2', lat: 9.1, lon: normalizeLongitude(71.2), diameter: 32, explorationStatus: 'unexplored', hasMaterials: true },
      { craterId: 'amazonis-planitia-1', lat: 24.8, lon: normalizeLongitude(196.0), diameter: 28, explorationStatus: 'unexplored', hasMaterials: true },
      { craterId: 'amazonis-planitia-2', lat: 25.3, lon: normalizeLongitude(197.5), diameter: 19, explorationStatus: 'unexplored', hasMaterials: true },
      { craterId: 'tharsis-region-1', lat: 1.5, lon: normalizeLongitude(247.4), diameter: 38, explorationStatus: 'unexplored', hasMaterials: false },
      { craterId: 'tharsis-region-2', lat: 2.1, lon: normalizeLongitude(248.1), diameter: 25, explorationStatus: 'unexplored', hasMaterials: false },
      { craterId: 'valles-marineris-1', lat: -13.9, lon: normalizeLongitude(300.9), diameter: 42, explorationStatus: 'unexplored', hasMaterials: true },
      { craterId: 'valles-marineris-2', lat: -14.2, lon: normalizeLongitude(301.5), diameter: 31, explorationStatus: 'unexplored', hasMaterials: true },
      { craterId: 'elysium-planitia-1', lat: 3.0, lon: normalizeLongitude(154.7), diameter: 35, explorationStatus: 'unexplored', hasMaterials: false },
      { craterId: 'elysium-planitia-2', lat: 3.5, lon: normalizeLongitude(155.2), diameter: 27, explorationStatus: 'unexplored', hasMaterials: true }
    ];
    
    let created = 0;
    let updated = 0;
    
    for (const crater of exampleCraters) {
      const materials = crater.hasMaterials ? getRandomMaterials() : [];
      const priority = getExplorationPriority(crater.diameter, materials);
      const explorationStatus = crater.explorationStatus || (materials.length > 0 ? 'sampled' : 'scanned');
      
      const craterMaterial = await CraterMaterial.findOne({ craterId: crater.craterId });
      
      if (craterMaterial) {
        // Actualizar materiales existentes solo si tiene materiales
        if (crater.hasMaterials) {
          materials.forEach(material => {
            craterMaterial.addMaterial(material);
          });
        }
        craterMaterial.explorationPriority = priority;
        craterMaterial.explorationStatus = explorationStatus;
        await craterMaterial.save();
        updated++;
      } else {
        // Crear nuevo
        const newCraterMaterial = new CraterMaterial({
          craterId: crater.craterId,
          location: {
            type: 'Point',
            coordinates: [crater.lon, crater.lat]
          },
          latitude: crater.lat,
          longitude: crater.lon,
          diameter: crater.diameter,
          materials: materials,
          explorationStatus: explorationStatus,
          explorationPriority: priority
        });
        
        await newCraterMaterial.save();
        created++;
      }
    }
    
    console.log(`✅ Cráteres procesados: ${created} creados, ${updated} actualizados`);
    console.log('');
    
    // 3. Resumen final
    const [resourceCount, craterCount, craterWithMaterials] = await Promise.all([
      ResourceMonitor.countDocuments(),
      CraterMaterial.countDocuments(),
      CraterMaterial.countDocuments({ 'materials.0': { $exists: true } })
    ]);
    
    console.log('📊 Resumen de datos de colonia:');
    console.log(`   - Monitores de recursos: ${resourceCount}`);
    console.log(`   - Cráteres con materiales: ${craterCount}`);
    console.log(`   - Cráteres con materiales detectados: ${craterWithMaterials}`);
    console.log('');
    console.log('✅ Inicialización de datos de colonia completada!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la inicialización:', error);
    process.exit(1);
  }
}

// Ejecutar script
initColonyData();

