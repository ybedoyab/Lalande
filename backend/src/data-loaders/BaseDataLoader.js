/**
 * Clase base abstracta para data loaders
 * Sigue el principio de Open/Closed y Dependency Inversion (SOLID)
 */
export class BaseDataLoader {
  constructor(model, collectionName) {
    if (this.constructor === BaseDataLoader) {
      throw new Error('BaseDataLoader cannot be instantiated directly');
    }
    this.model = model;
    this.collectionName = collectionName;
  }

  /**
   * Método abstracto que debe ser implementado por las subclases
   * @param {string} filePath - Ruta al archivo de datos
   * @returns {Promise<Array>} Array de documentos procesados
   */
  async load(filePath) {
    throw new Error('load() method must be implemented by subclass');
  }

  /**
   * Transforma los datos crudos en el formato del modelo
   * @param {Object} rawData - Datos crudos
   * @returns {Object} Datos transformados
   */
  transform(rawData) {
    return rawData;
  }

  /**
   * Genera una clave única para un documento basada en sus campos únicos
   * Debe ser sobrescrito por las subclases según sus índices únicos
   * @param {Object} doc - Documento
   * @returns {Object} Clave única para el documento
   */
  getUniqueKey(doc) {
    // Implementación por defecto: usar _id si existe, sino retornar el documento completo
    return doc._id || doc;
  }

  /**
   * Guarda los documentos en la base de datos con prevención de duplicados
   * @param {Array} documents - Array de documentos a guardar
   * @param {Object} options - Opciones de guardado
   * @returns {Promise<Object>} Resultado de la operación
   */
  async save(documents, options = {}) {
    const { 
      clearCollection = false, 
      batchSize = 1000,
      upsert = false,
      skipDuplicates = true 
    } = options;

    try {
      if (clearCollection) {
        await this.model.deleteMany({});
        console.log(`✅ Cleared collection: ${this.collectionName}`);
      }

      if (!documents || documents.length === 0) {
        return { inserted: 0, skipped: 0, updated: 0 };
      }

      let inserted = 0;
      let skipped = 0;
      let updated = 0;

      // Si upsert está habilitado, usar bulkWrite con upsert
      if (upsert) {
        for (let i = 0; i < documents.length; i += batchSize) {
          const batch = documents.slice(i, i + batchSize);
          const operations = batch.map(doc => ({
            updateOne: {
              filter: this.getUniqueKey(doc),
              update: { $set: doc },
              upsert: true
            }
          }));

          try {
            const result = await this.model.bulkWrite(operations, { ordered: false });
            inserted += result.upsertedCount || 0;
            updated += result.modifiedCount || 0;
            skipped += (batch.length - (result.upsertedCount + result.modifiedCount));
          } catch (error) {
            console.warn(`Error in bulkWrite: ${error.message}`);
            // Fallback a inserción individual
            for (const doc of batch) {
              try {
                await this.model.updateOne(
                  this.getUniqueKey(doc),
                  { $set: doc },
                  { upsert: true }
                );
                inserted++;
              } catch (err) {
                skipped++;
              }
            }
          }
        }
      } else {
        // Inserción normal con manejo de duplicados
        for (let i = 0; i < documents.length; i += batchSize) {
          const batch = documents.slice(i, i + batchSize);
          
          // Filtrar duplicados antes de insertar si skipDuplicates está activo
          let documentsToInsert = batch;
          if (skipDuplicates) {
            const existingKeys = await this.checkExistingKeys(batch);
            documentsToInsert = batch.filter(doc => {
              const key = this.getUniqueKey(doc);
              return !existingKeys.has(JSON.stringify(key));
            });
            skipped += (batch.length - documentsToInsert.length);
          }

          if (documentsToInsert.length === 0) {
            continue;
          }

          try {
            const result = await this.model.insertMany(documentsToInsert, { 
              ordered: false,
              rawResult: false 
            });
            inserted += result.length;
          } catch (error) {
            // Si hay errores de duplicados, procesar uno por uno
            if (error.code === 11000 || error.writeErrors) {
              for (const doc of documentsToInsert) {
                try {
                  await this.model.create(doc);
                  inserted++;
                } catch (err) {
                  if (err.code === 11000) {
                    // Duplicado detectado
                    skipped++;
                  } else {
                    console.warn(`Error inserting document: ${err.message}`);
                    skipped++;
                  }
                }
              }
            } else {
              console.warn(`Error inserting batch: ${error.message}`);
              skipped += documentsToInsert.length;
            }
          }
        }
      }

      return { inserted, skipped, updated };
    } catch (error) {
      throw new Error(`Error saving to ${this.collectionName}: ${error.message}`);
    }
  }

  /**
   * Verifica qué documentos ya existen en la base de datos
   * @param {Array} documents - Array de documentos a verificar
   * @returns {Promise<Set>} Set de claves existentes
   */
  async checkExistingKeys(documents) {
    const keys = documents.map(doc => this.getUniqueKey(doc));
    const existingKeys = new Set();

    for (const key of keys) {
      try {
        const exists = await this.model.findOne(key);
        if (exists) {
          existingKeys.add(JSON.stringify(key));
        }
      } catch (error) {
        // Ignorar errores de verificación
      }
    }

    return existingKeys;
  }

  /**
   * Obtiene información sobre la colección
   * @returns {Promise<Object>} Información de la colección
   */
  async getCollectionInfo() {
    try {
      const count = await this.model.countDocuments();
      return {
        collectionName: this.collectionName,
        documentCount: count
      };
    } catch (error) {
      throw new Error(`Error getting collection info: ${error.message}`);
    }
  }
}

