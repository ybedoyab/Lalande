import express from 'express';
import CraterMaterial from '../models/CraterMaterial.js';

const router = express.Router();

/**
 * GET /api/crater-materials
 * Obtiene todos los materiales de cráteres con opciones de filtrado
 */
router.get('/', async (req, res) => {
  try {
    const { 
      limit = 100, 
      skip = 0,
      explorationStatus,
      minPriority,
      hasMaterials
    } = req.query;
    
    const filter = {};
    
    if (explorationStatus) {
      filter.explorationStatus = explorationStatus;
    }
    
    if (minPriority) {
      filter.explorationPriority = { $gte: parseInt(minPriority) };
    }
    
    if (hasMaterials === 'true') {
      filter['materials.0'] = { $exists: true };
    }
    
    const [data, total] = await Promise.all([
      CraterMaterial.find(filter)
        .sort({ explorationPriority: -1, lastExplored: -1 })
        .skip(parseInt(skip))
        .limit(Math.min(parseInt(limit), 1000))
        .lean(),
      CraterMaterial.countDocuments(filter)
    ]);
    
    res.json({
      success: true,
      count: data.length,
      total,
      skip: parseInt(skip),
      limit: parseInt(limit),
      data
    });
  } catch (error) {
    console.error('Error fetching crater materials:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching crater materials',
      message: error.message
    });
  }
});

/**
 * GET /api/crater-materials/:craterId
 * Obtiene materiales de un cráter específico
 */
router.get('/:craterId', async (req, res) => {
  try {
    const { craterId } = req.params;
    
    const craterMaterial = await CraterMaterial.findOne({ craterId }).lean();
    
    if (!craterMaterial) {
      return res.status(404).json({
        success: false,
        error: 'Crater material not found'
      });
    }
    
    res.json({
      success: true,
      data: craterMaterial
    });
  } catch (error) {
    console.error('Error fetching crater material:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching crater material',
      message: error.message
    });
  }
});

/**
 * GET /api/crater-materials/near/:lat/:lon
 * Obtiene materiales de cráteres cercanos a una ubicación
 */
router.get('/near/:lat/:lon', async (req, res) => {
  try {
    const { lat, lon } = req.params;
    const { maxDistance = 1000 } = req.query; // km
    
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    const maxDistanceNum = parseFloat(maxDistance) * 1000; // convertir a metros
    
    if (isNaN(latNum) || isNaN(lonNum)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid latitude or longitude'
      });
    }
    
    const craters = await CraterMaterial.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lonNum, latNum]
          },
          $maxDistance: maxDistanceNum
        }
      }
    })
    .limit(50)
    .lean();
    
    res.json({
      success: true,
      count: craters.length,
      data: craters
    });
  } catch (error) {
    console.error('Error fetching nearby crater materials:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching nearby crater materials',
      message: error.message
    });
  }
});

/**
 * POST /api/crater-materials
 * Crea o actualiza materiales de un cráter
 */
router.post('/', async (req, res) => {
  try {
    const { craterId, materials, ...craterData } = req.body;
    
    if (!craterId) {
      return res.status(400).json({
        success: false,
        error: 'craterId is required'
      });
    }
    
    let craterMaterial = await CraterMaterial.findOne({ craterId });
    
    if (craterMaterial) {
      // Actualizar existente
      if (materials && Array.isArray(materials)) {
        materials.forEach(material => {
          craterMaterial.addMaterial(material);
        });
      }
      Object.assign(craterMaterial, craterData);
    } else {
      // Crear nuevo
      craterMaterial = new CraterMaterial({
        craterId,
        materials: materials || [],
        ...craterData
      });
    }
    
    await craterMaterial.save();
    
    res.json({
      success: true,
      message: 'Crater material saved',
      data: craterMaterial
    });
  } catch (error) {
    console.error('Error saving crater material:', error);
    res.status(500).json({
      success: false,
      error: 'Error saving crater material',
      message: error.message
    });
  }
});

/**
 * GET /api/crater-materials/stats
 * Obtiene estadísticas de materiales en cráteres
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const [
      totalCraters,
      exploredCraters,
      cratersWithMaterials,
      totalMaterials,
      materialTypes
    ] = await Promise.all([
      CraterMaterial.countDocuments(),
      CraterMaterial.countDocuments({ explorationStatus: { $ne: 'unexplored' } }),
      CraterMaterial.countDocuments({ 'materials.0': { $exists: true } }),
      CraterMaterial.aggregate([
        { $unwind: '$materials' },
        { $count: 'total' }
      ]),
      CraterMaterial.aggregate([
        { $unwind: '$materials' },
        { $group: { _id: '$materials.materialId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);
    
    res.json({
      success: true,
      data: {
        totalCraters,
        exploredCraters,
        cratersWithMaterials,
        totalMaterials: totalMaterials[0]?.total || 0,
        topMaterials: materialTypes
      }
    });
  } catch (error) {
    console.error('Error fetching crater materials stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching crater materials stats',
      message: error.message
    });
  }
});

export default router;

