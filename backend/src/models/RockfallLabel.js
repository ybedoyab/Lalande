import mongoose from 'mongoose';

const rockfallLabelSchema = new mongoose.Schema({
  imageId: {
    type: String,
    required: true,
    index: true
  },
  dataset: {
    type: String,
    required: true,
    enum: ['train', 'test'],
    index: true
  },
  x1: {
    type: Number,
    required: true
  },
  y1: {
    type: Number,
    required: true
  },
  x2: {
    type: Number,
    required: true
  },
  y2: {
    type: Number,
    required: true
  },
  label: {
    type: String,
    required: true,
    default: 'rockfall'
  },
  boundingBox: {
    type: {
      width: Number,
      height: Number,
      area: Number
    },
    default: null
  },
  importedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Pre-save hook para calcular bounding box
rockfallLabelSchema.pre('save', function(next) {
  if (this.x1 && this.y1 && this.x2 && this.y2) {
    const width = Math.abs(this.x2 - this.x1);
    const height = Math.abs(this.y2 - this.y1);
    this.boundingBox = {
      width,
      height,
      area: width * height
    };
  }
  next();
});

// Índice único: evitar duplicados de bounding boxes en la misma imagen
rockfallLabelSchema.index({ imageId: 1, dataset: 1, x1: 1, y1: 1, x2: 1, y2: 1 }, { unique: true });
// Índices para consultas eficientes
rockfallLabelSchema.index({ imageId: 1, dataset: 1 });
rockfallLabelSchema.index({ dataset: 1, label: 1 });

const RockfallLabel = mongoose.model('RockfallLabel', rockfallLabelSchema, 'rockfall_labels');

export default RockfallLabel;

