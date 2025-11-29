import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas básicas
app.get('/', (req, res) => {
  res.json({ 
    message: 'Lalande Backend API',
    status: 'running',
    version: '1.0.0'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Importar rutas
import materialsRoutes from './routes/materials.routes.js';
import marsRoutes from './routes/mars.routes.js';
import resourcesRoutes from './routes/resources.routes.js';
import craterMaterialsRoutes from './routes/crater-materials.routes.js';
import colonistsRoutes from './routes/colonists.routes.js';
import resourceUsageRoutes from './routes/resource-usage.routes.js';
import aiAnalysisRoutes from './routes/ai-analysis.routes.js';
app.use('/api/materials', materialsRoutes);
app.use('/api/mars', marsRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/crater-materials', craterMaterialsRoutes);
app.use('/api/colonists', colonistsRoutes);
app.use('/api/resource-usage', resourceUsageRoutes);
app.use('/api/ai-analysis', aiAnalysisRoutes);

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Iniciar servidor
const startServer = async () => {
  try {
    // Conectar a MongoDB
    await connectDB();
    
    // Iniciar servidor Express
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

