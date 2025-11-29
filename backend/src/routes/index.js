import express from 'express';

const router = express.Router();

// Rutas de ejemplo
router.get('/', (req, res) => {
  res.json({ message: 'API Routes' });
});

// Aquí agregarás tus rutas específicas
// Ejemplo:
// router.use('/inventory', inventoryRoutes);
// router.use('/orders', orderRoutes);

export default router;

