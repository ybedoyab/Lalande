import { Link } from 'react-router-dom';

/**
 * Hero Component
 * Follows Single Responsibility Principle - handles hero section display
 * Similar to Namazu landing but using daisyUI
 */
export const Hero = () => {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-base-200/60 bg-base-100/80 min-h-[70vh] flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-base-100/0 to-secondary/10" />
      
      <div className="relative z-10 text-center px-6 py-16 space-y-8">
        <Link 
          to="/colony" 
          className="hero-text text-primary hover:text-primary-focus block cursor-pointer"
        >
          LALANDE
        </Link>
        
        <p className="text-xl md:text-2xl text-base-content/80 max-w-2xl mx-auto animate-fade-up">
          Sistema de Monitoreo de Soporte Vital para Colonias Marcianas
        </p>
        
        <div className="flex flex-wrap justify-center gap-4 mt-8 animate-fade-up">
          <Link to="/colony" className="btn btn-primary btn-lg">
            Ver Colonia
          </Link>
          <Link to="/mars" className="btn btn-outline btn-lg">
            Datos de Marte
          </Link>
        </div>
      </div>
    </section>
  );
};

