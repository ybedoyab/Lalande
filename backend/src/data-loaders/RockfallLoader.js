import { BaseDataLoader } from './BaseDataLoader.js';
import { parseCSV } from '../utils/csv-parser.js';
import RockfallLabel from '../models/RockfallLabel.js';
import RockfallClass from '../models/RockfallClass.js';

export class RockfallLabelLoader extends BaseDataLoader {
  constructor() {
    super(RockfallLabel, 'rockfall_labels');
  }

  /**
   * Carga las etiquetas de rockfall desde un archivo CSV
   */
  async load(filePath, dataset) {
    console.log(`📂 Loading rockfall labels (${dataset}) from: ${filePath}`);
    
    const rawData = await parseCSV(filePath);
    const documents = rawData.map(row => this.transform(row, dataset));
    
    return documents;
  }

  /**
   * Transforma una fila del CSV en el formato del modelo
   */
  transform(rawData, dataset) {
    return {
      imageId: rawData.IMAGE_ID || rawData.image_id || null,
      dataset: dataset,
      x1: this.parseNumber(rawData.X1 || rawData.x1),
      y1: this.parseNumber(rawData.Y1 || rawData.y1),
      x2: this.parseNumber(rawData.X2 || rawData.x2),
      y2: this.parseNumber(rawData.Y2 || rawData.y2),
      label: rawData.label || 'rockfall'
    };
  }

  parseNumber(value) {
    if (!value) return null;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Obtiene la clave única para labels de rockfall (imageId + dataset + coordenadas)
   */
  getUniqueKey(doc) {
    return {
      imageId: doc.imageId,
      dataset: doc.dataset,
      x1: doc.x1,
      y1: doc.y1,
      x2: doc.x2,
      y2: doc.y2
    };
  }
}

export class RockfallClassLoader extends BaseDataLoader {
  constructor() {
    super(RockfallClass, 'rockfall_classes');
  }

  /**
   * Carga las clases de rockfall desde un archivo CSV
   */
  async load(filePath) {
    console.log(`📂 Loading rockfall classes from: ${filePath}`);
    
    const rawData = await parseCSV(filePath);
    const documents = rawData.map((row, index) => this.transform(row, index));
    
    return documents;
  }

  /**
   * Transforma una fila del CSV en el formato del modelo
   */
  transform(rawData, index) {
    // El formato puede ser: "rockfall,0" o {label: "rockfall", classId: 0}
    const label = rawData.rockfall || rawData.label || Object.keys(rawData)[0];
    const classId = rawData['0'] || rawData.classId || rawData.class_id || index;

    return {
      label: label,
      classId: parseInt(classId, 10) || 0
    };
  }

  /**
   * Obtiene la clave única para clases de rockfall (label es único)
   */
  getUniqueKey(doc) {
    return { label: doc.label };
  }
}

