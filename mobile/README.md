# Milkshop SaaS — Mobile App

A React Native (Expo) Android app for shop owners and employees: POS/selling, customers & debt,
daily delivery list, and reports. It talks to the same backend API as the web dashboard.

## 1. Install prerequisites (one-time, on your computer)

1. Install [Node.js LTS](https://nodejs.org/) (includes `npm`).
2. Install the Expo CLI (no global install needed — we use `npx`).
3. Install the **Expo Go** app on your Android phone from the Play Store (for quick testing).

## 2. Configure the API URL

Open `src/config.js` and set `API_BASE_URL` to point at your backend:

- Android emulator + backend running on your PC: `http://10.0.2.2:8000/api/v1`
- Real phone on the same Wi-Fi as your PC: `http://<your-pc-LAN-IP>:8000/api/v1`
- Deployed backend: `https://api.yourdomain.com/api/v1`

## 3. Install dependencies and run

```
cd mobile
npm install
npx expo start
```

This prints a QR code. Scan it with the **Expo Go** app on your Android phone (same Wi-Fi network)
to run the app instantly — no build needed for development.

## 4. Building a real Android app (APK / AAB) for testing or Play Store

We use **EAS Build** (Expo's free cloud build service):

```
npm install -g eas-cli
eas login
eas build:configure
```

- For a test APK you can install directly on a phone:
  ```
  eas build --platform android --profile preview
  ```
  When it finishes, EAS gives you a download link for the `.apk` file. Transfer it to your phone
  and open it to install (you may need to allow "install from unknown sources").

- For the Play Store release (AAB bundle):
  ```
  eas build --platform android --profile production
  ```

## 5. Publishing to the Google Play Store (step by step)

1. **Create a Google Play Console account**: go to https://play.google.com/console, sign in with
   a Google account, and pay the one-time $25 registration fee.
2. **Create a new app**: in the Play Console, click "Create app", fill in the app name
   ("Milkshop SaaS"), default language, and select "App" + "Free" (or "Paid").
3. **Fill in the Store listing**: short/full description, screenshots (you can take these from
   Expo Go or an emulator), app icon, and feature graphic.
4. **Complete the required sections** under "Policy" → "App content": privacy policy URL,
   ads declaration, content rating questionnaire, target audience, data safety form.
5. **Upload your build**: go to "Production" (or "Internal testing" first, recommended), click
   "Create new release", and upload the `.aab` file produced by `eas build --profile production`.
6. **Review and roll out**: fill in release notes, save, and click "Review release" then
   "Start rollout to Production" (or "Internal testing" while you're still testing).
7. Google reviews new apps — this can take from a few hours to a few days. Once approved, the
   app appears on the Play Store.

**Tip**: Start with "Internal testing" — you and a few testers can install the app via a private
link almost immediately, without waiting for full review. Move to "Production" once you're happy.

## App identity

The Android package name is set in `app.json` as `com.milkshopsaas.app`. Change this **before**
your first build if you want a different package id — it cannot be changed after publishing.
