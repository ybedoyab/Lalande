import mongoose from 'mongoose';

const medaDerivedSchema = new mongoose.Schema({
  sensorType: {
    type: String,
    required: true,
    enum: ['PS', 'RHS', 'TIRS', 'WS', 'ANCILLARY'],
    index: true
  },
  sol: {
    type: Number,
    default: null,
    index: true
  },
  // Campos dinámicos según el tipo de sensor derivado
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  importedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índice compuesto para consultas por sensor y sol
// Nota: Los datos derivados pueden tener múltiples registros por sol, no agregamos único
medaDerivedSchema.index({ sensorType: 1, sol: 1 });
medaDerivedSchema.index({ importedAt: -1 });

const MEDADerivedData = mongoose.model('MEDADerivedData', medaDerivedSchema, 'meda_derived_data');

export default MEDADerivedData;

