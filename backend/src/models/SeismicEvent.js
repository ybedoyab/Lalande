import mongoose from 'mongoose';

const seismicEventSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    index: true
  },
  planet: {
    type: String,
    required: true,
    enum: ['mars', 'lunar'],
    index: true
  },
  dataset: {
    type: String,
    required: true,
    enum: ['train', 'test'],
    index: true
  },
  timeAbs: {
    type: Date,
    default: null
  },
  timeRel: {
    type: Number, // segundos
    default: null
  },
  evid: {
    type: String,
    index: true
  },
  mqType: {
    type: String,
    default: null // impact_mq, deep_mq, etc.
  },
  station: {
    type: String,
    default: null
  },
  grade: {
    type: String,
    enum: ['GradeA', 'GradeB', null],
    default: null
  },
  filePath: {
    type: String,
    default: null
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  rowIndex: {
    type: Number,
    default: null
  },
  importedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índice único: evitar duplicados por filename, planeta y dataset
seismicEventSchema.index({ filename: 1, planet: 1, dataset: 1, rowIndex: 1 }, { unique: true, sparse: true });
// Índices compuestos para consultas eficientes
seismicEventSchema.index({ planet: 1, dataset: 1, evid: 1 });
seismicEventSchema.index({ planet: 1, timeAbs: 1 });
seismicEventSchema.index({ importedAt: -1 });

const SeismicEvent = mongoose.model('SeismicEvent', seismicEventSchema, 'seismic_events');

export default SeismicEvent;

