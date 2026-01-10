import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/appStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
    ropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Heart, LogOut, User, ChevronDown, Settings } from 'lucide-react';

export function UserMenu() {
  const { credentials, isGuest, logout } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const displayName = credentials?.username || (isGuest ? 'Ospite' : null);

  if (!displayName) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleFavorites = () => {
    if (isGuest) {
      // Guest cannot access favorites
      return;
    }
    setOpen(false);
    navigate('/favorites');
  };

  const handleSettings = () => {
    setOpen(false);
    navigate('/settings');
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          Ciao, <span className="text-primary font-medium">{displayName}</span>
          <ChevronDown className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200">
        <div className="px-2 py-1.5 text-sm font-medium flex items-center gap-2">
          <User className="w-4 h-4" />
          {displayName}
        </div>
        {!isGuest && (
          <DropdownMenuItem onClick={handleFavorites} className="cursor-pointer">
            <Heart className="w-4 h-4 mr-2" />
            Preferiti
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleSettings} className="cursor-pointer">
          <Settings className="w-4 h-4 mr-2" />
          Impostazioni avanzate
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
          <LogOut className="w-4 h-4 mr-2" />
          {isGuest ? 'Accedi' : 'Esci'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
