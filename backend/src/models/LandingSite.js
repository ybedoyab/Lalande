import mongoose from 'mongoose';

const landingSiteSchema = new mongoose.Schema({
  mission: {
    type: String,
    required: true
  },
  landingDate: {
    type: Date,
    required: true
  },
  landingSite: {
    type: String,
    required: true
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  elevationMeters: {
    type: Number,
    required: true
  },
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
  importedAt: {
    type: Date,
    default: Date.now
  }
});

// Índice único: una misión solo puede aparecer una vez
landingSiteSchema.index({ mission: 1 }, { unique: true });
// Índice geoespacial para búsquedas por ubicación
landingSiteSchema.index({ location: '2dsphere' });
landingSiteSchema.index({ mission: 1, landingDate: 1 });

const LandingSite = mongoose.model('LandingSite', landingSiteSchema, 'landing_sites');

export default LandingSite;

