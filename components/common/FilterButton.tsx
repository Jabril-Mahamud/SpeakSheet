export function FilterButton({ 
    children, 
    active, 
    onClick 
  }: { 
    children: React.ReactNode; 
    active: boolean; 
    onClick: () => void;
  }) {
    return (
      <button
        onClick={onClick}
        className={`px-4 py-2 rounded-md text-sm transition-colors ${
          active 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-accent/50 hover:bg-accent text-foreground'
        }`}
      >
        {children}
      </button>
    );
  }