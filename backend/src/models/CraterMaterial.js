import mongoose from 'mongoose';

const craterMaterialSchema = new mongoose.Schema({
  // ID del cráter (puede ser el craterid de los datos existentes)
  craterId: {
    type: String,
    required: true
  },
  
  // Coordenadas del cráter
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  
  // Latitud y longitud (para fácil acceso)
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  
  // Diámetro del cráter (km)
  diameter: {
    type: Number,
    required: true
  },
  
  // Materiales encontrados en este cráter
  materials: [{
    // ID del material (puede ser mp-xxx del Materials Project)
    materialId: {
      type: String,
      required: true
    },
    // Nombre del material
    name: {
      type: String,
      required: true
    },
    // Fórmula química
    formula: {
      type: String,
      required: true
    },
    // Composición química detallada
    composition: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    // Cantidad estimada (kg)
    estimatedQuantity: {
      type: Number,
      default: 0
    },
    // Pureza (0-100%)
    purity: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    // Usos para la vida en Marte
    uses: [{
      type: String,
      enum: [
        'life-support',      // Soporte vital (oxígeno, agua)
        'construction',      // Construcción
        'energy',            // Generación de energía
        'food-production',   // Producción de alimentos
        'medicine',          // Medicina
        'electronics',       // Electrónica
        'manufacturing',     // Manufactura
        'research'           // Investigación
      ]
    }],
    // Descripción del material
    description: {
      type: String,
      default: ''
    },
    // Propiedades físicas
    properties: {
      density: Number,        // g/cm³
      meltingPoint: Number,   // °C
      boilingPoint: Number,   // °C
      hardness: Number,      // Escala de Mohs
      conductivity: Number   // Conductividad térmica o eléctrica
    },
    // Fecha de descubrimiento
    discoveredAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Estado de exploración
  explorationStatus: {
    type: String,
    enum: ['unexplored', 'scanned', 'sampled', 'mapped'],
    default: 'unexplored'
  },
  
  // Fecha de última exploración
  lastExplored: {
    type: Date,
    default: Date.now
  },
  
  // Prioridad de exploración (1-10)
  explorationPriority: {
    type: Number,
    default: 5,
    min: 1,
    max: 10
  }
}, {
  timestamps: true
});

// Índices
craterMaterialSchema.index({ craterId: 1 }, { unique: true });
craterMaterialSchema.index({ location: '2dsphere' });
craterMaterialSchema.index({ latitude: 1, longitude: 1 });
craterMaterialSchema.index({ explorationStatus: 1 });
craterMaterialSchema.index({ explorationPriority: -1 });
craterMaterialSchema.index({ 'materials.materialId': 1 });

// Método para agregar un material
craterMaterialSchema.methods.addMaterial = function(material) {
  // Verificar si el material ya existe
  const existingIndex = this.materials.findIndex(
    m => m.materialId === material.materialId
  );
  
  if (existingIndex >= 0) {
    // Actualizar material existente
    this.materials[existingIndex] = { ...this.materials[existingIndex], ...material };
  } else {
    // Agregar nuevo material
    this.materials.push(material);
  }
  
  // Actualizar estado de exploración
  if (this.explorationStatus === 'unexplored') {
    this.explorationStatus = 'scanned';
  } else if (this.explorationStatus === 'scanned' && this.materials.length > 0) {
    this.explorationStatus = 'sampled';
  }
  
  this.lastExplored = new Date();
};

const CraterMaterial = mongoose.model('CraterMaterial', craterMaterialSchema, 'crater_materials');

export default CraterMaterial;

