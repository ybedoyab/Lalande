import { BaseDataLoader } from './BaseDataLoader.js';
import { parseCSV, findCSVFiles } from '../utils/csv-parser.js';
import { fileExists } from '../utils/file-reader.js';
import path from 'path';
import SeismicEvent from '../models/SeismicEvent.js';
import SeismicCatalog from '../models/SeismicCatalog.js';

export class SeismicCatalogLoader extends BaseDataLoader {
  constructor(planet) {
    super(SeismicCatalog, `seismic_catalogs_${planet}`);
    this.planet = planet;
  }

  /**
   * Carga un catálogo de eventos sísmicos
   */
  async load(filePath, dataset) {
    console.log(`📂 Loading ${this.planet} seismic catalog from: ${filePath}`);
    
    const rawData = await parseCSV(filePath);
    const documents = rawData.map(row => this.transform(row, dataset));
    
    return documents;
  }

  /**
   * Transforma una fila del catálogo
   */
  transform(rawData, dataset) {
    const timeAbs = this.parseDate(rawData['time_abs(%Y-%m-%dT%H:%M:%S.%f)']);
    
    return {
      filename: rawData.filename || null,
      timeAbs: timeAbs,
      timeRel: this.parseNumber(rawData['time_rel(sec)']),
      evid: rawData.evid || null,
      planet: this.planet,
      dataset: dataset,
      mqType: rawData.mq_type || null
    };
  }

  parseDate(dateString) {
    if (!dateString) return null;
    try {
      return new Date(dateString);
    } catch {
      return null;
    }
  }

  parseNumber(value) {
    if (!value) return null;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Obtiene la clave única para catálogos sísmicos (planet + dataset + evid)
   */
  getUniqueKey(doc) {
    return {
      planet: doc.planet,
      dataset: doc.dataset,
      evid: doc.evid
    };
  }
}

export class SeismicEventLoader extends BaseDataLoader {
  constructor(planet) {
    super(SeismicEvent, `seismic_events_${planet}`);
    this.planet = planet;
  }

  /**
   * Carga todos los eventos sísmicos de un directorio
   */
  async loadAll(directoryPath, dataset) {
    console.log(`📂 Loading ${this.planet} seismic events from: ${directoryPath}`);
    
    const files = await findCSVFiles(directoryPath);
    const allDocuments = [];

    for (const filePath of files) {
      // Omitir catálogos
      if (filePath.includes('_catalog.csv')) continue;
      
      const documents = await this.load(filePath, dataset);
      allDocuments.push(...documents);
    }

    return allDocuments;
  }

  /**
   * Carga un archivo CSV de evento sísmico individual
   */
  async load(filePath, dataset) {
    const fileName = path.basename(filePath);
    const grade = this.extractGrade(filePath);
    
    const rawData = await parseCSV(filePath);
    
    // Los archivos CSV de eventos sísmicos suelen tener múltiples columnas de datos
    // Convertir cada fila en un documento
    const documents = rawData.map((row, index) => this.transform(row, fileName, dataset, grade, index));
    
    return documents;
  }

  /**
   * Transforma una fila del evento sísmico
   */
  transform(rawData, fileName, dataset, grade, index) {
    // Extraer evid del nombre del archivo si es posible
    const evidMatch = fileName.match(/evid(\d+)/);
    const evid = evidMatch ? `evid${evidMatch[1].padStart(5, '0')}` : null;

    // Los datos del evento pueden variar, guardar todo como datos dinámicos
    const eventData = {};
    Object.keys(rawData).forEach(key => {
      const value = rawData[key];
      if (value && value !== '' && !isNaN(value)) {
        eventData[key] = parseFloat(value);
      } else {
        eventData[key] = value || null;
      }
    });

    return {
      filename: fileName,
      planet: this.planet,
      dataset: dataset,
      evid: evid,
      grade: grade,
      filePath: null, // Se puede actualizar después
      data: eventData,
      rowIndex: index
    };
  }

  /**
   * Extrae el grado del path (GradeA, GradeB)
   */
  extractGrade(filePath) {
    if (filePath.includes('GradeA')) return 'GradeA';
    if (filePath.includes('GradeB')) return 'GradeB';
    return null;
  }

  /**
   * Obtiene la clave única para eventos sísmicos (filename + planet + dataset + rowIndex)
   */
  getUniqueKey(doc) {
    return {
      filename: doc.filename,
      planet: doc.planet,
      dataset: doc.dataset,
      rowIndex: doc.rowIndex
    };
  }
}

