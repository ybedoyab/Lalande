/**
 * Materials Project Routes
 * Proxy routes for Materials Project API via Python microservice
 */

import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
// Materials Project Python microservice URL
// Use 127.0.0.1 instead of localhost to avoid IPv6 issues on Windows
const MATERIALS_SERVICE_URL = process.env.MATERIALS_SERVICE_URL || 'http://127.0.0.1:8001';

/**
 * Helper function to fetch from Python microservice
 */
async function fetchFromMicroservice(url, timeout = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorData.detail || errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (fetchError) {
    clearTimeout(timeoutId);
    if (fetchError.name === 'AbortError') {
      throw new Error('Request timeout: Materials service took too long to respond');
    }
    throw fetchError;
  }
}

/**
 * GET /api/materials/:materialId
 * Get material summary by material ID
 */
router.get('/:materialId', async (req, res) => {
  try {
    const { materialId } = req.params;

    if (!materialId) {
      return res.status(400).json({
        error: 'Material ID is required'
      });
    }

    // Validate material ID format (should start with mp-)
    if (!materialId.startsWith('mp-')) {
      return res.status(400).json({
        error: 'Invalid material ID format. Material IDs should start with "mp-"'
      });
    }

    // Call Python microservice
    const url = `${MATERIALS_SERVICE_URL}/materials/${materialId}`;
    
    console.log(`Fetching material ${materialId} from Python microservice`);
    console.log(`Materials Service URL: ${MATERIALS_SERVICE_URL}`);
    console.log(`Full URL: ${url}`);

    // Use helper function
    const data = await fetchFromMicroservice(url);
    return res.json(data);

  } catch (error) {
    console.error('Error fetching material:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Materials Service URL configured:', MATERIALS_SERVICE_URL);
    
    // Check if it's a connection error
    if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
      return res.status(503).json({
        error: 'Materials service unavailable',
        message: `Cannot connect to Materials Project microservice at ${MATERIALS_SERVICE_URL}`,
        details: error.message,
        hint: 'Make sure the microservice is running. Start it with: cd materials-service && python app.py'
      });
    }
    
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      materialsServiceUrl: MATERIALS_SERVICE_URL
    });
  }
});

/**
 * GET /api/materials/search/formula/:formula
 * Search materials by formula
 */
router.get('/search/formula/:formula', async (req, res) => {
  try {
    const { formula } = req.params;

    if (!formula) {
      return res.status(400).json({
        error: 'Formula is required'
      });
    }

    // Call Python microservice
    const url = `${MATERIALS_SERVICE_URL}/materials/search/formula/${encodeURIComponent(formula)}`;
    
    console.log(`Searching materials by formula: ${formula}`);
    console.log(`URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      return res.status(response.status).json({
        error: 'Materials service error',
        status: response.status,
        details: errorData.detail || errorData
      });
    }

    const data = await response.json();
    return res.json(data);

  } catch (error) {
    console.error('Error searching materials:', error);
    
    // Check if it's a connection error
    if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
      return res.status(503).json({
        error: 'Materials service unavailable',
        message: 'The Materials Project microservice is not running. Please start it with: cd materials-service && python app.py',
        details: error.message
      });
    }
    
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/materials/:materialId/bandstructure
 * Get band structure for a material
 */
router.get('/:materialId/bandstructure', async (req, res) => {
  try {
    const { materialId } = req.params;
    if (!materialId?.startsWith('mp-')) {
      return res.status(400).json({ error: 'Invalid material ID format' });
    }

    const url = `${MATERIALS_SERVICE_URL}/materials/${materialId}/bandstructure`;
    const data = await fetchFromMicroservice(url);
    return res.json(data);
  } catch (error) {
    return handleError(res, error, MATERIALS_SERVICE_URL);
  }
});

/**
 * GET /api/materials/:materialId/magnetism
 * Get magnetic properties for a material
 */
router.get('/:materialId/magnetism', async (req, res) => {
  try {
    const { materialId } = req.params;
    if (!materialId?.startsWith('mp-')) {
      return res.status(400).json({ error: 'Invalid material ID format' });
    }

    const url = `${MATERIALS_SERVICE_URL}/materials/${materialId}/magnetism`;
    const data = await fetchFromMicroservice(url);
    return res.json(data);
  } catch (error) {
    return handleError(res, error, MATERIALS_SERVICE_URL);
  }
});

/**
 * GET /api/materials/:materialId/elasticity
 * Get elastic constants for a material
 */
router.get('/:materialId/elasticity', async (req, res) => {
  try {
    const { materialId } = req.params;
    if (!materialId?.startsWith('mp-')) {
      return res.status(400).json({ error: 'Invalid material ID format' });
    }

    const url = `${MATERIALS_SERVICE_URL}/materials/${materialId}/elasticity`;
    const data = await fetchFromMicroservice(url);
    return res.json(data);
  } catch (error) {
    return handleError(res, error, MATERIALS_SERVICE_URL);
  }
});

/**
 * GET /api/materials/:materialId/eos
 * Get equation of state for a material
 */
router.get('/:materialId/eos', async (req, res) => {
  try {
    const { materialId } = req.params;
    if (!materialId?.startsWith('mp-')) {
      return res.status(400).json({ error: 'Invalid material ID format' });
    }

    const url = `${MATERIALS_SERVICE_URL}/materials/${materialId}/eos`;
    const data = await fetchFromMicroservice(url);
    return res.json(data);
  } catch (error) {
    return handleError(res, error, MATERIALS_SERVICE_URL);
  }
});

/**
 * GET /api/materials/:materialId/xas
 * Get X-ray Absorption Spectra for a material
 */
router.get('/:materialId/xas', async (req, res) => {
  try {
    const { materialId } = req.params;
    if (!materialId?.startsWith('mp-')) {
      return res.status(400).json({ error: 'Invalid material ID format' });
    }

    const url = `${MATERIALS_SERVICE_URL}/materials/${materialId}/xas`;
    const data = await fetchFromMicroservice(url);
    return res.json(data);
  } catch (error) {
    return handleError(res, error, MATERIALS_SERVICE_URL);
  }
});

/**
 * GET /api/materials/:materialId/surface-properties
 * Get surface energies for a material
 */
router.get('/:materialId/surface-properties', async (req, res) => {
  try {
    const { materialId } = req.params;
    if (!materialId?.startsWith('mp-')) {
      return res.status(400).json({ error: 'Invalid material ID format' });
    }

    const url = `${MATERIALS_SERVICE_URL}/materials/${materialId}/surface-properties`;
    const data = await fetchFromMicroservice(url);
    return res.json(data);
  } catch (error) {
    return handleError(res, error, MATERIALS_SERVICE_URL);
  }
});

/**
 * GET /api/materials/:materialId/similarity
 * Get similar materials
 */
router.get('/:materialId/similarity', async (req, res) => {
  try {
    const { materialId } = req.params;
    const { limit = 10 } = req.query;
    
    if (!materialId?.startsWith('mp-')) {
      return res.status(400).json({ error: 'Invalid material ID format' });
    }

    const url = `${MATERIALS_SERVICE_URL}/materials/${materialId}/similarity?limit=${limit}`;
    const data = await fetchFromMicroservice(url);
    return res.json(data);
  } catch (error) {
    return handleError(res, error, MATERIALS_SERVICE_URL);
  }
});

/**
 * GET /api/materials/:materialId/grain-boundaries
 * Get grain boundary data for a material
 */
router.get('/:materialId/grain-boundaries', async (req, res) => {
  try {
    const { materialId } = req.params;
    if (!materialId?.startsWith('mp-')) {
      return res.status(400).json({ error: 'Invalid material ID format' });
    }

    const url = `${MATERIALS_SERVICE_URL}/materials/${materialId}/grain-boundaries`;
    const data = await fetchFromMicroservice(url);
    return res.json(data);
  } catch (error) {
    return handleError(res, error, MATERIALS_SERVICE_URL);
  }
});

/**
 * GET /api/materials/:materialId/substrates
 * Get suggested substrates for a material
 */
router.get('/:materialId/substrates', async (req, res) => {
  try {
    const { materialId } = req.params;
    if (!materialId?.startsWith('mp-')) {
      return res.status(400).json({ error: 'Invalid material ID format' });
    }

    const url = `${MATERIALS_SERVICE_URL}/materials/${materialId}/substrates`;
    const data = await fetchFromMicroservice(url);
    return res.json(data);
  } catch (error) {
    return handleError(res, error, MATERIALS_SERVICE_URL);
  }
});

/**
 * GET /api/materials/:materialId/alloys
 * Get alloy systems for a material
 */
router.get('/:materialId/alloys', async (req, res) => {
  try {
    const { materialId } = req.params;
    if (!materialId?.startsWith('mp-')) {
      return res.status(400).json({ error: 'Invalid material ID format' });
    }

    const url = `${MATERIALS_SERVICE_URL}/materials/${materialId}/alloys`;
    const data = await fetchFromMicroservice(url);
    return res.json(data);
  } catch (error) {
    return handleError(res, error, MATERIALS_SERVICE_URL);
  }
});

/**
 * Error handler helper
 */
function handleError(res, error, serviceUrl) {
  console.error('Error:', error.message);
  
  if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
    return res.status(503).json({
      error: 'Materials service unavailable',
      message: `Cannot connect to Materials Project microservice at ${serviceUrl}`,
      details: error.message,
      hint: 'Make sure the microservice is running. Start it with: cd materials-service && python app.py'
    });
  }
  
  if (error.message.includes('404') || error.message.includes('not found')) {
    return res.status(404).json({
      error: 'Not found',
      message: error.message
    });
  }
  
  return res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
}

export default router;

