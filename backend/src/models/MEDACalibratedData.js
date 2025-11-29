import mongoose from 'mongoose';

const medaCalibratedSchema = new mongoose.Schema({
  sensorType: {
    type: String,
    required: true,
    enum: ['ATS', 'PS', 'WS', 'TIRS', 'RHS', 'RDS', 'ENG'],
    index: true
  },
  sol: {
    type: Number,
    default: null,
    index: true
  },
  sclk: {
    type: Number,
    default: null
  },
  lmst: {
    type: String,
    default: null
  },
  ltst: {
    type: String,
    default: null
  },
  // Campos dinámicos según el tipo de sensor
  // ATS: ATS_LOCAL_TEMP1-5
  // PS: PS
  // WS: WS_*
  // TIRS: TIRS_*
  // RHS: RHS_*
  // RDS: RDS_*
  // ENG: ENG_*
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

// Índice único: evitar duplicados por sensor, sol y sclk
medaCalibratedSchema.index({ sensorType: 1, sol: 1, sclk: 1 }, { unique: true, sparse: true });
medaCalibratedSchema.index({ sensorType: 1, sol: 1 });
medaCalibratedSchema.index({ importedAt: -1 });

const MEDACalibratedData = mongoose.model('MEDACalibratedData', medaCalibratedSchema, 'meda_calibrated_data');

export default MEDACalibratedData;

