import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parsea un archivo CSV y retorna un array de objetos
 * @param {string} filePath - Ruta al archivo CSV
 * @param {Object} options - Opciones de parseo
 * @param {Function} transformFn - Función opcional para transformar cada fila
 * @returns {Promise<Array>} Array de objetos parseados
 */
export async function parseCSV(filePath, options = {}, transformFn = null) {
  return new Promise((resolve, reject) => {
    const results = [];
    const absolutePath = path.isAbsolute(filePath) 
      ? filePath 
      : path.resolve(__dirname, '../../..', filePath);

    if (!fs.existsSync(absolutePath)) {
      reject(new Error(`File not found: ${absolutePath}`));
      return;
    }

    fs.createReadStream(absolutePath)
      .pipe(csv({
        skipEmptyLines: true,
        skipLinesWithError: true,
        ...options
      }))
      .on('data', (data) => {
        try {
          const transformed = transformFn ? transformFn(data) : data;
          if (transformed) {
            results.push(transformed);
          }
        } catch (error) {
          console.warn(`Error transforming row: ${error.message}`);
        }
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * Encuentra todos los archivos CSV en un directorio
 * @param {string} dirPath - Ruta al directorio
 * @param {string} pattern - Patrón opcional para filtrar archivos (ej: "SOL_01_100")
 * @returns {Promise<Array>} Array de rutas a archivos CSV
 */
export async function findCSVFiles(dirPath, pattern = null) {
  return new Promise((resolve, reject) => {
    const absolutePath = path.isAbsolute(dirPath)
      ? dirPath
      : path.resolve(__dirname, '../../..', dirPath);

    if (!fs.existsSync(absolutePath)) {
      reject(new Error(`Directory not found: ${absolutePath}`));
      return;
    }

    const results = [];
    
    function walkDir(currentPath) {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.csv')) {
          if (!pattern || entry.name.includes(pattern)) {
            results.push(fullPath);
          }
        }
      }
    }

    try {
      walkDir(absolutePath);
      resolve(results);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Normaliza el nombre de las columnas del CSV (elimina espacios, convierte a camelCase)
 * @param {string} columnName - Nombre de la columna
 * @returns {string} Nombre normalizado
 */
export function normalizeColumnName(columnName) {
  return columnName
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[()]/g, '')
    .replace(/[°%]/g, '')
    .replace(/\//g, '_')
    .toLowerCase();
}

