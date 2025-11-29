import express from 'express';
import ResourceMonitor from '../models/ResourceMonitor.js';
import Colonist from '../models/Colonist.js';
import ResourceUsage from '../models/ResourceUsage.js';

const router = express.Router();

/**
 * GET /api/resources
 * Obtiene el estado actual del monitor de recursos
 */
router.get('/', async (req, res) => {
  try {
    let monitor = await ResourceMonitor.findOne({});
    
    // Si no existe, crear uno con valores iniciales
    if (!monitor) {
      monitor = new ResourceMonitor({
        resources: {
          water: { current: 8000, max: 10000, unit: 'liters', consumptionRate: 50 },
          oxygen: { current: 4000, max: 5000, unit: 'kg', consumptionRate: 25 },
          energy: { current: 8000, max: 10000, unit: 'kWh', consumptionRate: 200 },
          food: { current: 1500, max: 2000, unit: 'kg', consumptionRate: 10 },
          constructionMaterials: { current: 40000, max: 50000, unit: 'kg', consumptionRate: 100 },
          lifeSupportMaterials: { current: 8000, max: 10000, unit: 'kg', consumptionRate: 5 }
        },
        population: { current: 10, max: 100, growthRate: 0.01 }
      });
      await monitor.save();
    } else {
      // Calcular simulación sin modificar BD constantemente
      // Solo actualizar BD cada cierto tiempo (cada 30 segundos)
      const now = new Date();
      const lastUpdate = monitor.lastUpdate || monitor.createdAt;
      const timeSinceLastUpdate = (now - lastUpdate) / 1000; // segundos
      
      // Calcular valores simulados en memoria
      const simulatedMonitor = JSON.parse(JSON.stringify(monitor.toObject()));
      
      // Simular consumo solo si han pasado al menos 5 segundos desde última actualización
      if (timeSinceLastUpdate >= 5) {
        await simulateResourceConsumption(simulatedMonitor);
        
        // Calcular estado manualmente
        const safePercent = (current, max) => {
          if (!max || max === 0) return 0;
          if (!current || isNaN(current) || isNaN(max) || current < 0) return 0;
          return (current / max) * 100;
        };
        
        const waterPercent = safePercent(simulatedMonitor.resources.water?.current, simulatedMonitor.resources.water?.max);
        const oxygenPercent = safePercent(simulatedMonitor.resources.oxygen?.current, simulatedMonitor.resources.oxygen?.max);
        const energyPercent = safePercent(simulatedMonitor.resources.energy?.current, simulatedMonitor.resources.energy?.max);
        const foodPercent = safePercent(simulatedMonitor.resources.food?.current, simulatedMonitor.resources.food?.max);
        const minPercent = Math.min(waterPercent, oxygenPercent, energyPercent, foodPercent);
        
        // Si algún recurso crítico está en 0, es emergencia
        const criticalResourcesEmpty = (
          (!simulatedMonitor.resources.water?.current || simulatedMonitor.resources.water.current <= 0) ||
          (!simulatedMonitor.resources.oxygen?.current || simulatedMonitor.resources.oxygen.current <= 0) ||
          (!simulatedMonitor.resources.energy?.current || simulatedMonitor.resources.energy.current <= 0) ||
          (!simulatedMonitor.resources.food?.current || simulatedMonitor.resources.food.current <= 0)
        );
        
        if (criticalResourcesEmpty || minPercent <= 0) {
          simulatedMonitor.status = 'emergency';
        } else if (minPercent < 10) {
          simulatedMonitor.status = 'emergency';
        } else if (minPercent < 25) {
          simulatedMonitor.status = 'critical';
        } else if (minPercent < 50) {
          simulatedMonitor.status = 'warning';
        } else {
          simulatedMonitor.status = 'healthy';
        }
        
        // Solo guardar en BD cada 30 segundos para evitar conflictos de versión
        if (timeSinceLastUpdate >= 30) {
          // Validar y limpiar valores antes de guardar
          const safeNumber = (val) => {
            const num = Number(val);
            return isNaN(num) || !isFinite(num) ? 0 : num;
          };
          
          const waterCurrent = safeNumber(simulatedMonitor.resources.water?.current);
          const oxygenCurrent = safeNumber(simulatedMonitor.resources.oxygen?.current);
          const foodCurrent = safeNumber(simulatedMonitor.resources.food?.current);
          const energyCurrent = safeNumber(simulatedMonitor.resources.energy?.current);
          const constructionCurrent = safeNumber(simulatedMonitor.resources.constructionMaterials?.current);
          const lifeSupportCurrent = safeNumber(simulatedMonitor.resources.lifeSupportMaterials?.current);
          const populationCurrent = safeNumber(simulatedMonitor.population?.current);
          
          await ResourceMonitor.findOneAndUpdate(
            { _id: monitor._id },
            {
              $set: {
                'resources.water.current': waterCurrent,
                'resources.oxygen.current': oxygenCurrent,
                'resources.food.current': foodCurrent,
                'resources.energy.current': energyCurrent,
                'resources.constructionMaterials.current': constructionCurrent,
                'resources.lifeSupportMaterials.current': lifeSupportCurrent,
                'population.current': populationCurrent,
                status: simulatedMonitor.status || 'healthy',
                lastUpdate: now
              },
              $push: {
                history: {
                  $each: [{
                    timestamp: now,
                    resources: {
                      water: waterCurrent,
                      oxygen: oxygenCurrent,
                      energy: energyCurrent,
                      food: foodCurrent,
                      constructionMaterials: constructionCurrent,
                      lifeSupportMaterials: lifeSupportCurrent
                    },
                    population: populationCurrent,
                    status: simulatedMonitor.status || 'healthy'
                  }],
                  $slice: -100
                }
              }
            },
            { new: true }
          );
        }
        
        // Retornar valores simulados con estado actualizado
        return res.json({
          success: true,
          data: simulatedMonitor
        });
      } else {
        // Aunque no se simule, calcular el estado basado en valores actuales
        const safePercent = (current, max) => {
          if (!max || max === 0) return 0;
          if (!current || isNaN(current) || isNaN(max) || current < 0) return 0;
          return (current / max) * 100;
        };
        
        const waterPercent = safePercent(monitor.resources.water?.current, monitor.resources.water?.max);
        const oxygenPercent = safePercent(monitor.resources.oxygen?.current, monitor.resources.oxygen?.max);
        const energyPercent = safePercent(monitor.resources.energy?.current, monitor.resources.energy?.max);
        const foodPercent = safePercent(monitor.resources.food?.current, monitor.resources.food?.max);
        const minPercent = Math.min(waterPercent, oxygenPercent, energyPercent, foodPercent);
        
        // Actualizar estado si es diferente del actual
        let currentStatus = monitor.status || 'healthy';
        if (minPercent < 10) {
          currentStatus = 'emergency';
        } else if (minPercent < 25) {
          currentStatus = 'critical';
        } else if (minPercent < 50) {
          currentStatus = 'warning';
        } else {
          currentStatus = 'healthy';
        }
        
        // Si el estado cambió, actualizar el objeto monitor antes de retornarlo
        if (currentStatus !== monitor.status) {
          monitor.status = currentStatus;
        }
      }
    }
    
    res.json({
      success: true,
      data: monitor
    });
  } catch (error) {
    console.error('Error fetching resource monitor:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching resource monitor',
      message: error.message
    });
  }
});

/**
 * POST /api/resources/add
 * Agrega recursos a la colonia
 */
router.post('/add', async (req, res) => {
  try {
    const { resourceType, amount } = req.body;
    
    if (!resourceType || amount === undefined) {
      return res.status(400).json({
        success: false,
        error: 'resourceType and amount are required'
      });
    }
    
    let monitor = await ResourceMonitor.findOne({});
    
    if (!monitor) {
      monitor = new ResourceMonitor();
      await monitor.save();
    }
    
    // Usar findOneAndUpdate para evitar conflictos de versión
    const updated = await ResourceMonitor.findOneAndUpdate(
      { _id: monitor._id },
      {
        $inc: {
          [`resources.${resourceType}.current`]: amount
        },
        $set: {
          lastUpdate: new Date()
        }
      },
      { new: true }
    );
    
    // Asegurar que no exceda el máximo
    if (updated.resources[resourceType].current > updated.resources[resourceType].max) {
      await ResourceMonitor.findOneAndUpdate(
        { _id: monitor._id },
        {
          $set: {
            [`resources.${resourceType}.current`]: updated.resources[resourceType].max
          }
        }
      );
      updated.resources[resourceType].current = updated.resources[resourceType].max;
    }
    
    res.json({
      success: true,
      message: `Added ${amount} ${resourceType}`,
      newAmount: updated.resources[resourceType].current,
      data: updated
    });
  } catch (error) {
    console.error('Error adding resources:', error);
    res.status(500).json({
      success: false,
      error: 'Error adding resources',
      message: error.message
    });
  }
});

/**
 * POST /api/resources/request
 * Solicita recursos y los agrega automáticamente
 */
router.post('/request', async (req, res) => {
  try {
    let monitor = await ResourceMonitor.findOne({});
    
    if (!monitor) {
      return res.status(404).json({
        success: false,
        error: 'Resource monitor not found'
      });
    }
    
    // Calcular cuánto falta de cada recurso
    const resourcesToAdd = {};
    
    Object.entries(monitor.resources).forEach(([key, resource]) => {
      const percentage = (resource.current / resource.max) * 100;
      if (percentage < 50) {
        // Agregar hasta el 80% de capacidad
        const target = resource.max * 0.8;
        const needed = Math.max(0, target - resource.current);
        resourcesToAdd[key] = Math.round(needed);
      }
    });
    
    // Actualizar recursos
    const updateFields = {
      $set: {
        lastUpdate: new Date()
      }
    };
    
    Object.entries(resourcesToAdd).forEach(([key, amount]) => {
      updateFields.$inc = updateFields.$inc || {};
      updateFields.$inc[`resources.${key}.current`] = amount;
    });
    
    if (Object.keys(resourcesToAdd).length > 0) {
      const updated = await ResourceMonitor.findOneAndUpdate(
        { _id: monitor._id },
        updateFields,
        { new: true }
      );
      
      // Asegurar que no excedan los máximos
      Object.entries(updated.resources).forEach(([key, resource]) => {
        if (resource.current > resource.max) {
          resource.current = resource.max;
        }
      });
      
      await ResourceMonitor.findOneAndUpdate(
        { _id: monitor._id },
        {
          $set: {
            'resources.water.current': updated.resources.water.current,
            'resources.oxygen.current': updated.resources.oxygen.current,
            'resources.food.current': updated.resources.food.current,
            'resources.energy.current': updated.resources.energy.current,
            'resources.constructionMaterials.current': updated.resources.constructionMaterials.current,
            'resources.lifeSupportMaterials.current': updated.resources.lifeSupportMaterials.current
          }
        }
      );
      
      res.json({
        success: true,
        message: 'Recursos solicitados y agregados exitosamente',
        resourcesAdded: resourcesToAdd,
        data: updated
      });
    } else {
      res.json({
        success: true,
        message: 'Todos los recursos están en niveles adecuados',
        resourcesAdded: {},
        data: monitor
      });
    }
  } catch (error) {
    console.error('Error requesting resources:', error);
    res.status(500).json({
      success: false,
      error: 'Error requesting resources',
      message: error.message
    });
  }
});

/**
 * GET /api/resources/history
 * Obtiene el historial de recursos
 */
router.get('/history', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    
    const monitor = await ResourceMonitor.findOne({});
    
    if (!monitor) {
      return res.status(404).json({
        success: false,
        error: 'Resource monitor not found'
      });
    }
    
    const history = monitor.history
      .slice(-parseInt(limit))
      .sort((a, b) => b.timestamp - a.timestamp);
    
    res.json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    console.error('Error fetching resource history:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching resource history',
      message: error.message
    });
  }
});

/**
 * POST /api/resources/reset
 * Reinicia el monitor de recursos (útil para testing)
 */
router.post('/reset', async (req, res) => {
  try {
    await ResourceMonitor.deleteMany({});
    
    const monitor = new ResourceMonitor({
      resources: {
        water: { current: 8000, max: 10000, unit: 'liters', consumptionRate: 50 },
        oxygen: { current: 4000, max: 5000, unit: 'kg', consumptionRate: 25 },
        energy: { current: 8000, max: 10000, unit: 'kWh', consumptionRate: 200 },
        food: { current: 1500, max: 2000, unit: 'kg', consumptionRate: 10 },
        constructionMaterials: { current: 40000, max: 50000, unit: 'kg', consumptionRate: 100 },
        lifeSupportMaterials: { current: 8000, max: 10000, unit: 'kg', consumptionRate: 5 }
      },
      population: { current: 10, max: 100, growthRate: 0.01 }
    });
    
    await monitor.save();
    
    res.json({
      success: true,
      message: 'Resource monitor reset',
      data: monitor
    });
  } catch (error) {
    console.error('Error resetting resource monitor:', error);
    res.status(500).json({
      success: false,
      error: 'Error resetting resource monitor',
      message: error.message
    });
  }
});

/**
 * Simula el consumo de recursos por los colonos
 */
async function simulateResourceConsumption(monitor) {
  try {
    // Helper para obtener valores seguros
    const safeGet = (obj, path, defaultValue = 0) => {
      const val = obj?.[path]?.current;
      return (typeof val === 'number' && !isNaN(val)) ? val : defaultValue;
    };
    
    let colonists = await Colonist.find({ status: { $in: ['active', 'working'] } });
    
    // Si no hay colonos, simular con valores por defecto basados en la población
    if (colonists.length === 0) {
      const defaultPopulation = monitor.population?.current || 25;
      const defaultConsumptionPerPerson = {
        water: 5,
        oxygen: 0.8,
        food: 1.5,
        energy: 10
      };
      
      // Calcular tiempo transcurrido desde última actualización
      const now = new Date();
      const lastUpdate = monitor.lastUpdate || monitor.createdAt;
      const timeDiff = now - lastUpdate;
      const hoursElapsed = timeDiff / (1000 * 60 * 60);
      const simulationFactor = 3600;
      let simulatedDays = (hoursElapsed * simulationFactor) / 24;
      
      // Limitar la simulación a máximo 1 día para evitar que los recursos se agoten demasiado rápido
      simulatedDays = Math.min(simulatedDays, 1.0);
      
      if (simulatedDays < 0.0001) return;
      
      const totalConsumption = {
        water: defaultConsumptionPerPerson.water * defaultPopulation * simulatedDays,
        oxygen: defaultConsumptionPerPerson.oxygen * defaultPopulation * simulatedDays,
        food: defaultConsumptionPerPerson.food * defaultPopulation * simulatedDays,
        energy: defaultConsumptionPerPerson.energy * defaultPopulation * simulatedDays
      };
      
      // Asegurar que los valores existan antes de hacer operaciones
      // Usar los valores actuales del monitor, no safeGet que podría devolver 0
      const currentWater = monitor.resources?.water?.current ?? 0;
      const currentOxygen = monitor.resources?.oxygen?.current ?? 0;
      const currentFood = monitor.resources?.food?.current ?? 0;
      const currentEnergy = monitor.resources?.energy?.current ?? 0;
      
      monitor.resources.water.current = Math.max(0, currentWater - totalConsumption.water);
      monitor.resources.oxygen.current = Math.max(0, currentOxygen - totalConsumption.oxygen);
      monitor.resources.food.current = Math.max(0, currentFood - totalConsumption.food);
      monitor.resources.energy.current = Math.max(0, currentEnergy - totalConsumption.energy);
      
      return;
    }
    
    // Calcular tiempo transcurrido desde última actualización (en horas para simulación más rápida)
    const now = new Date();
    const lastUpdate = monitor.lastUpdate || monitor.createdAt;
    const timeDiff = now - lastUpdate;
    const hoursElapsed = timeDiff / (1000 * 60 * 60); // Convertir a horas
    
    // Para simulación en tiempo real, usar un factor de aceleración más rápido
    // 1 segundo real = ~1 hora simulada (factor de 3600)
    const simulationFactor = 3600; // Mucho más rápido para ver cambios constantes
    let simulatedDays = (hoursElapsed * simulationFactor) / 24;
    
    // Limitar la simulación a máximo 1 día para evitar que los recursos se agoten demasiado rápido
    simulatedDays = Math.min(simulatedDays, 1.0);
    
    if (simulatedDays < 0.0001) return; // Umbral más bajo para actualizaciones más frecuentes
    
    // Calcular consumo total de todos los colonos
    let totalConsumption = {
      water: 0,
      oxygen: 0,
      food: 0,
      energy: 0
    };
    
    // Seleccionar algunos colonos aleatorios para registrar actividades
    const activeColonists = colonists.filter(c => c.status === 'active' || c.status === 'working');
    const numToRecord = Math.min(8, activeColonists.length); // Registrar hasta 8 colonos para más actividad
    const colonistsToRecord = activeColonists
      .sort(() => 0.5 - Math.random())
      .slice(0, numToRecord);
    
    // Procesar colonos en paralelo pero guardar secuencialmente para evitar conflictos de versión
    const colonistUpdates = [];
    
    for (const colonist of colonists) {
      const consumed = colonist.consumeResources(simulatedDays);
      
      totalConsumption.water += consumed.water;
      totalConsumption.oxygen += consumed.oxygen;
      totalConsumption.food += consumed.food;
      totalConsumption.energy += consumed.energy;
      
      // Registrar uso de recursos (con cantidades reales)
      const shouldRecord = colonistsToRecord.some(c => c.colonistId === colonist.colonistId);
      
      if (shouldRecord && consumed.water > 0.01) {
        await ResourceUsage.create({
          resourceType: 'water',
          amount: Math.round(consumed.water * 100) / 100,
          colonistId: colonist.colonistId,
          colonistName: colonist.name,
          colonistRole: colonist.role,
          reason: colonist.role === 'farmer' ? 'Riego de cultivos' : 
                  colonist.role === 'miner' ? 'Hidratación durante trabajo' :
                  'Consumo diario',
          location: colonist.role === 'farmer' ? 'Invernadero' : 
                   colonist.role === 'miner' ? 'Mina' : 'Colonia'
        });
      }
      
      if (shouldRecord && consumed.food > 0.01) {
        await ResourceUsage.create({
          resourceType: 'food',
          amount: Math.round(consumed.food * 100) / 100,
          colonistId: colonist.colonistId,
          colonistName: colonist.name,
          colonistRole: colonist.role,
          reason: 'Comida diaria',
          location: 'Comedor'
        });
      }
      
      if (shouldRecord && consumed.oxygen > 0.01) {
        await ResourceUsage.create({
          resourceType: 'oxygen',
          amount: Math.round(consumed.oxygen * 100) / 100,
          colonistId: colonist.colonistId,
          colonistName: colonist.name,
          colonistRole: colonist.role,
          reason: 'Respiración',
          location: 'Colonia'
        });
      }
      
      if (shouldRecord && consumed.energy > 0.01) {
        await ResourceUsage.create({
          resourceType: 'energy',
          amount: Math.round(consumed.energy * 100) / 100,
          colonistId: colonist.colonistId,
          colonistName: colonist.name,
          colonistRole: colonist.role,
          reason: colonist.role === 'engineer' ? 'Operación de maquinaria' :
                  colonist.role === 'scientist' ? 'Experimentos de laboratorio' :
                  colonist.role === 'technician' ? 'Mantenimiento de sistemas' :
                  'Uso general',
          location: colonist.role === 'engineer' ? 'Taller' :
                   colonist.role === 'scientist' ? 'Laboratorio' :
                   colonist.role === 'technician' ? 'Sala de control' : 'Colonia'
        });
      }
    }
    
    // Aplicar consumo a los recursos
    // Usar los valores actuales del monitor directamente
    const currentWater = monitor.resources?.water?.current ?? 0;
    const currentOxygen = monitor.resources?.oxygen?.current ?? 0;
    const currentFood = monitor.resources?.food?.current ?? 0;
    const currentEnergy = monitor.resources?.energy?.current ?? 0;
    
    monitor.resources.water.current = Math.max(0, currentWater - totalConsumption.water);
    monitor.resources.oxygen.current = Math.max(0, currentOxygen - totalConsumption.oxygen);
    monitor.resources.food.current = Math.max(0, currentFood - totalConsumption.food);
    monitor.resources.energy.current = Math.max(0, currentEnergy - totalConsumption.energy);
    
    // Actualizar población basada en recursos disponibles
    const foodCurrent = safeGet(monitor.resources, 'food', 0);
    const waterCurrent = safeGet(monitor.resources, 'water', 0);
    const popCurrent = safeGet(monitor.population, 'current', 0);
    const popMax = monitor.population?.max || 100;
    const growthRate = monitor.population?.growthRate || 0.01;
    
    if (foodCurrent > 0 && waterCurrent > 0 && popCurrent > 0) {
      const growthFactor = 1 + (growthRate * simulatedDays);
      monitor.population.current = Math.min(
        popMax,
        Math.floor(popCurrent * growthFactor)
      );
    }
    
  } catch (error) {
    console.error('Error simulating resource consumption:', error);
  }
}

export default router;
