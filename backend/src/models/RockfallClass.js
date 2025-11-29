import mongoose from 'mongoose';

const rockfallClassSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  classId: {
    type: Number,
    required: true,
    unique: true
  },
  importedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const RockfallClass = mongoose.model('RockfallClass', rockfallClassSchema, 'rockfall_classes');

export default RockfallClass;

