import { BaseDataLoader } from './BaseDataLoader.js';
import { parseCSV } from '../utils/csv-parser.js';
import REMSWeatherData from '../models/REMSWeatherData.js';

export class REMSWeatherLoader extends BaseDataLoader {
  constructor() {
    super(REMSWeatherData, 'rems_weather_data');
  }

  /**
   * Carga los datos de REMS desde un archivo CSV
   */
  async load(filePath) {
    console.log(`📂 Loading REMS weather data from: ${filePath}`);
    
    const rawData = await parseCSV(filePath);
    const documents = rawData.map(row => this.transform(row));
    
    return documents;
  }

  /**
   * Transforma una fila del CSV en el formato del modelo
   */
  transform(rawData) {
    const solNumber = this.extractSolNumber(rawData.sol_number);

    return {
      earthDateTime: rawData.earth_date_time || null,
      marsDateTime: rawData.mars_date_time || null,
      solNumber: solNumber,
      maxGroundTemp: this.parseNumber(rawData['max_ground_temp(°C)']),
      minGroundTemp: this.parseNumber(rawData['min_ground_temp(°C)']),
      maxAirTemp: this.parseNumber(rawData['max_air_temp(°C)']),
      minAirTemp: this.parseNumber(rawData['min_air_temp(°C)']),
      meanPressure: this.parseNumber(rawData.mean_pressure_Pa),
      windSpeed: this.parseStringValue(rawData['wind_speed(m/h)']),
      humidity: this.parseStringValue(rawData['humidity(%)']),
      sunrise: rawData.sunrise || null,
      sunset: rawData.sunset || null,
      uvRadiation: rawData.UV_Radiation || null,
      weather: rawData.weather || null
    };
  }

  /**
   * Extrae el número SOL de un string como "Sol 3368"
   */
  extractSolNumber(solString) {
    if (!solString) return null;
    const match = solString.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  }

  /**
   * Parsea un número, retorna null si no es válido
   */
  parseNumber(value) {
    if (!value || value === 'Value not available') return null;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Parsea un valor de string, retorna null si es "Value not available"
   */
  parseStringValue(value) {
    if (!value || value === 'Value not available') return null;
    return value.trim();
  }

  /**
   * Obtiene la clave única para datos REMS (solNumber + earthDateTime es único)
   */
  getUniqueKey(doc) {
    return { 
      solNumber: doc.solNumber, 
      earthDateTime: doc.earthDateTime 
    };
  }
}

