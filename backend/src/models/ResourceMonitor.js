import mongoose from 'mongoose';

const resourceMonitorSchema = new mongoose.Schema({
  // Identificador único de la colonia
  colonyId: {
    type: String,
    required: true,
    default: 'lalande-colony-001'
  },
  
  // Recursos básicos para la vida
  resources: {
    // Agua (litros)
    water: {
      current: { type: Number, default: 0, min: 0 },
      max: { type: Number, default: 10000 },
      consumptionRate: { type: Number, default: 150 }, // litros/día (aumentado para más colonos)
      unit: { type: String, default: 'liters' }
    },
    // Oxígeno (kg)
    oxygen: {
      current: { type: Number, default: 0, min: 0 },
      max: { type: Number, default: 5000 },
      consumptionRate: { type: Number, default: 25 }, // kg/día
      unit: { type: String, default: 'kg' }
    },
    // Energía (kWh)
    energy: {
      current: { type: Number, default: 0, min: 0 },
      max: { type: Number, default: 10000 },
      consumptionRate: { type: Number, default: 300 }, // kWh/día (aumentado para más colonos)
      unit: { type: String, default: 'kWh' }
    },
    // Alimentos (kg)
    food: {
      current: { type: Number, default: 0, min: 0 },
      max: { type: Number, default: 2000 },
      consumptionRate: { type: Number, default: 30 }, // kg/día (aumentado para más colonos)
      unit: { type: String, default: 'kg' }
    },
    // Materiales de construcción (kg)
    constructionMaterials: {
      current: { type: Number, default: 0, min: 0 },
      max: { type: Number, default: 50000 },
      consumptionRate: { type: Number, default: 100 }, // kg/día
      unit: { type: String, default: 'kg' }
    },
    // Materiales para soporte vital (kg)
    lifeSupportMaterials: {
      current: { type: Number, default: 0, min: 0 },
      max: { type: Number, default: 10000 },
      consumptionRate: { type: Number, default: 5 }, // kg/día
      unit: { type: String, default: 'kg' }
    }
  },
  
  // Población
  population: {
    current: { type: Number, default: 0, min: 0 },
    max: { type: Number, default: 100 },
    growthRate: { type: Number, default: 0.01 } // por día
  },
  
  // Estado de la colonia
  status: {
    type: String,
    enum: ['healthy', 'warning', 'critical', 'emergency'],
    default: 'healthy'
  },
  
  // Última actualización
  lastUpdate: {
    type: Date,
    default: Date.now
  },
  
  // Historial de cambios (últimos 100 registros)
  history: [{
    timestamp: { type: Date, default: Date.now },
    resources: {
      water: Number,
      oxygen: Number,
      energy: Number,
      food: Number,
      constructionMaterials: Number,
      lifeSupportMaterials: Number
    },
    population: Number,
    status: String
  }],
  
  // Configuración de simulación
  simulation: {
    enabled: { type: Boolean, default: true },
    updateInterval: { type: Number, default: 60000 }, // milisegundos (1 minuto)
    lastSimulation: { type: Date, default: Date.now }
  }
}, {
  timestamps: true
});

// Índices
resourceMonitorSchema.index({ colonyId: 1 }, { unique: true });
resourceMonitorSchema.index({ lastUpdate: -1 });
resourceMonitorSchema.index({ status: 1 });

// Método para actualizar recursos basado en el tiempo transcurrido
resourceMonitorSchema.methods.updateResources = function() {
  const now = new Date();
  const timeDiff = now - this.lastUpdate;
  const daysElapsed = timeDiff / (1000 * 60 * 60 * 24); // días
  
  if (daysElapsed <= 0) return;
  
  // Actualizar recursos (consumir)
  this.resources.water.current = Math.max(0, 
    this.resources.water.current - (this.resources.water.consumptionRate * daysElapsed)
  );
  this.resources.oxygen.current = Math.max(0, 
    this.resources.oxygen.current - (this.resources.oxygen.consumptionRate * daysElapsed)
  );
  this.resources.energy.current = Math.max(0, 
    this.resources.energy.current - (this.resources.energy.consumptionRate * daysElapsed)
  );
  this.resources.food.current = Math.max(0, 
    this.resources.food.current - (this.resources.food.consumptionRate * daysElapsed)
  );
  this.resources.constructionMaterials.current = Math.max(0, 
    this.resources.constructionMaterials.current - (this.resources.constructionMaterials.consumptionRate * daysElapsed)
  );
  this.resources.lifeSupportMaterials.current = Math.max(0, 
    this.resources.lifeSupportMaterials.current - (this.resources.lifeSupportMaterials.consumptionRate * daysElapsed)
  );
  
  // Actualizar población (crecimiento)
  if (this.resources.food.current > 0 && this.resources.water.current > 0 && this.resources.oxygen.current > 0) {
    this.population.current = Math.min(this.population.max, 
      this.population.current * (1 + this.population.growthRate * daysElapsed)
    );
  }
  
  // Actualizar estado
  this.updateStatus();
  
  // Guardar en historial (mantener solo últimos 100)
  this.history.push({
    timestamp: now,
    resources: {
      water: this.resources.water.current,
      oxygen: this.resources.oxygen.current,
      energy: this.resources.energy.current,
      food: this.resources.food.current,
      constructionMaterials: this.resources.constructionMaterials.current,
      lifeSupportMaterials: this.resources.lifeSupportMaterials.current
    },
    population: this.population.current,
    status: this.status
  });
  
  if (this.history.length > 100) {
    this.history.shift();
  }
  
  this.lastUpdate = now;
};

// Método para actualizar el estado de la colonia
resourceMonitorSchema.methods.updateStatus = function() {
  const waterPercent = (this.resources.water.current / this.resources.water.max) * 100;
  const oxygenPercent = (this.resources.oxygen.current / this.resources.oxygen.max) * 100;
  const energyPercent = (this.resources.energy.current / this.resources.energy.max) * 100;
  const foodPercent = (this.resources.food.current / this.resources.food.max) * 100;
  
  const minPercent = Math.min(waterPercent, oxygenPercent, energyPercent, foodPercent);
  
  if (minPercent < 10) {
    this.status = 'emergency';
  } else if (minPercent < 25) {
    this.status = 'critical';
  } else if (minPercent < 50) {
    this.status = 'warning';
  } else {
    this.status = 'healthy';
  }
};

// Método para agregar recursos
resourceMonitorSchema.methods.addResource = function(resourceType, amount) {
  if (!this.resources[resourceType]) {
    throw new Error(`Resource type ${resourceType} does not exist`);
  }
  
  this.resources[resourceType].current = Math.min(
    this.resources[resourceType].max,
    this.resources[resourceType].current + amount
  );
  
  this.updateStatus();
  return this.resources[resourceType].current;
};

const ResourceMonitor = mongoose.model('ResourceMonitor', resourceMonitorSchema, 'resource_monitors');

export default ResourceMonitor;

