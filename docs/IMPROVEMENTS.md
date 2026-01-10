# 🚀 Miglioramenti Implementati - Guida Completa

Questo documento descrive i miglioramenti ad alta priorità implementati per aumentare l'affidabilità e le performance dell'app.

## 📋 Indice

1. [Error Boundary Globale](#1-error-boundary-globale)
2. [React Query Ottimizzato](#2-react-query-ottimizzato)
3. [useEnhancedQuery Hook](#3-useenhancedquery-hook)
4. [Gestione Errori API](#4-gestione-errori-api)
5. [Best Practices](#5-best-practices)
6. [Migrazione Codice Esistente](#6-migrazione-codice-esistente)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Error Boundary Globale

### ✅ Cosa fa

- **Previene crash completi dell'app** catturando errori React
- **Retry automatico** per errori di rete (fino a 3 tentativi)
- **Interfaccia user-friendly** con opzioni di recupero
- **Logging automatico** degli errori per debugging
- **Exponential backoff** nei retry

### 📖 Come usarlo

**L'ErrorBoundary è già attivo globalmente in `App.tsx`** - protegge automaticamente tutta l'app!

```tsx
// Già implementato in App.tsx
<ErrorBoundary
  maxRetries={3}
  onError={(error, errorInfo) => {
    // Custom error tracking
    console.error('Error:', error.message);
  }}
>
  {/* Tutta la tua app */}
</ErrorBoundary>
```

### 🎯 Per errori asincroni

Usa l'hook `useErrorHandler` per errori che non fanno naturalmente bubble up:

```tsx
import { useErrorHandler } from '@/components/ErrorBoundary';

function MyComponent() {
  const handleError = useErrorHandler();

  const fetchData = async () => {
    try {
      await someAsyncOperation();
    } catch (error) {
      handleError(error); // Triggerera l'ErrorBoundary
    }
  };
}
```

### 🔧 Funzionalità

- **Retry automatico** per errori di rete
- **Pulsante "Riprova"** per reset manuale
- **Pulsante "Home"** per tornare alla gallery
- **Pulsante "Report"** per copiare dettagli errore negli appunti
- **Dev mode**: mostra stack trace completo

---

## 2. React Query Ottimizzato

### ✅ Configurazione Ottimale

React Query è stato configurato con strategie di caching intelligenti:

```tsx
// Configurazione in App.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 min - dati considerati fresh
      gcTime: 10 * 60 * 1000,         // 10 min - lifetime cache
      retry: 3,                        // 3 tentativi automatici
      retryDelay: exponentialBackoff,  // 1s, 2s, 4s...
      refetchOnWindowFocus: false,     // Ottimizzato per mobile
      refetchOnReconnect: true,        // Refetch quando torna online
    }
  }
});
```

### 🗂️ Query Keys Factories

Usa le factory esportate da `App.tsx` per organizzare meglio la cache:

```tsx
import { queryKeys } from '@/App';

// ✅ CORRETTO - Query keys organizzate
const { data } = useQuery({
  queryKey: queryKeys.posts.list({ tags, rating }),
  queryFn: () => e621Api.searchPosts({ tags, rating })
});

// ❌ EVITA - Query keys disorganizzate
const { data } = useQuery({
  queryKey: ['posts', tags, rating], // Difficile da invalidare
  queryFn: () => e621Api.searchPosts({ tags, rating })
});
```

### 🎯 Strategie di Caching

| Tipo Dati | staleTime | gcTime | Motivo |
|-----------|-----------|--------|--------|
| **Posts** | 5 min | 10 min | Contenuto cambia raramente |
| **Tags** | 30 min | 1 ora | Estremamente stabile |
| **User Data** | 15 min | 30 min | Cambia occasionalmente |
| **Favorites** | 2 min | 5 min | Aggiornato frequentemente |

### 🔄 Invalidazione Cache

```tsx
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/App';

function MyComponent() {
  const queryClient = useQueryClient();

  const handleFavorite = async (postId: number) => {
    await e621Api.addFavorite(postId);
    
    // Invalida cache dei favoriti
    queryClient.invalidateQueries({
      queryKey: queryKeys.user.favorites(username)
    });
  };
}
```

### ⚡ Prefetching

```tsx
const queryClient = useQueryClient();

// Prefetch pagina successiva
const prefetchNextPage = () => {
  queryClient.prefetchQuery({
    queryKey: queryKeys.posts.list({ tags, page: currentPage + 1 }),
    queryFn: () => e621Api.searchPosts({ tags, page: currentPage + 1 })
  });
};
```

---

## 3. useEnhancedQuery Hook

### ✅ Cos'è

Hook personalizzato che wrappa `useQuery` con:
- **Gestione errori automatica** con toast notifications
- **Categorizzazione errori** (network, auth, server)
- **Retry intelligente** basato sul tipo di errore
- **Monitoraggio connessione** online/offline

### 📖 Utilizzo Base

```tsx
import { useEnhancedQuery } from '@/hooks/useEnhancedQuery';

function GalleryComponent() {
  const { data, isLoading, error, isOffline, retry } = useEnhancedQuery(
    ['posts', tags],
    () => e621Api.searchPosts({ tags }),
    {
      showErrorToast: true,  // Toast automatico su errore
      staleTime: 5 * 60 * 1000,
    }
  );

  if (isOffline) {
    return <div>Sei offline</div>;
  }

  return (
    <div>
      {error && <button onClick={retry}>Riprova</button>}
      {/* ... */}
    </div>
  );
}
```

### 🎯 Opzioni Avanzate

```tsx
useEnhancedQuery(
  queryKey,
  queryFn,
  {
    showErrorToast: true,              // Mostra toast su errore
    errorMessage: 'Custom error msg',  // Messaggio personalizzato
    successMessage: 'Caricato!',       // Toast su successo
    disableRetry: false,               // Disabilita retry
    staleTime: 5 * 60 * 1000,
    // ... altre opzioni useQuery
  }
);
```

### 🌐 Monitoraggio Rete

```tsx
import { useNetworkStatus } from '@/hooks/useEnhancedQuery';

function MyComponent() {
  const { isOnline, isOffline } = useNetworkStatus();

  return (
    <div>
      {isOffline && (
        <Banner>Sei offline. Alcune funzioni non disponibili.</Banner>
      )}
    </div>
  );
}
```

---

## 4. Gestione Errori API

### ✅ ApiError Class

Classe personalizzata per errori API con info dettagliate:

```tsx
import { ApiError, ErrorCategory } from '@/services/apiErrorHandler';

try {
  await e621Api.searchPosts({ tags });
} catch (error) {
  if (error instanceof ApiError) {
    console.log(error.category);     // ErrorCategory.NETWORK
    console.log(error.userMessage);  // Messaggio user-friendly
    console.log(error.retryable);    // true/false
    console.log(error.retryAfter);   // Secondi da attendere
  }
}
```

### 🎯 Categorie Errori

```tsx
enum ErrorCategory {
  NETWORK = 'NETWORK',       // Problemi di connessione
  AUTH = 'AUTH',             // 401 - Non autenticato
  PERMISSION = 'PERMISSION', // 403 - Non autorizzato
  NOT_FOUND = 'NOT_FOUND',   // 404 - Risorsa non trovata
  RATE_LIMIT = 'RATE_LIMIT', // 429 - Troppe richieste
  SERVER = 'SERVER',         // 500+ - Errore server
  VALIDATION = 'VALIDATION', // 400 - Parametri non validi
  UNKNOWN = 'UNKNOWN',       // Errore sconosciuto
}
```

### 🔄 Wrapper con Retry Automatico

```tsx
import { executeWithRetry } from '@/services/apiErrorHandler';

const data = await executeWithRetry(
  () => e621Api.searchPosts({ tags }),
  {
    maxRetries: 3,
    context: 'Search Posts',
    onRetry: (attempt, error) => {
      console.log(`Retry ${attempt}/3`, error.message);
    }
  }
);
```

### 📊 Logging Errori

```tsx
import { logError } from '@/services/apiErrorHandler';

try {
  await apiCall();
} catch (error) {
  logError(error, 'GalleryPage');
  // Salva in localStorage per debugging
  // In produzione, invia a servizio di tracking
}
```

---

## 5. Best Practices

### ✅ DO's

```tsx
// ✅ Usa useEnhancedQuery per chiamate API
const { data } = useEnhancedQuery(
  queryKeys.posts.list(filters),
  () => e621Api.searchPosts(filters)
);

// ✅ Gestisci errori specifici quando necessario
try {
  await e621Api.addFavorite(postId);
} catch (error) {
  if (error instanceof ApiError && error.category === ErrorCategory.AUTH) {
    // Redirect a login
  }
}

// ✅ Usa query keys factories
queryKeys.posts.list({ tags: 'furry' })

// ✅ Invalida cache dopo mutazioni
queryClient.invalidateQueries({ queryKey: queryKeys.user.favorites() });

// ✅ Prefetch per migliorare UX
queryClient.prefetchQuery({
  queryKey: queryKeys.posts.list({ page: nextPage }),
  queryFn: () => fetchNextPage()
});
```

### ❌ DON'Ts

```tsx
// ❌ Non usare useQuery direttamente senza error handling
const { data } = useQuery(['posts'], fetchPosts); // Manca gestione errori

// ❌ Non creare query keys inconsistenti
['posts', tags] // Usa queryKeys.posts.list({ tags })

// ❌ Non ignorare errori
try {
  await apiCall();
} catch (error) {
  // ... nessuna gestione
}

// ❌ Non fare retry su errori auth
retry: (_, error) => error.status !== 401 // Usa logica di apiErrorHandler
```

### ⚡ Performance Tips

1. **Usa staleTime appropriato** - evita refetch inutili
2. **Abilita structural sharing** - riduce re-render
3. **Prefetch dati prevedibili** - migliora UX
4. **Invalida cache selettivamente** - solo query necessarie
5. **Monitora dimensione cache** - rimuovi dati vecchi

---

## 6. Migrazione Codice Esistente

### 🔄 Prima (useQuery base)

```tsx
const { data, isLoading, error } = useQuery(
  ['posts', tags],
  () => e621Api.searchPosts({ tags }),
  {
    onError: (error) => {
      toast.error('Errore nel caricamento');
    }
  }
);

if (error) {
  return <div>Errore</div>;
}
```

### ✅ Dopo (useEnhancedQuery)

```tsx
const { data, isLoading, isOffline, retry } = useEnhancedQuery(
  queryKeys.posts.list({ tags }),
  () => e621Api.searchPosts({ tags }),
  {
    showErrorToast: true, // Toast automatico
    staleTime: 5 * 60 * 1000,
  }
);

if (isOffline) {
  return <OfflineBanner onRetry={retry} />;
}
```

### 🎯 Vantaggi

- ✅ Meno codice boilerplate
- ✅ Gestione errori consistente
- ✅ Retry automatico intelligente
- ✅ Toast notifications automatiche
- ✅ Monitoraggio rete incluso

---

## 7. Troubleshooting

### 🐛 Problema: App crasha senza messaggi

**Soluzione**: Verifica che ErrorBoundary sia attivo in `App.tsx`

```tsx
// App.tsx deve avere:
<ErrorBoundary maxRetries={3}>
  <QueryClientProvider client={queryClient}>
    {/* ... */}
  </QueryClientProvider>
</ErrorBoundary>
```

### 🐛 Problema: Troppe richieste API

**Soluzione**: Aumenta `staleTime` per quel tipo di query

```tsx
useEnhancedQuery(
  queryKey,
  queryFn,
  {
    staleTime: 10 * 60 * 1000, // 10 minuti invece di 5
  }
);
```

### 🐛 Problema: Cache non si aggiorna dopo mutazione

**Soluzione**: Invalida query dopo mutazione

```tsx
const mutation = useMutation({
  mutationFn: addFavorite,
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.user.favorites(username)
    });
  }
});
```

### 🐛 Problema: Retry infiniti

**Soluzione**: Configura `maxRetries` appropriato

```tsx
useEnhancedQuery(queryKey, queryFn, {
  // Disabilita retry per query specifiche
  disableRetry: true,
  // O limita tentativi
  retry: 2,
});
```

### 🐛 Problema: Memory leak warnings

**Soluzione**: Verifica cleanup nei componenti

```tsx
useEffect(() => {
  const subscription = something.subscribe();
  
  return () => {
    subscription.unsubscribe(); // ✅ Cleanup
  };
}, []);
```

---

## 📚 Risorse Aggiuntive

- [React Query Documentation](https://tanstack.com/query/latest)
- [Error Boundaries in React](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Network Error Handling Best Practices](https://web.dev/robust/)

---

## 🎯 Prossimi Miglioramenti

- [ ] Biometric authentication
- [ ] Offline support con Service Worker
- [ ] Background sync per favoriti
- [ ] Error reporting automatico (Sentry integration)
- [ ] Performance monitoring
- [ ] A/B testing per ottimizzazioni

---

**Ultimo aggiornamento**: 10 Gennaio 2026
**Versione**: 1.0.0
