import express from 'express';
import Colonist from '../models/Colonist.js';
import ResourceUsage from '../models/ResourceUsage.js';

const router = express.Router();

/**
 * GET /api/colonists
 * Obtiene todos los colonos
 */
router.get('/', async (req, res) => {
  try {
    const { status, role, limit = 100, skip = 0 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (role) filter.role = role;
    
    const [data, total] = await Promise.all([
      Colonist.find(filter)
        .sort({ lastActivity: -1 })
        .skip(parseInt(skip))
        .limit(Math.min(parseInt(limit), 1000))
        .lean(),
      Colonist.countDocuments(filter)
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
    console.error('Error fetching colonists:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching colonists',
      message: error.message
    });
  }
});

/**
 * GET /api/colonists/:colonistId
 * Obtiene un colono específico
 */
router.get('/:colonistId', async (req, res) => {
  try {
    const { colonistId } = req.params;
    
    const colonist = await Colonist.findOne({ colonistId }).lean();
    
    if (!colonist) {
      return res.status(404).json({
        success: false,
        error: 'Colonist not found'
      });
    }
    
    res.json({
      success: true,
      data: colonist
    });
  } catch (error) {
    console.error('Error fetching colonist:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching colonist',
      message: error.message
    });
  }
});

/**
 * GET /api/colonists/stats/summary
 * Obtiene estadísticas de colonos
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const [total, active, byRole, byStatus] = await Promise.all([
      Colonist.countDocuments(),
      Colonist.countDocuments({ status: 'active' }),
      Colonist.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Colonist.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);
    
    res.json({
      success: true,
      data: {
        total,
        active,
        byRole,
        byStatus
      }
    });
  } catch (error) {
    console.error('Error fetching colonist stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching colonist stats',
      message: error.message
    });
  }
});

export default router;

