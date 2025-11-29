import mongoose from 'mongoose';

const resourceUsageSchema = new mongoose.Schema({
  // Tipo de recurso usado
  resourceType: {
    type: String,
    required: true,
    enum: ['water', 'oxygen', 'energy', 'food', 'constructionMaterials', 'lifeSupportMaterials']
  },
  
  // Cantidad usada
  amount: {
    type: Number,
    required: true
  },
  
  // ID del colono que usó el recurso
  colonistId: {
    type: String,
    required: true,
    index: true
  },
  
  // Nombre del colono (para fácil acceso)
  colonistName: {
    type: String,
    required: true
  },
  
  // Rol del colono
  colonistRole: {
    type: String,
    required: true
  },
  
  // Razón del uso
  reason: {
    type: String,
    default: ''
  },
  
  // Ubicación donde se usó
  location: {
    type: String,
    default: 'Colonia'
  },
  
  // Proyecto relacionado (si aplica)
  projectId: {
    type: String,
    default: null
  },
  
  // Timestamp del uso
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Índices
resourceUsageSchema.index({ resourceType: 1, timestamp: -1 });
resourceUsageSchema.index({ colonistId: 1, timestamp: -1 });
resourceUsageSchema.index({ timestamp: -1 });

// Método estático para obtener el último uso de un recurso
resourceUsageSchema.statics.getLastUsage = async function(resourceType) {
  return this.findOne({ resourceType })
    .sort({ timestamp: -1 })
    .lean();
};

// Método estático para obtener todos los usos recientes de un recurso
resourceUsageSchema.statics.getRecentUsage = async function(resourceType, limit = 10) {
  return this.find({ resourceType })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

const ResourceUsage = mongoose.model('ResourceUsage', resourceUsageSchema, 'resource_usage');

export default ResourceUsage;

