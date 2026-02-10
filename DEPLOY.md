# Deploying to the Chrome Web Store

The GitHub Action **Publish to Chrome Web Store** runs on every push to `main`. It bumps the version in `manifest.json`, zips only the extension files (no `node_modules` or tests), and uploads to the Chrome Web Store.

To avoid **400 Bad Request** from the upload step, do the following one-time setup and ensure your GitHub secrets are set correctly.

---

## 1. One-time: Upload the extension manually (required)

The Chrome Web Store API can only **update** an existing item. It cannot create a new one.

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/).
2. Sign in with the Google account that will own the extension.
3. Click **New item**, upload your extension ZIP (you can run `npm run zip` in this repo to create one), and submit the first version.
4. Complete the **Store listing** and **Privacy** tabs (required before publishing).
5. After the item is created, open it in the dashboard. The **Extension ID** is in the URL or the item details (e.g. `abcdefghijklmnopqrstuvwxyzabcdef`). Copy this; you will use it as `CHROME_EXTENSION_ID`.

---

## 2. One-time: Create OAuth credentials and refresh token

Follow the official guide: [Use the Chrome Web Store API](https://developer.chrome.com/docs/webstore/using_webstore_api).

Summary:

1. **Google Cloud Console**  
   - Create/select a project → enable **Chrome Web Store API**.  
   - **OAuth consent screen**: External, fill app name, support email, developer email, add yourself as test user.  
   - **Credentials** → Create credentials → **OAuth client ID** → Application type: **Web application** → Add redirect URI: `https://developers.google.com/oauthplayground` → Create.  
   - Copy the **Client ID** and **Client secret**.

2. **OAuth 2.0 Playground**  
   - Open [developers.google.com/oauthplayground](https://developers.google.com/oauthplayground).  
   - Click the gear icon → **Use your own OAuth credentials** → enter Client ID and Client secret.  
   - In “Input your own scopes” enter: `https://www.googleapis.com/auth/chromewebstore`  
   - **Authorize APIs** → sign in with the **same Google account** that owns the extension in the Developer Dashboard.  
   - **Exchange authorization code for tokens**.  
   - Copy the **Refresh token** (long string; keep it secret).

Requirements:

- 2-step verification must be enabled on the Google account used for the dashboard and Playground.

---

## 3. GitHub repository secrets

In your repo: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Add these four (names must match exactly):

| Secret name              | Value |
|--------------------------|--------|
| `CHROME_EXTENSION_ID`    | The extension ID from the Developer Dashboard (step 1). |
| `CHROME_CLIENT_ID`       | OAuth Client ID from Google Cloud Console (step 2). |
| `CHROME_CLIENT_SECRET`   | OAuth Client secret from Google Cloud Console (step 2). |
| `CHROME_REFRESH_TOKEN`   | Refresh token from OAuth Playground (step 2). |

After saving, the next run of the **Publish to Chrome Web Store** workflow (on push to `main`) will use these secrets.

---

## 4. Workflow behavior

- **Upload**: The action uploads the new package to the existing store item (version in `manifest.json` is bumped automatically).  
- **Publish**: The workflow is set to `publish: false`, so the new version is **only uploaded**, not published. To publish from the action, set `publish: true` in `.github/workflows/publish.yml` under the upload step, or publish manually from the [Developer Dashboard](https://chrome.google.com/webstore/devconsole/).

---

## 5. If you still get 400 Bad Request

- Confirm the extension was **uploaded at least once manually** and the ID you use is the one from the dashboard.  
- Confirm **CHROME_EXTENSION_ID** is the full ID (no spaces or quotes).  
- Regenerate the **refresh token** (OAuth Playground, same scope, same Google account that owns the extension).  
- Ensure the zip does not include `node_modules` or other non-extension files (the workflow excludes them).  
- Check [Chrome Web Store API status](https://developer.chrome.com/docs/webstore/api) and any quota/errors in [Google Cloud Console](https://console.cloud.google.com) for your project.
