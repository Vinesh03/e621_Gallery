# **e621 Gallery**

e621 Gallery è un client mobile moderno per e621.net, progettato per offrire un'esperienza utente fluida e nativa.  
L'applicazione è stata sviluppata con un approccio vibe-coding, iterando rapidamente per ottenere un'interfaccia reattiva e ricca di funzionalità.  
Grazie a **Ionic Capacitor**, questa web app è stata convertita in un'applicazione Android completa, fornendo prestazioni elevate e un'integrazione perfetta con il dispositivo.

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

## **⚠️ Disclaimer**

Questa applicazione è un client di terze parti e non è affiliata ufficialmente con e621.net.  
L'applicazione permette l'accesso a contenuti che potrebbero essere NSFW (Not Safe For Work) e destinati a un pubblico adulto (+18). L'utente è responsabile dell'utilizzo dell'app in conformità con le leggi locali e i termini di servizio di e621.

## **🛠️ Stack Tecnologico**

Il progetto sfrutta le più recenti tecnologie web e ibride:

* **Framework**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
* **Linguaggio**: [TypeScript](https://www.typescriptlang.org/)
* **Mobile Runtime**: [Ionic Capacitor](https://capacitorjs.com/) (per la build Android)
* **UI/UX**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn-ui](https://ui.shadcn.com/)
* **Metodologia**: Vibe-coding (Sviluppo iterativo assistito da AI)

## **💻 Sviluppo Locale**

Se vuoi contribuire o compilare l'app da solo, segui questi passaggi.

### **Prerequisiti**

* Node.js \& npm
* Android Studio (per la build Android)

### **Installazione**

**```sh**

\# 1. Clona la repository  
git clone <IL\_TUO\_GIT\_URL>  
cd <NOME\_CARTELLA>

\# 2. Installa le dipendenze  
npm install

\# 3. Avvia il server di sviluppo web  
npm run dev

\# 4. Sincronizza con Capacitor (se fai modifiche native)  
npx cap sync

```

### **Build Android**

Per generare l'APK o avviare su emulatore:

```sh

\# Apri il progetto in Android Studio  
npx cap open android

```

*Developed with ❤️ and vibes.*

