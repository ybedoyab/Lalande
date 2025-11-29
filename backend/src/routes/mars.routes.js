import express from 'express';
import LandingSite from '../models/LandingSite.js';
import REMSWeatherData from '../models/REMSWeatherData.js';

const router = express.Router();

/**
 * GET /api/mars/landing-sites
 * Obtiene todos los sitios de aterrizaje en Marte
 */
router.get('/landing-sites', async (req, res) => {
  try {
    const landingSites = await LandingSite.find({})
      .sort({ landingDate: 1 })
      .lean();
    
    res.json({
      success: true,
      count: landingSites.length,
      data: landingSites
    });
  } catch (error) {
    console.error('Error fetching landing sites:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching landing sites',
      message: error.message
    });
  }
});

/**
 * GET /api/mars/rems-weather
 * Obtiene datos de REMS con opciones de filtrado
 */
router.get('/rems-weather', async (req, res) => {
  try {
    const { 
      limit = 100, 
      skip = 0, 
      sort = '-solNumber',
      solNumber,
      startDate,
      endDate
    } = req.query;

    // Construir filtros
    const filter = {};
    
    if (solNumber) {
      filter.solNumber = parseInt(solNumber);
    }

    // Obtener datos
    const query = REMSWeatherData.find(filter)
      .sort(sort)
      .skip(parseInt(skip))
      .limit(Math.min(parseInt(limit), 1000)); // Máximo 1000 registros

    const [data, total] = await Promise.all([
      query.lean(),
      REMSWeatherData.countDocuments(filter)
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
    console.error('Error fetching REMS weather:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching REMS weather data',
      message: error.message
    });
  }
});

/**
 * GET /api/mars/rems-weather/latest
 * Obtiene el último registro de REMS
 */
router.get('/rems-weather/latest', async (req, res) => {
  try {
    const latest = await REMSWeatherData.findOne({})
      .sort({ solNumber: -1 })
      .lean();

    if (!latest) {
      return res.status(404).json({
        success: false,
        error: 'No REMS weather data found'
      });
    }

    res.json({
      success: true,
      data: latest
    });
  } catch (error) {
    console.error('Error fetching latest REMS weather:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching latest REMS weather',
      message: error.message
    });
  }
});

/**
 * GET /api/mars/stats
 * Obtiene estadísticas generales
 */
router.get('/stats', async (req, res) => {
  try {
    const [landingSitesCount, remsCount, latestREMS] = await Promise.all([
      LandingSite.countDocuments(),
      REMSWeatherData.countDocuments(),
      REMSWeatherData.findOne({}).sort({ solNumber: -1 }).lean()
    ]);

    res.json({
      success: true,
      data: {
        landingSites: {
          total: landingSitesCount
        },
        remsWeather: {
          total: remsCount,
          latestSol: latestREMS?.solNumber || null,
          latestDate: latestREMS?.earthDateTime || null
        }
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching stats',
      message: error.message
    });
  }
});

export default router;

