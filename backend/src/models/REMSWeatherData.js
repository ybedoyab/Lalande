import mongoose from 'mongoose';

const remsWeatherSchema = new mongoose.Schema({
  earthDateTime: {
    type: String,
    required: true
  },
  marsDateTime: {
    type: String,
    required: true
  },
  solNumber: {
    type: Number,
    required: true,
    index: true
  },
  maxGroundTemp: {
    type: Number,
    default: null
  },
  minGroundTemp: {
    type: Number,
    default: null
  },
  maxAirTemp: {
    type: Number,
    default: null
  },
  minAirTemp: {
    type: Number,
    default: null
  },
  meanPressure: {
    type: Number,
    default: null
  },
  windSpeed: {
    type: String, // Puede ser "Value not available"
    default: null
  },
  humidity: {
    type: String, // Puede ser "Value not available"
    default: null
  },
  sunrise: {
    type: String,
    default: null
  },
  sunset: {
    type: String,
    default: null
  },
  uvRadiation: {
    type: String,
    default: null
  },
  weather: {
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

// Índice único: un sol solo puede tener un registro por fecha terrestre
remsWeatherSchema.index({ solNumber: 1, earthDateTime: 1 }, { unique: true });
remsWeatherSchema.index({ importedAt: -1 });

const REMSWeatherData = mongoose.model('REMSWeatherData', remsWeatherSchema, 'rems_weather_data');

export default REMSWeatherData;

