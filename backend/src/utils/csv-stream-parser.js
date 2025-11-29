import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Procesa un archivo CSV en streaming y ejecuta un callback por cada lote
 * Esto evita cargar todo el archivo en memoria
 * @param {string} filePath - Ruta al archivo CSV
 * @param {Function} batchProcessor - Función que procesa cada lote de datos
 * @param {Object} options - Opciones de procesamiento
 * @param {number} options.batchSize - Tamaño del lote (default: 1000)
 * @param {number} options.maxRows - Límite máximo de filas a procesar (default: null = sin límite)
 * @param {number} options.maxFileSizeMB - Tamaño máximo del archivo en MB (default: 50)
 * @returns {Promise<Object>} Resultado del procesamiento
 */
export async function streamCSVWithBatches(filePath, batchProcessor, options = {}) {
  const {
    batchSize = 1000,
    maxRows = null,
    maxFileSizeMB = 50,
    transformFn = null
  } = options;

  return new Promise((resolve, reject) => {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(__dirname, '../../..', filePath);

    if (!fs.existsSync(absolutePath)) {
      reject(new Error(`File not found: ${absolutePath}`));
      return;
    }

    // Verificar tamaño del archivo
    const stats = fs.statSync(absolutePath);
    const fileSizeMB = stats.size / (1024 * 1024);

    if (fileSizeMB > maxFileSizeMB) {
      console.warn(`⚠️  Archivo muy grande (${fileSizeMB.toFixed(2)}MB > ${maxFileSizeMB}MB). Saltando: ${path.basename(absolutePath)}`);
      resolve({
        processed: 0,
        skipped: true,
        reason: `File too large: ${fileSizeMB.toFixed(2)}MB`
      });
      return;
    }

    let batch = [];
    let rowCount = 0;
    let totalProcessed = 0;
    let errors = [];

    const stream = fs.createReadStream(absolutePath)
      .pipe(csv({
        skipEmptyLines: true,
        skipLinesWithError: true
      }))
      .on('data', async (data) => {
        try {
          // Verificar límite de filas
          if (maxRows && rowCount >= maxRows) {
            stream.destroy();
            return;
          }

          const transformed = transformFn ? transformFn(data) : data;
          if (transformed) {
            batch.push(transformed);
            rowCount++;

            // Procesar lote cuando alcanza el tamaño
            if (batch.length >= batchSize) {
              stream.pause();
              try {
                const result = await batchProcessor([...batch]);
                totalProcessed += result.processed || batch.length;
                if (result.errors) {
                  errors.push(...result.errors);
                }
              } catch (error) {
                errors.push(error.message);
                console.warn(`Error processing batch: ${error.message}`);
              }
              batch = [];
              stream.resume();
            }
          }
        } catch (error) {
          console.warn(`Error transforming row: ${error.message}`);
        }
      })
      .on('end', async () => {
        // Procesar lote final
        if (batch.length > 0) {
          try {
            const result = await batchProcessor(batch);
            totalProcessed += result.processed || batch.length;
            if (result.errors) {
              errors.push(...result.errors);
            }
          } catch (error) {
            errors.push(error.message);
          }
        }

        resolve({
          processed: totalProcessed,
          rows: rowCount,
          errors: errors,
          skipped: false
        });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * Obtiene el tamaño de un archivo en MB
 */
export function getFileSizeMB(filePath) {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(__dirname, '../../..', filePath);

  if (!fs.existsSync(absolutePath)) {
    return 0;
  }

  const stats = fs.statSync(absolutePath);
  return stats.size / (1024 * 1024);
}

