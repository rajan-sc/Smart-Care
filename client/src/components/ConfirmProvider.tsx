import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<{ resolve: (value: boolean) => void } | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolver({ resolve });
    });
  }, []);

  const handleConfirm = () => {
    setIsOpen(false);
    resolver?.resolve(true);
  };

  const handleCancel = () => {
    setIsOpen(false);
    resolver?.resolve(false);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      
      {isOpen && options && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-ink/30 backdrop-blur-sm animate-fade-in">
          <div className="bg-linen-white rounded-cards w-full max-w-md shadow-2xl overflow-hidden border border-hairline-gray animate-slide-up">
            <div className="p-6">
              <h2 className="text-xl font-bold tracking-tight text-forest-ink mb-2">
                {options.title}
              </h2>
              {options.message && (
                <p className="text-ease-body-sm text-graphite font-medium">
                  {options.message}
                </p>
              )}
            </div>
            <div className="p-4 bg-mint-veil/10 border-t border-hairline-gray flex justify-end gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-bold text-charcoal hover:bg-mist-blue/30 rounded-lg transition-colors tracking-widest uppercase"
              >
                {options.cancelText || 'Cancel'}
              </button>
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 text-sm font-bold tracking-widest uppercase rounded-lg transition-colors shadow-sm ${
                  options.isDestructive 
                    ? 'bg-danger-100 text-danger-700 hover:bg-danger-200 border border-danger-200' 
                    : 'bg-mint-veil text-forest-ink hover:bg-mint-veil/80 border border-forest-ink/10'
                }`}
              >
                {options.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
