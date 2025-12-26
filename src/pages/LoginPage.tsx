import { useState } from 'react';
import { useAuthStore } from '@/stores/appStore';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { User, Key, Loader2, Trash2, LogIn, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showNewLogin, setShowNewLogin] = useState(false);
  const { 
    login, 
    loginAsGuest, 
    loginWithSavedAccount, 
    removeSavedAccount,
    savedAccounts,
    isLoading, 
    error, 
    clearError 
  } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(username, apiKey);
    if (success) {
      navigate('/gallery');
    }
  };

  const handleSavedAccountLogin = async (accountUsername: string) => {
    const success = await loginWithSavedAccount(accountUsername);
    if (success) {
      navigate('/gallery');
    }
  };

  const handleRemoveAccount = (accountUsername: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeSavedAccount(accountUsername);
  };

  const handleGuest = () => {
    loginAsGuest();
    navigate('/gallery');
  };

  const hasSavedAccounts = savedAccounts.length > 0;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/20 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-primary/15 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-primary/10 rounded-full blur-2xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-accent/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-display text-primary mb-2">e621 Gallery</h1>
          <p className="text-muted-foreground">Browse your favorite content</p>
        </div>

        <div className="bg-card rounded-xl p-6 border border-border shadow-lg">
          {/* Saved Accounts Section */}
          {hasSavedAccounts && (
            <>
              <div className="mb-4">
                <p className="text-sm font-medium text-muted-foreground mb-3">Account salvati</p>
                <div className="space-y-2">
                  {savedAccounts.map((account) => (
                    <div
                      key={account.username}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-medium">{account.username}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => handleRemoveAccount(account.username, e)}
                          disabled={isLoading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          className="h-8"
                          onClick={() => handleSavedAccountLogin(account.username)}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <LogIn className="w-4 h-4 mr-1" />
                              Accedi
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive mb-4">{error}</p>
              )}

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">oppure</span>
                </div>
              </div>

              {/* Toggle New Login Form */}
              <Button
                variant="outline"
                className="w-full mb-4"
                onClick={() => setShowNewLogin(!showNewLogin)}
              >
                {showNewLogin ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-2" />
                    Nascondi nuovo accesso
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-2" />
                    Accedi con altro account
                  </>
                )}
              </Button>

              <AnimatePresence>
                {showNewLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <form onSubmit={handleLogin} className="space-y-4 mb-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Username</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="text"
                            value={username}
                            onChange={(e) => { clearError(); setUsername(e.target.value); }}
                            placeholder="Il tuo username e621"
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">API Key</label>
                        <div className="relative">
                          <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="password"
                            value={apiKey}
                            onChange={(e) => { clearError(); setApiKey(e.target.value); }}
                            placeholder="La tua API key"
                            className="pl-10"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Ottieni la tua API key da e621.net → Account → Manage API Access
                        </p>
                      </div>

                      <Button type="submit" className="w-full" disabled={isLoading || !username || !apiKey}>
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Login
                      </Button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button variant="secondary" className="w-full" onClick={handleGuest}>
                Continua come Ospite
              </Button>
            </>
          )}

          {/* No Saved Accounts - Show Normal Login */}
          {!hasSavedAccounts && (
            <>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      value={username}
                      onChange={(e) => { clearError(); setUsername(e.target.value); }}
                      placeholder="Il tuo username e621"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">API Key</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="password"
                      value={apiKey}
                      onChange={(e) => { clearError(); setApiKey(e.target.value); }}
                      placeholder="La tua API key"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ottieni la tua API key da e621.net → Account → Manage API Access
                  </p>
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button type="submit" className="w-full" disabled={isLoading || !username || !apiKey}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Login
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">oppure</span>
                </div>
              </div>

              <Button variant="outline" className="w-full" onClick={handleGuest}>
                Continua come Ospite
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
