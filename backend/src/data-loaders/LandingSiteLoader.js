import { BaseDataLoader } from './BaseDataLoader.js';
import { parseCSV } from '../utils/csv-parser.js';
import LandingSite from '../models/LandingSite.js';

export class LandingSiteLoader extends BaseDataLoader {
  constructor() {
    super(LandingSite, 'landing_sites');
  }

  /**
   * Carga los datos de sitios de aterrizaje desde un archivo CSV
   */
  async load(filePath) {
    console.log(`📂 Loading landing sites from: ${filePath}`);
    
    const rawData = await parseCSV(filePath);
    const documents = rawData.map(row => this.transform(row));
    
    return documents;
  }

  /**
   * Transforma una fila del CSV en el formato del modelo
   */
  transform(rawData) {
    const landingDate = this.parseDate(rawData.Landing_date);
    const latitude = parseFloat(rawData.Latitude);
    let longitude = parseFloat(rawData.Longitude);
    const elevationMeters = parseFloat(rawData.Elevation_meters);

    // Convertir longitud de Marte (0-360) a formato estándar (-180 a 180)
    if (longitude > 180) {
      longitude = longitude - 360;
    }

    return {
      mission: rawData.Mission.trim(),
      landingDate: landingDate,
      landingSite: rawData.Landing_site.trim(),
      latitude: latitude,
      longitude: longitude,
      elevationMeters: elevationMeters,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude] // MongoDB usa [long, lat] en rango -180 a 180
      }
    };
  }

  /**
   * Parsea una fecha en formato DD/MM/YYYY
   */
  parseDate(dateString) {
    const [day, month, year] = dateString.split('/');
    return new Date(`${year}-${month}-${day}`);
  }

  /**
   * Obtiene la clave única para un sitio de aterrizaje (mission es único)
   */
  getUniqueKey(doc) {
    return { mission: doc.mission };
  }
}

