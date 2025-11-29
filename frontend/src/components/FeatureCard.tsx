interface FeatureCardProps {
  title: string;
  description: string;
  icon?: string;
}

/**
 * FeatureCard Component
 * Follows Single Responsibility Principle - displays a feature card
 * Follows DRY principle - reusable component for feature display
 */
export const FeatureCard = ({ title, description, icon }: FeatureCardProps) => {
  return (
    <article className="soft-card hover:-translate-y-1 transition-transform duration-300">
      {icon && (
        <div className="text-4xl mb-4">{icon}</div>
      )}
      <h3 className="text-lg font-semibold mb-2 text-primary">{title}</h3>
      <p className="text-base-content/70">{description}</p>
    </article>
  );
};

