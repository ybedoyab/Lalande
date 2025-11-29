import mongoose from 'mongoose';

const seismicCatalogSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  timeAbs: {
    type: Date,
    required: true
  },
  timeRel: {
    type: Number, // segundos
    required: true
  },
  evid: {
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
  mqType: {
    type: String,
    default: null
  },
  importedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índice único: evitar duplicados de eventos sísmicos
seismicCatalogSchema.index({ planet: 1, dataset: 1, evid: 1 }, { unique: true });
seismicCatalogSchema.index({ timeAbs: -1 });

const SeismicCatalog = mongoose.model('SeismicCatalog', seismicCatalogSchema, 'seismic_catalogs');

export default SeismicCatalog;

