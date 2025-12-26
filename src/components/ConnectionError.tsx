import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import appIcon from '@/assets/app-icon.png';

interface ConnectionErrorProps {
  onRetry: () => void;
  isRetrying?: boolean;
}

export function ConnectionError({ onRetry, isRetrying = false }: ConnectionErrorProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center"
    >
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-destructive/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-destructive/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative mb-6"
      >
        <img 
          src={appIcon} 
          alt="e621 Gallery" 
          className="w-24 h-24 object-contain opacity-50 grayscale"
        />
        <div className="absolute -bottom-2 -right-2 bg-destructive rounded-full p-2">
          <WifiOff className="w-5 h-5 text-destructive-foreground" />
        </div>
      </motion.div>

      <motion.h2
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-xl font-bold text-foreground mb-2"
      >
        Errore Connessione al Server
      </motion.h2>

      <motion.p
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-muted-foreground mb-6 max-w-sm"
      >
        Il server di e621.net potrebbe essere in manutenzione oppure offline. 
        Per favore, attendi che ritorni online e riprova.
      </motion.p>

      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Button 
          onClick={onRetry} 
          disabled={isRetrying}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? 'Riprovo...' : 'Riprova'}
        </Button>
      </motion.div>

      <motion.p
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-xs text-muted-foreground mt-6"
      >
        Se il problema persiste, controlla la tua connessione internet
      </motion.p>
    </motion.div>
  );
}
