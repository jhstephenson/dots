# Dots & Boxes — Cross-Platform Strategy Game

Welcome to **Dots & Boxes**, a gorgeous, responsive, glassmorphic single-page web game. It features both a two-player pass-and-play mode and a single-player mode against an intelligent AI (with Easy, Medium, and Hard difficulties). The game has customizable grid sizes, adaptive scoreboards, early-win checks, custom color themes, and synthesizes its own sound effects using the Web Audio API (requiring zero external asset loading).

The application is structured as a **Progressive Web App (PWA)**, making it offline-ready and trivial to package for the Apple App Store, Google Play Store, and Microsoft Store.

---

## 🚀 Local Play & Development

Since the game uses a Service Worker for PWA functionality, it runs best when served via a local web server (to avoid browser security restrictions on `file://` protocols).

### Quick Start (using Python)
If you have Python installed, run this command in your terminal inside the `dots` folder. You can specify a custom port (such as `8080` or `9000`) if port `8000` is already in use by another application:
```bash
# To run on port 8080:
python -m http.server 8080

# Or to run on port 9000:
python -m http.server 9000
```
Then open the corresponding link in your browser, e.g. [http://localhost:8080](http://localhost:8080).

### Quick Start (using Node.js)
If you have Node/npm installed, you can use `http-server` and specify a custom port using the `-p` flag:
```bash
# To run on port 8080:
npx http-server -p 8080
```
Then open [http://localhost:8080](http://localhost:8080) in your web browser.

---

## 📦 Publishing to App Stores

To publish the game to the major app stores, you wrap this web codebase inside a native container that loads the files locally in a high-performance webview.

### 🍏 1. Apple App Store (iOS)
We recommend using **Ionic Capacitor** to package the app for iOS. It creates a native Xcode project which wraps your web app.

#### Step-by-Step iOS Packaging:
1. **Initialize Node Project** (if not already done):
   Make sure you have a `package.json` in the root. If not, run:
   ```bash
   npm init -y
   ```
2. **Install Capacitor**:
   ```bash
   npm install @capacitor/core @capacitor/cli
   npx cap init "Dots" "com.yourname.dotsgame" --web-dir=.
   ```
3. **Add the iOS Platform**:
   ```bash
   npm install @capacitor/ios
   npx cap add ios
   ```
4. **Copy App Assets**:
   Whenever you make changes to your HTML/CSS/JS, sync them to the Xcode project:
   ```bash
   npx cap copy
   ```
5. **Open Xcode & Compile**:
   This opens your Xcode project. You must run this on a macOS computer.
   ```bash
   npx cap open ios
   ```
   * Inside Xcode, select your target device/simulator, add your Apple Developer provisioning profiles, and build or archive the app for TestFlight/App Store submission.
6. **Icons & Splash Screens**:
   Use `@capacitor/assets` to automatically generate all iOS icons from your `icon.svg`:
   ```bash
   npm install @capacitor/assets --save-dev
   npx capacitor-assets generate --ios
   ```

---

### 🤖 2. Google Play Store (Android)
Capacitor is also the ideal choice for Android, creating a native Android Studio project.

#### Step-by-Step Android Packaging:
1. **Add the Android Platform** (inside your project directory):
   ```bash
   npm install @capacitor/android
   npx cap add android
   ```
2. **Sync Web Files**:
   ```bash
   npx cap sync
   ```
3. **Open Android Studio**:
   ```bash
   npx cap open android
   ```
   * Android Studio will open the project. Let Gradle build and configure the environment.
   * Go to **Build > Generate Signed Bundle / APK** to generate an Android App Bundle (`.aab`) for upload to the Google Play Console.
4. **Icons & Splash Screens**:
   Use `@capacitor/assets` to generate all required Android densities:
   ```bash
   npx capacitor-assets generate --android
   ```

---

### 💻 3. Microsoft Store (Windows)
For the Microsoft Store, **PWABuilder** (created by Microsoft) is the official, easiest, and recommended route.

#### Step-by-Step Windows Packaging:
1. **Deploy your PWA**:
   Upload this project folder to a free hosting provider (e.g., GitHub Pages, Vercel, Netlify, or Firebase Hosting) so that it is accessible via a public HTTPS URL.
2. **Generate Package**:
   * Go to [PWABuilder.com](https://www.pwabuilder.com/).
   * Enter your hosted website URL and click **Start**.
   * PWABuilder will scan your manifest, service worker, and icons (our configuration will score a perfect 100/100).
   * Click **Generate App** and select **Windows**.
3. **Configure & Download**:
   * Enter your Publisher Details (obtained from your Microsoft Partner Center account).
   * Click **Download** to get the generated `.msix` or `.msixbundle` installer packages.
   * Submit this package directly to the Microsoft Partner Center.

---

## 🎨 Asset Generation
Your app includes `icon.svg` as a high-fidelity vector source. To convert it to PNGs for standard manifests or stores, you can open `icon.svg` in any design software (like Figma, Illustrator, Inkscape) or use a free online converter to export:
* **icon-192.png**: $192 \times 192$ pixels (PNG).
* **icon-512.png**: $512 \times 512$ pixels (PNG).
* **icon-1024.png** (App Store icon): $1024 \times 1024$ pixels (PNG).
