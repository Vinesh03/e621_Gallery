# **e621 Gallery**

e621 Gallery is a modern mobile client for e621.net, designed to provide a smooth and native-like browsing experience.  
The application was developed using a vibe-coding approach, iterating rapidly to achieve a responsive interface packed with features.  
Leveraging **Ionic Capacitor**, this web app has been compiled into a fully functional Android application, ensuring high performance and seamless device integration.

## **📥 Download**

You can find the signed APK directly in this repository (check the Releases section).  
Download and install the .apk file on your Android device to start browsing.

## **✨ Key Features**

### **🎬 Shorts Mode**

A brand-new way to explore video content on e621.

* **Infinite Scroll**: Swipe through videos vertically, TikTok/Reels style.
* **Context-Aware**: If you search for a tag (e.g., animated), the shorts will show relevant videos. If no search is active, it displays the latest uploads.

### **🔍 Powerful \& Smart Search**

* **Tag Autocomplete**: As you type, the app suggests correct tags along with their post counts (tag prediction), preventing typos.
* **Advanced Syntax**: Full support for e621 search syntax (e.g., use -tag to exclude results, user:name to find specific users).
* **Saved Searches**: Save your favorite tag combinations for one-tap access, eliminating the need to re-type them every time.

### **👤 Access \& Account Management**

* **Guest Mode**: No registration or login required. You can use the app freely as a guest to browse and search for content.
* **API Key Login**: For advanced features, log in using your Username and e621 API Key (no password required, ensuring maximum security).
* **Full Interactions (for logged-in users)**:

  * Manage Favorites (Add/Remove).
  * Voting (Like/Dislike/Unvote).
  * Blacklist Management.

### **📱 User Experience**

* **Mobile-First Design**: Tailor-made for one-handed use.
* **Modern UI**: Clean and elegant interface built with shadcn-ui components.

## **⚠️ Disclaimer**

This application is a third-party client and is not officially affiliated with e621.net.  
The app provides access to content that may be NSFW (Not Safe For Work) and is intended for an adult audience (18+). The user is responsible for using the app in compliance with local laws and e621's terms of service.

## **🛠️ Tech Stack**

The project leverages the latest web and hybrid technologies:

* **Framework**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
* **Language**: [TypeScript](https://www.typescriptlang.org/)
* **Mobile Runtime**: [Ionic Capacitor](https://capacitorjs.com/) (for the Android build)
* **UI/UX**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn-ui](https://ui.shadcn.com/)
* **Methodology**: Vibe-coding (AI-assisted iterative development)

## **💻 Local Development**

If you wish to contribute or build the app from source, follow these steps.

### **Prerequisites**

* Node.js \& npm
* Android Studio (for the Android build)

### **Installation**

```sh
# 1. Clone the repository  
git clone https://github.com/Vinesh03/e621_Gallery-android-companion-app.git 
cd e621_Gallery-android-companion-app

# 2. Install dependencies  
npm install

# 3. Start the web development server  
npm run dev

# 4. Sync with Capacitor (for native changes)  
npx cap sync
```

### **Android Build**

To generate the APK or run on an emulator:

```sh
# Open the project in Android Studio  
npx cap open android
```

*Developed with ❤️ and vibes.*

