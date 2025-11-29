import { BaseDataLoader } from './BaseDataLoader.js';
import { findCSVFiles } from '../utils/csv-parser.js';
import { streamCSVWithBatches, getFileSizeMB } from '../utils/csv-stream-parser.js';
import MEDACalibratedData from '../models/MEDACalibratedData.js';
import MEDADerivedData from '../models/MEDADerivedData.js';
import path from 'path';

export class MEDACalibratedLoader extends BaseDataLoader {
  constructor(sensorType, options = {}) {
    super(MEDACalibratedData, `meda_calibrated_data_${sensorType}`);
    this.sensorType = sensorType;
    this.maxFileSizeMB = options.maxFileSizeMB || 100; // Límite por defecto de 100MB
    this.batchSize = options.batchSize || 500;
    this.maxRowsPerFile = options.maxRowsPerFile || null; // Sin límite por defecto
  }

  /**
   * Carga todos los archivos CSV de un tipo de sensor específico
   * Procesa archivo por archivo para evitar problemas de memoria
   */
  async loadAll(directoryPath) {
    console.log(`📂 Loading MEDA ${this.sensorType} calibrated data from: ${directoryPath}`);
    
    const files = await findCSVFiles(directoryPath, `CAL_${this.sensorType}`);
    let totalInserted = 0;
    let totalSkipped = 0;

    for (const filePath of files) {
      const fileSizeMB = getFileSizeMB(filePath);
      console.log(`   📄 Procesando: ${path.basename(filePath)} (${fileSizeMB.toFixed(2)}MB)`);
      
      try {
        const result = await this.loadAndSave(filePath);
        totalInserted += result.inserted || 0;
        totalSkipped += result.skipped || 0;
        
        if (result.skippedFile) {
          console.log(`      ⚠️  Archivo saltado: ${result.reason}`);
        } else {
          console.log(`      ✅ ${result.inserted} registros insertados`);
        }
      } catch (error) {
        console.error(`      ❌ Error procesando archivo: ${error.message}`);
        totalSkipped++;
      }
    }

    return { inserted: totalInserted, skipped: totalSkipped };
  }

  /**
   * Carga un archivo CSV individual y lo guarda directamente en la BD
   * Usa streaming para evitar cargar todo en memoria
   */
  async loadAndSave(filePath) {
    const solRange = this.extractSolFromFilePath(filePath);
    const sol = solRange ? Math.floor((solRange.start + solRange.end) / 2) : null;
    
    let inserted = 0;
    let skipped = 0;

    const result = await streamCSVWithBatches(
      filePath,
      async (batch) => {
        // Transformar el lote
        const documents = batch.map(row => this.transform(row, sol));
        
        // Guardar el lote directamente
        try {
          const saveResult = await this.model.insertMany(documents, {
            ordered: false,
            rawResult: false
          });
          return { processed: saveResult.length, errors: [] };
        } catch (error) {
          // Si hay errores de duplicados, intentar uno por uno
          let batchInserted = 0;
          let batchSkipped = 0;
          
          for (const doc of documents) {
            try {
              await this.model.create(doc);
              batchInserted++;
            } catch (err) {
              if (err.code !== 11000) {
                console.warn(`Error inserting document: ${err.message}`);
              }
              batchSkipped++;
            }
          }
          
          return { processed: batchInserted, errors: [] };
        }
      },
      {
        batchSize: this.batchSize,
        maxRows: this.maxRowsPerFile,
        maxFileSizeMB: this.maxFileSizeMB,
        transformFn: null // La transformación se hace en el batchProcessor
      }
    );

    if (result.skipped) {
      return { inserted: 0, skipped: 1, skippedFile: true, reason: result.reason };
    }

    return { inserted: result.processed, skipped: result.errors?.length || 0 };
  }

  /**
   * Método legacy - mantenido para compatibilidad
   */
  async load(filePath) {
    const solRange = this.extractSolFromFilePath(filePath);
    const sol = solRange ? Math.floor((solRange.start + solRange.end) / 2) : null;
    
    // Para archivos grandes, usar loadAndSave
    const fileSizeMB = getFileSizeMB(filePath);
    if (fileSizeMB > 10) {
      throw new Error(`File too large for in-memory loading (${fileSizeMB.toFixed(2)}MB). Use loadAndSave() instead.`);
    }
    
    // Para archivos pequeños, mantener compatibilidad
    const { parseCSV } = await import('../utils/csv-parser.js');
    const rawData = await parseCSV(filePath);
    return rawData.map(row => this.transform(row, sol));
  }

  /**
   * Transforma una fila del CSV en el formato del modelo
   */
  transform(rawData, sol = null) {
    // Extraer todos los campos excepto los metadatos
    const data = {};
    Object.keys(rawData).forEach(key => {
      if (!['SCLK', 'LMST', 'LTST'].includes(key.toUpperCase())) {
        const value = rawData[key];
        // Intentar parsear números
        if (value && value !== '' && !isNaN(value)) {
          data[key] = parseFloat(value);
        } else {
          data[key] = value || null;
        }
      }
    });

    return {
      sensorType: this.sensorType,
      sol: sol,
      sclk: this.parseNumber(rawData.SCLK),
      lmst: rawData.LMST || null,
      ltst: rawData.LTST || null,
      data: data
    };
  }

  /**
   * Extrae el número SOL del nombre del archivo
   */
  extractSolFromFilePath(filePath) {
    const fileName = path.basename(filePath);
    const match = fileName.match(/SOL_(\d+)_(\d+)/);
    if (match) {
      return {
        start: parseInt(match[1], 10),
        end: parseInt(match[2], 10)
      };
    }
    return null;
  }

  parseNumber(value) {
    if (!value || value === '') return null;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Obtiene la clave única para datos MEDA calibrados (sensorType + sol + sclk es único)
   */
  getUniqueKey(doc) {
    return {
      sensorType: doc.sensorType,
      sol: doc.sol,
      sclk: doc.sclk
    };
  }
}

export class MEDADerivedLoader extends BaseDataLoader {
  constructor(sensorType, options = {}) {
    super(MEDADerivedData, `meda_derived_data_${sensorType}`);
    this.sensorType = sensorType;
    this.maxFileSizeMB = options.maxFileSizeMB || 100;
    this.batchSize = options.batchSize || 500;
    this.maxRowsPerFile = options.maxRowsPerFile || null;
  }

  /**
   * Carga todos los archivos CSV de un tipo de sensor derivado
   */
  async loadAll(directoryPath) {
    console.log(`📂 Loading MEDA ${this.sensorType} derived data from: ${directoryPath}`);
    
    const files = await findCSVFiles(directoryPath, `DER_${this.sensorType}`);
    let totalInserted = 0;
    let totalSkipped = 0;

    for (const filePath of files) {
      const fileSizeMB = getFileSizeMB(filePath);
      console.log(`   📄 Procesando: ${path.basename(filePath)} (${fileSizeMB.toFixed(2)}MB)`);
      
      try {
        const result = await this.loadAndSave(filePath);
        totalInserted += result.inserted || 0;
        totalSkipped += result.skipped || 0;
        
        if (result.skippedFile) {
          console.log(`      ⚠️  Archivo saltado: ${result.reason}`);
        } else {
          console.log(`      ✅ ${result.inserted} registros insertados`);
        }
      } catch (error) {
        console.error(`      ❌ Error procesando archivo: ${error.message}`);
        totalSkipped++;
      }
    }

    return { inserted: totalInserted, skipped: totalSkipped };
  }

  /**
   * Carga un archivo CSV individual y lo guarda directamente en la BD
   */
  async loadAndSave(filePath) {
    const solRange = this.extractSolFromFilePath(filePath);
    const sol = solRange ? Math.floor((solRange.start + solRange.end) / 2) : null;
    
    const result = await streamCSVWithBatches(
      filePath,
      async (batch) => {
        const documents = batch.map(row => this.transform(row, sol));
        
        // Verificar duplicados antes de insertar (para datos derivados, verificación básica)
        try {
          const saveResult = await this.model.insertMany(documents, {
            ordered: false,
            rawResult: false
          });
          return { processed: saveResult.length, errors: [], skipped: 0 };
        } catch (error) {
          // Si hay errores, procesar uno por uno para capturar duplicados
          let batchInserted = 0;
          let batchSkipped = 0;
          
          for (const doc of documents) {
            try {
              await this.model.create(doc);
              batchInserted++;
            } catch (err) {
              if (err.code === 11000) {
                // Duplicado, saltar
                batchSkipped++;
              } else {
                console.warn(`Error inserting document: ${err.message}`);
                batchSkipped++;
              }
            }
          }
          
          return { processed: batchInserted, errors: [], skipped: batchSkipped };
        }
      },
      {
        batchSize: this.batchSize,
        maxRows: this.maxRowsPerFile,
        maxFileSizeMB: this.maxFileSizeMB
      }
    );

    if (result.skipped) {
      return { inserted: 0, skipped: 1, skippedFile: true, reason: result.reason };
    }

    return { inserted: result.processed, skipped: result.errors?.length || 0 };
  }

  /**
   * Método legacy - mantenido para compatibilidad
   */
  async load(filePath) {
    const solRange = this.extractSolFromFilePath(filePath);
    const sol = solRange ? Math.floor((solRange.start + solRange.end) / 2) : null;
    
    const fileSizeMB = getFileSizeMB(filePath);
    if (fileSizeMB > 10) {
      throw new Error(`File too large for in-memory loading (${fileSizeMB.toFixed(2)}MB). Use loadAndSave() instead.`);
    }
    
    const { parseCSV } = await import('../utils/csv-parser.js');
    const rawData = await parseCSV(filePath);
    return rawData.map(row => this.transform(row, sol));
  }

  /**
   * Transforma una fila del CSV en el formato del modelo
   */
  transform(rawData, sol = null) {
    const data = {};
    Object.keys(rawData).forEach(key => {
      const value = rawData[key];
      if (value && value !== '' && !isNaN(value)) {
        data[key] = parseFloat(value);
      } else {
        data[key] = value || null;
      }
    });

    return {
      sensorType: this.sensorType,
      sol: sol,
      data: data
    };
  }

  /**
   * Extrae el número SOL del nombre del archivo
   */
  extractSolFromFilePath(filePath) {
    const fileName = path.basename(filePath);
    const match = fileName.match(/SOL_(\d+)_(\d+)/);
    if (match) {
      return {
        start: parseInt(match[1], 10),
        end: parseInt(match[2], 10)
      };
    }
    return null;
  }

  /**
   * Obtiene la clave única para datos MEDA derivados
   * Nota: No hay índice único, pero usamos sensorType + sol para verificar
   */
  getUniqueKey(doc) {
    // Para datos derivados, usamos una combinación básica
    // Puede haber múltiples registros por sol, así que no es estrictamente único
    return {
      sensorType: doc.sensorType,
      sol: doc.sol
    };
  }
}
