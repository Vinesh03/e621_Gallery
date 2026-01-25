# **e621 Gallery**

e621 Gallery è un client mobile moderno per e621.net, progettato per offrire un'esperienza utente fluida e nativa.  
L'applicazione è stata sviluppata con un approccio vibe-coding, iterando rapidamente per ottenere un'interfaccia reattiva e ricca di funzionalità.  
Grazie a **Ionic Capacitor**, questa web app è stata convertita in un'applicazione Android completa, fornendo prestazioni elevate e un'integrazione perfetta con il dispositivo.

## **🚀 Novità - Affidabilità e Performance**

L'app è stata significativamente migliorata con focus su **affidabilità** e **prestazioni**:

### **🛡️ Prevenzione Crash**
- **ErrorBoundary Globale**: Cattura e gestisce errori React automaticamente
- **Retry Automatico**: Fino a 3 tentativi con exponential backoff per errori di rete
- **Recovery Intelligente**: L'app si ripristina automaticamente da errori temporanei
- **Logging Avanzato**: Traccia errori per debugging e miglioramenti futuri

### **⚡ Caching Ottimizzato**
- **Smart Caching**: I post rimangono in cache per 5-10 minuti, riducendo caricamenti inutili
- **Prefetching**: Carica in anticipo contenuti per navigazione fluida
- **Gestione Offline**: Continua a funzionare con dati cached anche offline
- **Memory Management**: Ottimizzazione automatica dell'uso della memoria

### **🔄 Gestione Errori Avanzata**
- **Categorizzazione Intelligente**: Distingue tra errori di rete, auth, server
- **Toast Notifications**: Messaggi user-friendly per ogni tipo di errore
- **Rate Limit Handling**: Rispetta automaticamente i limiti dell'API
- **Connection Monitoring**: Rileva e notifica problemi di connessione

📖 **[Guida Completa ai Miglioramenti](./docs/IMPROVEMENTS.md)**

---

## **📥 Download**

Trovi il file APK firmato direttamente in questa repository (o nella sezione Releases).  
Scarica e installa il file .apk sul tuo dispositivo Android per iniziare a navigare.

## **✨ Funzionalità Principali**

### **🎬 Modalità Shorts**

Un modo completamente nuovo di esplorare i video su e621.

* **Scroll Infinito**: Scorri i video verticalmente in stile TikTok/Reels.
* **Contestuale**: Se cerchi un tag (es. animated), gli shorts mostreranno video pertinenti. Se non cerchi nulla, ti mostrerà gli ultimi video caricati.

### **🔍 Ricerca Potente e Intelligente**

* **Autocompletamento Tag**: Mentre digiti, l'app suggerisce i tag corretti completi di conteggio post (predizione dei tag), evitando errori di battitura.
* **Sintassi Avanzata**: Supporto completo per la sintassi di e621 (es. usa -tag per escludere risultati, user:nome per cercare utenti specifici).
* **Ricerche Salvate**: Salva le tue combinazioni di tag preferite per accederervi con un solo tocco, senza doverle digitare ogni volta.

### **👤 Accesso e Account**

* **Modalità Ospite**: Non è obbligatorio registrarsi o fare il login. Puoi utilizzare l'applicazione liberamente come ospite per navigare e cercare contenuti.
* **Login via API Key**: Se desideri accedere alle funzionalità avanzate, puoi farlo utilizzando il tuo Username e la tua API Key di e621 (niente password, per la massima sicurezza).
* **Interazioni Complete (per utenti loggati)**:

  * Gestione Preferiti (Aggiungi/Rimuovi).
  * Voto (Like/Dislike/Unvote).
  * Gestione Blacklist.

### **📱 Esperienza Utente**

* **Design Mobile-First**: Costruita su misura per l'uso con una mano.
* **UI Moderna**: Interfaccia pulita basata su componenti shadcn-ui.
* **Virtual Scrolling**: Gestione ottimizzata di liste lunghe per performance fluide.
* **Progressive Loading**: Carica immagini progressivamente per esperienza rapida.

## **⚠️ Disclaimer**

Questa applicazione è un client di terze parti e non è affiliata ufficialmente con e621.net.  
L'applicazione permette l'accesso a contenuti che potrebbero essere NSFW (Not Safe For Work) e destinati a un pubblico adulto (+18). L'utente è responsabile dell'utilizzo dell'app in conformità con le leggi locali e i termini di servizio di e621.

## **🛠️ Stack Tecnologico**

Il progetto sfrutta le più recenti tecnologie web e ibride:

* **Framework**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
* **Linguaggio**: [TypeScript](https://www.typescriptlang.org/)
* **Mobile Runtime**: [Ionic Capacitor](https://capacitorjs.com/) (per la build Android)
* **UI/UX**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn-ui](https://ui.shadcn.com/)
* **State Management**: [Zustand](https://zustand-demo.pmnd.rs/) + [React Query](https://tanstack.com/query/latest)
* **Metodologia**: Vibe-coding (Sviluppo iterativo assistito da AI)

## **💻 Sviluppo Locale**

Se vuoi contribuire o compilare l'app da solo, segui questi passaggi.

### **Prerequisiti**

* Node.js & npm
* Android Studio (per la build Android)

### **Installazione**

```sh
# 1. Clona la repository  
git clone https://github.com/Vinesh03/e621_Gallery.git
cd e621_Gallery

# 2. Installa le dipendenze  
npm install

# 3. Avvia il server di sviluppo web  
npm run dev

# 4. Sincronizza con Capacitor (se fai modifiche native)  
npx cap sync
```

### **Build Android**

Per generare l'APK o avviare su emulatore:

```sh
# Apri il progetto in Android Studio  
npx cap open android
```

### **Testing**

```sh
# Lint del codice
npm run lint

# Build di produzione
npm run build

# Preview build
npm run preview
```

## **👥 Contribuire**

I contributi sono benvenuti! Sentiti libero di:

1. Fare fork del progetto
2. Creare un branch per la tua feature (`git checkout -b feature/AmazingFeature`)
3. Committare le modifiche (`git commit -m 'Add some AmazingFeature'`)
4. Pushare sul branch (`git push origin feature/AmazingFeature`)
5. Aprire una Pull Request

### **Linee Guida**

- Mantieni il codice pulito e ben documentato
- Segui le convenzioni TypeScript esistenti
- Testa le modifiche su dispositivi Android reali quando possibile
- Consulta la [Guida ai Miglioramenti](./docs/IMPROVEMENTS.md) per best practices

## **📝 Documentazione**

- **[Guida Completa ai Miglioramenti](./docs/IMPROVEMENTS.md)** - Error handling, caching, performance
- **[React Query Best Practices](./docs/IMPROVEMENTS.md#2-react-query-ottimizzato)**
- **[API Error Handling](./docs/IMPROVEMENTS.md#4-gestione-errori-api)**

## **🔗 Link Utili**

- [e621 API Documentation](https://e621.net/wiki_pages/2425)
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [React Query Documentation](https://tanstack.com/query/latest)

---

*Developed with ❤️ and vibes.*

**Versione**: 1.1.0 | **Ultimo aggiornamento**: Gennaio 2026
