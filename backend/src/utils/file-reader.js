import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Lee el contenido de un archivo de texto
 * @param {string} filePath - Ruta al archivo
 * @returns {Promise<string>} Contenido del archivo
 */
export async function readFile(filePath) {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(__dirname, '../../..', filePath);

  try {
    return await fs.readFile(absolutePath, 'utf-8');
  } catch (error) {
    throw new Error(`Error reading file ${absolutePath}: ${error.message}`);
  }
}

/**
 * Verifica si un archivo existe
 * @param {string} filePath - Ruta al archivo
 * @returns {Promise<boolean>} true si existe, false si no
 */
export async function fileExists(filePath) {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(__dirname, '../../..', filePath);

  try {
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Obtiene información de un archivo
 * @param {string} filePath - Ruta al archivo
 * @returns {Promise<Object>} Información del archivo
 */
export async function getFileInfo(filePath) {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(__dirname, '../../..', filePath);

  try {
    const stats = await fs.stat(absolutePath);
    return {
      path: absolutePath,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory()
    };
  } catch (error) {
    throw new Error(`Error getting file info for ${absolutePath}: ${error.message}`);
  }
}

/**
 * Resuelve la ruta relativa a la raíz del proyecto
 * @param {string} relativePath - Ruta relativa desde la raíz del proyecto
 * @returns {string} Ruta absoluta
 */
export function resolveProjectPath(relativePath) {
  return path.resolve(__dirname, '../../..', relativePath);
}

