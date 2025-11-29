import mongoose from 'mongoose';

const colonistSchema = new mongoose.Schema({
  // Información básica
  name: {
    type: String,
    required: true
  },
  
  // ID único del colono
  colonistId: {
    type: String,
    required: true
  },
  
  // Rol en la colonia
  role: {
    type: String,
    enum: [
      'engineer',        // Ingeniero
      'scientist',       // Científico
      'doctor',          // Médico
      'pilot',           // Piloto
      'farmer',          // Agricultor
      'miner',           // Minero
      'technician',      // Técnico
      'commander',       // Comandante
      'researcher',      // Investigador
      'maintenance'      // Mantenimiento
    ],
    required: true
  },
  
  // Estado del colono
  status: {
    type: String,
    enum: ['active', 'resting', 'working', 'emergency', 'off-duty'],
    default: 'active'
  },
  
  // Recursos que consume (por día)
  consumption: {
    water: { type: Number, default: 5 },        // litros/día
    oxygen: { type: Number, default: 0.8 },    // kg/día
    food: { type: Number, default: 1.5 },       // kg/día
    energy: { type: Number, default: 10 }       // kWh/día
  },
  
  // Historial de actividades
  activityHistory: [{
    timestamp: { type: Date, default: Date.now },
    activity: {
      type: String,
      enum: [
        'consumed-water',
        'consumed-oxygen',
        'consumed-food',
        'consumed-energy',
        'used-construction-materials',
        'used-life-support-materials',
        'worked-on-project',
        'explored-crater',
        'analyzed-material',
        'maintained-equipment'
      ]
    },
    resourceType: String,
    amount: Number,
    details: String,
    location: String
  }],
  
  // Proyectos asignados
  assignedProjects: [{
    projectId: String,
    projectName: String,
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ['active', 'completed', 'paused']
    }
  }],
  
  // Estadísticas
  stats: {
    daysOnMars: { type: Number, default: 0 },
    resourcesConsumed: {
      water: { type: Number, default: 0 },
      oxygen: { type: Number, default: 0 },
      food: { type: Number, default: 0 },
      energy: { type: Number, default: 0 }
    },
    projectsCompleted: { type: Number, default: 0 },
    cratersExplored: { type: Number, default: 0 }
  },
  
  // Fecha de llegada a Marte
  arrivalDate: {
    type: Date,
    default: Date.now
  },
  
  // Última actividad
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices
colonistSchema.index({ colonistId: 1 }, { unique: true });
colonistSchema.index({ role: 1 });
colonistSchema.index({ status: 1 });
colonistSchema.index({ lastActivity: -1 });

// Método para registrar una actividad
colonistSchema.methods.recordActivity = function(activity, resourceType, amount, details, location) {
  this.activityHistory.push({
    timestamp: new Date(),
    activity,
    resourceType,
    amount,
    details,
    location
  });
  
  // Mantener solo los últimos 100 registros
  if (this.activityHistory.length > 100) {
    this.activityHistory.shift();
  }
  
  // Actualizar estadísticas
  if (resourceType && amount) {
    if (this.stats.resourcesConsumed[resourceType] !== undefined) {
      this.stats.resourcesConsumed[resourceType] += amount;
    }
  }
  
  this.lastActivity = new Date();
};

// Método para consumir recursos
colonistSchema.methods.consumeResources = function(days = 1) {
  const consumed = {
    water: this.consumption.water * days,
    oxygen: this.consumption.oxygen * days,
    food: this.consumption.food * days,
    energy: this.consumption.energy * days
  };
  
  // Registrar actividades
  this.recordActivity('consumed-water', 'water', consumed.water, `Consumió ${consumed.water}L de agua`, 'Colonia');
  this.recordActivity('consumed-oxygen', 'oxygen', consumed.oxygen, `Consumió ${consumed.oxygen}kg de oxígeno`, 'Colonia');
  this.recordActivity('consumed-food', 'food', consumed.food, `Consumió ${consumed.food}kg de alimentos`, 'Colonia');
  this.recordActivity('consumed-energy', 'energy', consumed.energy, `Consumió ${consumed.energy}kWh de energía`, 'Colonia');
  
  // Actualizar días en Marte
  this.stats.daysOnMars += days;
  
  return consumed;
};

const Colonist = mongoose.model('Colonist', colonistSchema, 'colonists');

export default Colonist;

