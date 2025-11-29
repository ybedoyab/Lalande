import { Hero } from '../components/Hero';
import { FeatureCard } from '../components/FeatureCard';

const FEATURES = [
  {
    title: 'Monitoreo en Tiempo Real',
    description: 'Visualiza niveles de recursos críticos (agua, oxígeno, presión, temperatura) actualizados en tiempo real',
    icon: '📊',
  },
  {
    title: 'Alertas Inteligentes',
    description: 'Notificaciones automáticas cuando los niveles de recursos caen por debajo de umbrales críticos',
    icon: '🚨',
  },
  {
    title: 'Gestión de Resupplies',
    description: 'Solicita recursos urgentes con un solo clic cuando sea necesario',
    icon: '🚀',
  },
  {
    title: 'Datos Reales de Marte',
    description: 'Utiliza datos reales de misiones espaciales y telemetría de la ISS para crear una simulación realista',
    icon: '🪐',
  },
];

/**
 * HomePage Component
 * Main landing page with hero section and features
 * Follows Single Responsibility Principle - orchestrates landing page sections
 */
export const HomePage = () => {
  return (
    <div className="space-y-12">
      <Hero />

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {FEATURES.map((feature) => (
          <FeatureCard
            key={feature.title}
            title={feature.title}
            description={feature.description}
            icon={feature.icon}
          />
        ))}
      </section>
    </div>
  );
};
