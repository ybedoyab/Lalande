/**
 * Espacio Page Component
 * Displays all International Space Station related content
 */

import { ISSLocationCard } from '../components/ISSLocationCard';
import { ISSGlobe } from '../components/ISSGlobe';
import { ISSAstronautsCard } from '../components/ISSAstronautsCard';

export const EspacioPage = () => {
  return (
    <main className="space-y-6">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">International Space Station</h2>
        <ISSLocationCard />
        <ISSGlobe />
        <ISSAstronautsCard />
      </div>
    </main>
  );
};

