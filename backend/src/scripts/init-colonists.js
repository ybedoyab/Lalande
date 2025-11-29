/**
 * Script de inicialización de colonos
 * Crea colonos iniciales para la colonia
 */

import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import Colonist from '../models/Colonist.js';

dotenv.config();

// Nombres y roles de colonos iniciales
const INITIAL_COLONISTS = [
  // Comando y liderazgo
  { name: 'Dr. Elena Martínez', role: 'commander', colonistId: 'colonist-001' },
  { name: 'Cpt. María López', role: 'pilot', colonistId: 'colonist-005' },
  
  // Ingeniería y construcción
  { name: 'Ing. Carlos Rodríguez', role: 'engineer', colonistId: 'colonist-002' },
  { name: 'Ing. Roberto Silva', role: 'engineer', colonistId: 'colonist-011' },
  { name: 'Ing. Patricia Moreno', role: 'engineer', colonistId: 'colonist-012' },
  { name: 'Téc. Laura Torres', role: 'technician', colonistId: 'colonist-008' },
  { name: 'Téc. Andrés Castro', role: 'technician', colonistId: 'colonist-013' },
  { name: 'Téc. Carmen Ruiz', role: 'technician', colonistId: 'colonist-014' },
  
  // Ciencia e investigación
  { name: 'Dr. Ana García', role: 'scientist', colonistId: 'colonist-003' },
  { name: 'Dr. Miguel Hernández', role: 'scientist', colonistId: 'colonist-015' },
  { name: 'Inv. Diego Ramírez', role: 'researcher', colonistId: 'colonist-009' },
  { name: 'Inv. Isabel Vargas', role: 'researcher', colonistId: 'colonist-016' },
  { name: 'Inv. Fernando Jiménez', role: 'researcher', colonistId: 'colonist-017' },
  
  // Medicina y salud
  { name: 'Dr. Luis Fernández', role: 'doctor', colonistId: 'colonist-004' },
  { name: 'Dr. Marta Ortega', role: 'doctor', colonistId: 'colonist-018' },
  
  // Agricultura y alimentación
  { name: 'Agr. José Sánchez', role: 'farmer', colonistId: 'colonist-006' },
  { name: 'Agr. Rosa Mendoza', role: 'farmer', colonistId: 'colonist-019' },
  { name: 'Agr. Juan Pérez', role: 'farmer', colonistId: 'colonist-020' },
  
  // Minería y extracción
  { name: 'Min. Pedro González', role: 'miner', colonistId: 'colonist-007' },
  { name: 'Min. Alicia Gómez', role: 'miner', colonistId: 'colonist-021' },
  { name: 'Min. Ricardo Soto', role: 'miner', colonistId: 'colonist-022' },
  { name: 'Min. Lucía Navarro', role: 'miner', colonistId: 'colonist-023' },
  
  // Mantenimiento
  { name: 'Mant. Sofía Morales', role: 'maintenance', colonistId: 'colonist-010' },
  { name: 'Mant. Jorge Medina', role: 'maintenance', colonistId: 'colonist-024' },
  { name: 'Mant. Elena Ríos', role: 'maintenance', colonistId: 'colonist-025' }
];

// Consumo por rol (ajustado según el tipo de trabajo)
const consumptionByRole = {
  commander: { water: 5, oxygen: 0.8, food: 1.5, energy: 10 },
  engineer: { water: 6, oxygen: 0.9, food: 1.6, energy: 15 },
  scientist: { water: 5, oxygen: 0.8, food: 1.5, energy: 12 },
  doctor: { water: 5, oxygen: 0.8, food: 1.5, energy: 11 },
  pilot: { water: 5, oxygen: 0.8, food: 1.5, energy: 10 },
  farmer: { water: 7, oxygen: 0.9, food: 1.7, energy: 13 },
  miner: { water: 8, oxygen: 1.0, food: 1.8, energy: 16 },
  technician: { water: 6, oxygen: 0.9, food: 1.6, energy: 14 },
  researcher: { water: 5, oxygen: 0.8, food: 1.5, energy: 12 },
  maintenance: { water: 6, oxygen: 0.9, food: 1.6, energy: 13 }
};

async function initColonists() {
  try {
    console.log('👥 Iniciando inicialización de colonos...\n');
    
    // Conectar a MongoDB
    await connectDB();
    console.log('✅ Conectado a MongoDB\n');
    
    let created = 0;
    let updated = 0;
    
    for (const colonistData of INITIAL_COLONISTS) {
      const existing = await Colonist.findOne({ colonistId: colonistData.colonistId });
      
      const consumption = consumptionByRole[colonistData.role] || consumptionByRole.engineer;
      
      if (existing) {
        // Actualizar existente
        existing.name = colonistData.name;
        existing.role = colonistData.role;
        existing.consumption = consumption;
        await existing.save();
        updated++;
      } else {
        // Crear nuevo
        const colonist = new Colonist({
          name: colonistData.name,
          colonistId: colonistData.colonistId,
          role: colonistData.role,
          status: Math.random() > 0.3 ? 'active' : 'working',
          consumption: consumption,
          arrivalDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000) // Últimos 90 días
        });
        
        await colonist.save();
        created++;
      }
    }
    
    console.log(`✅ Colonos procesados: ${created} creados, ${updated} actualizados`);
    console.log('');
    
    // Resumen
    const total = await Colonist.countDocuments();
    const active = await Colonist.countDocuments({ status: { $in: ['active', 'working'] } });
    
    console.log('📊 Resumen de colonos:');
    console.log(`   - Total de colonos: ${total}`);
    console.log(`   - Colonos activos: ${active}`);
    console.log('');
    console.log('✅ Inicialización de colonos completada!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la inicialización:', error);
    process.exit(1);
  }
}

// Ejecutar script
initColonists();

