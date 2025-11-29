import express from 'express';
import ResourceUsage from '../models/ResourceUsage.js';

const router = express.Router();

/**
 * GET /api/resource-usage
 * Obtiene el historial de uso de recursos
 */
router.get('/', async (req, res) => {
  try {
    const { resourceType, colonistId, limit = 50, skip = 0 } = req.query;
    
    const filter = {};
    if (resourceType) filter.resourceType = resourceType;
    if (colonistId) filter.colonistId = colonistId;
    
    const [data, total] = await Promise.all([
      ResourceUsage.find(filter)
        .sort({ timestamp: -1 })
        .skip(parseInt(skip))
        .limit(Math.min(parseInt(limit), 1000))
        .lean(),
      ResourceUsage.countDocuments(filter)
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
    console.error('Error fetching resource usage:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching resource usage',
      message: error.message
    });
  }
});

/**
 * GET /api/resource-usage/last/:resourceType
 * Obtiene el último uso de un recurso específico
 */
router.get('/last/:resourceType', async (req, res) => {
  try {
    const { resourceType } = req.params;
    
    const lastUsage = await ResourceUsage.getLastUsage(resourceType);
    
    if (!lastUsage) {
      return res.status(404).json({
        success: false,
        error: 'No usage found for this resource type'
      });
    }
    
    res.json({
      success: true,
      data: lastUsage
    });
  } catch (error) {
    console.error('Error fetching last resource usage:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching last resource usage',
      message: error.message
    });
  }
});

/**
 * GET /api/resource-usage/recent/:resourceType
 * Obtiene los usos recientes de un recurso
 */
router.get('/recent/:resourceType', async (req, res) => {
  try {
    const { resourceType } = req.params;
    const { limit = 10 } = req.query;
    
    const recentUsage = await ResourceUsage.getRecentUsage(resourceType, parseInt(limit));
    
    res.json({
      success: true,
      count: recentUsage.length,
      data: recentUsage
    });
  } catch (error) {
    console.error('Error fetching recent resource usage:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching recent resource usage',
      message: error.message
    });
  }
});

export default router;

