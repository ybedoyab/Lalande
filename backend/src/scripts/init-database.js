import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../config/database.js';
import { LandingSiteLoader } from '../data-loaders/LandingSiteLoader.js';
import { REMSWeatherLoader } from '../data-loaders/REMSWeatherLoader.js';
import { MEDACalibratedLoader, MEDADerivedLoader } from '../data-loaders/MEDADataLoader.js';
import { SeismicCatalogLoader, SeismicEventLoader } from '../data-loaders/SeismicLoader.js';
import { RockfallLabelLoader, RockfallClassLoader } from '../data-loaders/RockfallLoader.js';
import { resolveProjectPath, fileExists } from '../utils/file-reader.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de rutas de datos
const DATA_BASE_PATH = resolveProjectPath('data');

/**
 * Clase principal para inicializar la base de datos
 * Sigue principios SOLID: Single Responsibility, Open/Closed
 */
class DatabaseInitializer {
  constructor() {
    this.stats = {
      collections: {},
      errors: [],
      startTime: null,
      endTime: null
    };
  }

  /**
   * Inicializa todas las colecciones
   */
  async initialize() {
    this.stats.startTime = new Date();
    console.log('🚀 Iniciando carga de datos en MongoDB...\n');

    try {
      // Conectar a MongoDB
      await connectDB();
      console.log('✅ Conectado a MongoDB\n');

      // Cargar solo Landing Sites y REMS Weather
      await Promise.allSettled([
        this.loadLandingSites(),
        this.loadREMSWeather()
      ]);

      this.stats.endTime = new Date();
      this.printSummary();

    } catch (error) {
      console.error('❌ Error durante la inicialización:', error);
      this.stats.errors.push(error.message);
      process.exit(1);
    }
  }

  /**
   * Carga los sitios de aterrizaje
   */
  async loadLandingSites() {
    console.log('📦 Cargando Landing Sites...');
    try {
      const loader = new LandingSiteLoader();
      const filePath = path.join(DATA_BASE_PATH, 'mars-landing-sites', 'landing_mars.csv');
      const documents = await loader.load(filePath);
      const result = await loader.save(documents, { 
        clearCollection: true,
        skipDuplicates: true 
      });
      
      this.stats.collections.landing_sites = result;
      console.log(`   ✅ ${result.inserted} sitios de aterrizaje cargados (${result.skipped} duplicados omitidos)\n`);
    } catch (error) {
      console.error(`   ❌ Error cargando Landing Sites: ${error.message}\n`);
      this.stats.errors.push(`Landing Sites: ${error.message}`);
    }
  }

  /**
   * Carga los datos de REMS
   */
  async loadREMSWeather() {
    console.log('📦 Cargando REMS Weather Data...');
    try {
      const loader = new REMSWeatherLoader();
      const filePath = path.join(DATA_BASE_PATH, 'mars-rover-environmental-monitoring-station', 'REMS_Mars_Dataset.csv');
      const documents = await loader.load(filePath);
      const result = await loader.save(documents, { 
        clearCollection: true, 
        batchSize: 500,
        skipDuplicates: true 
      });
      
      this.stats.collections.rems_weather_data = result;
      console.log(`   ✅ ${result.inserted} registros de REMS cargados (${result.skipped} duplicados omitidos)\n`);
    } catch (error) {
      console.error(`   ❌ Error cargando REMS Weather: ${error.message}\n`);
      this.stats.errors.push(`REMS Weather: ${error.message}`);
    }
  }

  /**
   * Carga los datos de MEDA (Calibrados y Derivados)
   */
  async loadMEDAData() {
    console.log('📦 Cargando MEDA Data...');
    
    const sensorTypes = ['ATS', 'PS', 'WS', 'TIRS', 'RHS', 'RDS', 'ENG'];
    const calPath = path.join(DATA_BASE_PATH, 'meda-mars-weather-and-atmosphere-sensor-data', 'CAL');
    const derPath = path.join(DATA_BASE_PATH, 'meda-mars-weather-and-atmosphere-sensor-data', 'DER');

    // Cargar datos calibrados
    for (const sensorType of sensorTypes) {
      try {
        console.log(`   📊 Cargando MEDA ${sensorType} (Calibrated)...`);
        const loader = new MEDACalibratedLoader(sensorType, {
          maxFileSizeMB: 1000, // Límite aumentado a 1GB para procesar archivos grandes
          batchSize: 500,      // Procesar en lotes de 500
          maxRowsPerFile: null // Sin límite de filas
        });
        
        // loadAll ahora retorna directamente el resultado {inserted, skipped}
        const result = await loader.loadAll(calPath);
        
        this.stats.collections[`meda_cal_${sensorType}`] = result;
        console.log(`      ✅ Total: ${result.inserted} registros insertados, ${result.skipped} archivos omitidos`);
      } catch (error) {
        console.error(`      ⚠️  Error cargando MEDA ${sensorType}: ${error.message}`);
        this.stats.errors.push(`MEDA ${sensorType} Calibrated: ${error.message}`);
      }
    }

    // Cargar datos derivados
    const derivedTypes = ['PS', 'RHS', 'TIRS', 'WS', 'ANCILLARY'];
    for (const sensorType of derivedTypes) {
      try {
        console.log(`   📊 Cargando MEDA ${sensorType} (Derived)...`);
        const loader = new MEDADerivedLoader(sensorType, {
          maxFileSizeMB: 1000, // Límite aumentado a 1GB para procesar archivos grandes
          batchSize: 500,
          maxRowsPerFile: null
        });
        
        // loadAll ahora retorna directamente el resultado {inserted, skipped}
        const result = await loader.loadAll(derPath);
        
        this.stats.collections[`meda_der_${sensorType}`] = result;
        console.log(`      ✅ Total: ${result.inserted} registros insertados, ${result.skipped} archivos omitidos`);
      } catch (error) {
        console.error(`      ⚠️  Error cargando MEDA ${sensorType} Derived: ${error.message}`);
        this.stats.errors.push(`MEDA ${sensorType} Derived: ${error.message}`);
      }
    }

    console.log('   ✅ MEDA Data cargado\n');
  }

  /**
   * Carga los datos sísmicos (luna y marte)
   */
  async loadSeismicData() {
    console.log('📦 Cargando Seismic Data...');
    
    const planets = ['mars', 'lunar'];
    
    for (const planet of planets) {
      console.log(`   🪐 Procesando datos de ${planet}...`);
      
      try {
        // Cargar catálogos
        const catalogLoader = new SeismicCatalogLoader(planet);
        const catalogPath = path.join(DATA_BASE_PATH, 'nasa-seismic-detection', planet, 'train');
        const catalogFile = path.join(catalogPath, `${planet}_train_catalog.csv`);
        
        if (await fileExists(catalogFile)) {
          const catalogDocs = await catalogLoader.load(catalogFile, 'train');
          const catalogResult = await catalogLoader.save(catalogDocs, { clearCollection: true });
          this.stats.collections[`seismic_catalogs_${planet}`] = catalogResult;
          console.log(`      ✅ Catálogo: ${catalogResult.inserted} eventos`);
        }

        // Cargar eventos (puede ser muy grande, hacerlo en lotes)
        const eventLoader = new SeismicEventLoader(planet);
        const eventPath = path.join(DATA_BASE_PATH, 'nasa-seismic-detection', planet, 'train');
        const eventDocs = await eventLoader.loadAll(eventPath, 'train');
        
        if (eventDocs.length > 0) {
          const eventResult = await eventLoader.save(eventDocs, { clearCollection: true, batchSize: 500 });
          this.stats.collections[`seismic_events_${planet}`] = eventResult;
          console.log(`      ✅ Eventos: ${eventResult.inserted} eventos cargados`);
        }

      } catch (error) {
        console.error(`      ❌ Error cargando datos sísmicos de ${planet}: ${error.message}`);
        this.stats.errors.push(`Seismic ${planet}: ${error.message}`);
      }
    }

    console.log('   ✅ Seismic Data cargado\n');
  }

  /**
   * Carga las clases de rockfall
   */
  async loadRockfallClasses() {
    console.log('📦 Cargando Rockfall Classes...');
    try {
      const loader = new RockfallClassLoader();
      const filePath = path.join(DATA_BASE_PATH, 'rockfall-detection-on-mars', 'mars', 'train_labels', 'train_classes_ma.csv');
      const documents = await loader.load(filePath);
      const result = await loader.save(documents, { 
        clearCollection: true,
        skipDuplicates: true 
      });
      
      this.stats.collections.rockfall_classes = result;
      console.log(`   ✅ ${result.inserted} clases cargadas (${result.skipped} duplicados omitidos)\n`);
    } catch (error) {
      console.error(`   ❌ Error cargando Rockfall Classes: ${error.message}\n`);
      this.stats.errors.push(`Rockfall Classes: ${error.message}`);
    }
  }

  /**
   * Carga las etiquetas de rockfall
   */
  async loadRockfallLabels() {
    console.log('📦 Cargando Rockfall Labels...');
    
    const datasets = ['train', 'test'];
    
    for (const dataset of datasets) {
      try {
        console.log(`   📋 Cargando labels de ${dataset}...`);
        const loader = new RockfallLabelLoader();
        const filePath = path.join(DATA_BASE_PATH, 'rockfall-detection-on-mars', 'mars', `${dataset}_labels`, `${dataset}_labels_ma.csv`);
        const documents = await loader.load(filePath, dataset);
        const result = await loader.save(documents, { 
          clearCollection: dataset === 'train',
          skipDuplicates: true 
        });
        
        this.stats.collections[`rockfall_labels_${dataset}`] = result;
        console.log(`      ✅ ${result.inserted} labels cargadas`);
      } catch (error) {
        console.error(`      ❌ Error cargando Rockfall Labels (${dataset}): ${error.message}`);
        this.stats.errors.push(`Rockfall Labels ${dataset}: ${error.message}`);
      }
    }

    console.log('   ✅ Rockfall Labels cargadas\n');
  }

  /**
   * Imprime un resumen de la carga
   */
  printSummary() {
    const duration = (this.stats.endTime - this.stats.startTime) / 1000;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE CARGA DE DATOS');
    console.log('='.repeat(60));
    
    let totalInserted = 0;
    let totalSkipped = 0;
    
    Object.entries(this.stats.collections).forEach(([collection, result]) => {
      totalInserted += result.inserted || 0;
      totalSkipped += result.skipped || 0;
      console.log(`   ${collection}: ${result.inserted || 0} insertados, ${result.skipped || 0} omitidos`);
    });
    
    console.log('='.repeat(60));
    console.log(`   Total insertados: ${totalInserted}`);
    console.log(`   Total omitidos: ${totalSkipped}`);
    console.log(`   Duración: ${duration.toFixed(2)} segundos`);
    
    if (this.stats.errors.length > 0) {
      console.log(`\n   ⚠️  Errores: ${this.stats.errors.length}`);
      this.stats.errors.forEach(err => console.log(`      - ${err}`));
    }
    
    console.log('='.repeat(60) + '\n');
  }
}

// Ejecutar inicialización
const initializer = new DatabaseInitializer();
initializer.initialize()
  .then(() => {
    console.log('✅ Inicialización completada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal durante la inicialización:', error);
    process.exit(1);
  });

