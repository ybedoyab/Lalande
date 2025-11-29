import express from 'express';
import OpenAI from 'openai';
import ResourceMonitor from '../models/ResourceMonitor.js';
import CraterMaterial from '../models/CraterMaterial.js';
import Colonist from '../models/Colonist.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Inicializar OpenAI
// Nota: La API key debe estar en OPENAI_API_KEY en el archivo .env del backend
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * POST /api/ai-analysis/colony
 * Genera un análisis con IA del estado de la colonia y recomienda cráteres
 */
router.post('/colony', async (req, res) => {
  try {
    if (!openai.apiKey) {
      return res.status(400).json({
        success: false,
        error: 'OpenAI API key no configurada. Por favor, configura OPENAI_API_KEY en el archivo .env del backend.'
      });
    }

    // Obtener todos los datos de la colonia
    const [monitor, craters, colonists] = await Promise.all([
      ResourceMonitor.findOne({}).lean(),
      CraterMaterial.find({}).lean().limit(50),
      Colonist.find({}).lean().limit(50)
    ]);

    if (!monitor) {
      return res.status(404).json({
        success: false,
        error: 'Monitor de recursos no encontrado'
      });
    }

    // Preparar contexto para la IA
    const context = {
      colonia: {
        id: monitor.colonyId,
        estado: monitor.status,
        poblacion: {
          actual: monitor.population.current,
          maxima: monitor.population.max,
          tasaCrecimiento: monitor.population.growthRate
        },
        recursos: {
          agua: {
            actual: monitor.resources.water.current,
            maximo: monitor.resources.water.max,
            porcentaje: ((monitor.resources.water.current / monitor.resources.water.max) * 100).toFixed(1),
            consumoDiario: monitor.resources.water.consumptionRate,
            unidad: monitor.resources.water.unit
          },
          oxigeno: {
            actual: monitor.resources.oxygen.current,
            maximo: monitor.resources.oxygen.max,
            porcentaje: ((monitor.resources.oxygen.current / monitor.resources.oxygen.max) * 100).toFixed(1),
            consumoDiario: monitor.resources.oxygen.consumptionRate,
            unidad: monitor.resources.oxygen.unit
          },
          energia: {
            actual: monitor.resources.energy.current,
            maximo: monitor.resources.energy.max,
            porcentaje: ((monitor.resources.energy.current / monitor.resources.energy.max) * 100).toFixed(1),
            consumoDiario: monitor.resources.energy.consumptionRate,
            unidad: monitor.resources.energy.unit
          },
          alimentos: {
            actual: monitor.resources.food.current,
            maximo: monitor.resources.food.max,
            porcentaje: ((monitor.resources.food.current / monitor.resources.food.max) * 100).toFixed(1),
            consumoDiario: monitor.resources.food.consumptionRate,
            unidad: monitor.resources.food.unit
          },
          materialesConstruccion: {
            actual: monitor.resources.constructionMaterials.current,
            maximo: monitor.resources.constructionMaterials.max,
            porcentaje: ((monitor.resources.constructionMaterials.current / monitor.resources.constructionMaterials.max) * 100).toFixed(1),
            consumoDiario: monitor.resources.constructionMaterials.consumptionRate,
            unidad: monitor.resources.constructionMaterials.unit
          },
          materialesSoporteVital: {
            actual: monitor.resources.lifeSupportMaterials.current,
            maximo: monitor.resources.lifeSupportMaterials.max,
            porcentaje: ((monitor.resources.lifeSupportMaterials.current / monitor.resources.lifeSupportMaterials.max) * 100).toFixed(1),
            consumoDiario: monitor.resources.lifeSupportMaterials.consumptionRate,
            unidad: monitor.resources.lifeSupportMaterials.unit
          }
        },
        ultimaActualizacion: monitor.lastUpdate
      },
      crateres: craters.map(crater => ({
        id: crater.craterId,
        ubicacion: {
          latitud: crater.latitude,
          longitud: crater.longitude,
          coordenadas: `${crater.latitude >= 0 ? crater.latitude.toFixed(2) + '°N' : Math.abs(crater.latitude).toFixed(2) + '°S'}, ${crater.longitude >= 0 ? crater.longitude.toFixed(2) + '°E' : Math.abs(crater.longitude).toFixed(2) + '°W'}`
        },
        diametro: crater.diameter,
        estadoExploracion: crater.explorationStatus,
        prioridad: crater.explorationPriority,
        materiales: crater.materials.map(m => ({
          nombre: m.name,
          formula: m.formula,
          cantidadEstimada: m.estimatedQuantity,
          pureza: m.purity,
          usos: m.uses,
          descripcion: m.description
        })),
        ultimaExploracion: crater.lastExplored
      })),
      colonos: {
        total: colonists.length,
        activos: colonists.filter(c => c.status === 'active' || c.status === 'working').length,
        roles: colonists.reduce((acc, c) => {
          acc[c.role] = (acc[c.role] || 0) + 1;
          return acc;
        }, {})
      }
    };

    // Crear prompt para OpenAI
    const prompt = `Eres un experto en colonización marciana y análisis de recursos. Analiza el siguiente contexto de la colonia marciana y proporciona un análisis detallado en español.

CONTEXTO DE LA COLONIA:
${JSON.stringify(context, null, 2)}

Por favor, proporciona un análisis que incluya:

1. **Estado General de la Colonia**: Evalúa el estado actual de la colonia (${context.colonia.estado}) y los recursos disponibles.

2. **Análisis de Recursos Críticos**: Identifica qué recursos están en riesgo y cuáles están en buen estado. Menciona porcentajes y tiempos estimados de duración.

3. **Recomendación de Cráteres**: Basándote en los cráteres disponibles, recomienda cuál es el MÁS RECOMENDABLE para explorar o visitar, considerando:
   - Estado de exploración
   - Prioridad de exploración
   - Materiales disponibles
   - Ubicación y distancia
   - Recursos que la colonia necesita más

4. **Advertencias y Precauciones**: Menciona qué cosas hay que tener cuidado al visitar el cráter recomendado, incluyendo:
   - Condiciones ambientales
   - Riesgos de exploración
   - Recursos necesarios para la misión
   - Tiempo estimado de viaje/exploración

5. **Recomendaciones Estratégicas**: Proporciona recomendaciones generales para mejorar la sostenibilidad de la colonia.

Formatea tu respuesta de manera clara y estructurada, usando emojis cuando sea apropiado para hacer la lectura más amena.`;

    // Llamar a OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en colonización marciana, análisis de recursos planetarios y planificación de misiones de exploración. Proporcionas análisis detallados y recomendaciones prácticas en español.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const analysis = completion.choices[0]?.message?.content || 'No se pudo generar el análisis.';

    res.json({
      success: true,
      data: {
        analysis,
        context: {
          colonia: {
            estado: context.colonia.estado,
            poblacion: context.colonia.poblacion.actual,
            recursos: Object.keys(context.colonia.recursos).length
          },
          crateres: context.crateres.length,
          colonos: context.colonos.total
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error generating AI analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Error al generar análisis con IA',
      message: error.message
    });
  }
});

export default router;

