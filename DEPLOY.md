# Deploying to the Chrome Web Store

The GitHub Action **Publish to Chrome Web Store** runs on every push to `main`. It bumps the version in `manifest.json`, zips only the extension files (no `node_modules`, `test/`, or `gas/`), and uploads using the **Chrome Web Store API v2**.

The previous workflow used a third-party action that called the deprecated **API v1.1**, which now returns **400 Bad Request**. This repo uses the official v2 upload endpoint directly.

---

## 1. One-time: Upload the extension manually (required)

The Chrome Web Store API can only **update** an existing item. It cannot create a new one.

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/).
2. Sign in with the Google account that will own the extension.
3. Click **New item**, upload your extension ZIP (you can run `npm run zip` in this repo to create one), and submit the first version.
4. Complete the **Store listing** and **Privacy** tabs (required before publishing).
5. Note two IDs from the dashboard:
   - **Extension ID**: In the item URL or item details (e.g. `abcdefghijklmnopqrstuvwxyzabcdef`). Use as `CHROME_EXTENSION_ID`.
   - **Publisher ID**: In the **Account** section of the dashboard (not inside a single item). Use as `CHROME_PUBLISHER_ID` for API v2.

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
   - Copy the **Refresh token** (long string; keep it secret). This is what you store as `CHROME_REFRESH_TOKEN`.

Requirements:

- 2-step verification must be enabled on the Google account used for the dashboard and Playground.
- **Refresh tokens can expire or be revoked.** If the workflow fails with `invalid_grant`, regenerate a new refresh token (repeat the Playground steps above) and update the `CHROME_REFRESH_TOKEN` secret in GitHub.

---

## 3. GitHub repository secrets

In your repo: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Add these **five** secrets (names must match exactly):

| Secret name               | Value |
|---------------------------|--------|
| `CHROME_PUBLISHER_ID`     | Publisher ID from the Developer Dashboard **Account** section (required for API v2). |
| `CHROME_EXTENSION_ID`     | The extension ID from the item in the Developer Dashboard. |
| `CHROME_CLIENT_ID`        | OAuth Client ID from Google Cloud Console (step 2). |
| `CHROME_CLIENT_SECRET`    | OAuth Client secret from Google Cloud Console (step 2). |
| `CHROME_REFRESH_TOKEN`    | Refresh token from OAuth Playground (step 2). |

After saving, the next run of the **Publish to Chrome Web Store** workflow (on push to `main`) will use these secrets.

---

## 4. Workflow behavior

- **Upload**: The workflow uploads the new package to the existing store item using API v2 (`publishers/{publisherId}/items/{itemId}:upload`). The version in `manifest.json` is bumped automatically.  
- **Publish**: The workflow **only uploads**; it does not call the publish endpoint. After upload, open the [Developer Dashboard](https://chrome.google.com/webstore/devconsole/), open your item, and click **Submit for review** / **Publish** when you are ready.

---

## 5. Verified CRX uploads (opt-in)

In the Developer Dashboard → **Package** tab you may see an option to **Opt in** to “Verified uploads” and provide a **public key (PEM)**.

- **You do not need to opt in** for the GitHub Action or manual ZIP uploads to work. Without opting in, Google continues to sign your package when you upload a ZIP; the workflow and dashboard behave as before.
- **If you opt in**: Only packages signed with your private key (matching the public key you provided) will be accepted. You must then sign your ZIP/CRX with that key before uploading (e.g. in CI). Losing the private key or opting out later can block updates until Chrome Web Store support assists you.

Recommendation: leave Verified CRX **off** unless you have a clear need and a safe way to generate and store the key pair and sign builds in CI.

---

## 6. If the workflow fails

### "invalid_grant" or "Bad Request" when getting the access token

The refresh token is expired or invalid. Regenerate it at [OAuth 2.0 Playground](https://developers.google.com/oauthplayground) (scope: `https://www.googleapis.com/auth/chromewebstore`, using your own OAuth credentials) and update the **CHROME_REFRESH_TOKEN** secret in **Settings → Secrets and variables → Actions**. Then re-run the workflow.

### Upload fails with HTTP 400 or 403

- Confirm **CHROME_EXTENSION_ID** is the full 32-character ID from the dashboard (no spaces or quotes).
- If using v2: confirm **CHROME_PUBLISHER_ID** is set and matches the **Account** section in the Developer Dashboard.
- Ensure the zip does not include `node_modules`, `test/`, or `gas/` (the workflow excludes them).
- Check [Chrome Web Store API](https://developer.chrome.com/docs/webstore/api) and any errors in [Google Cloud Console](https://console.cloud.google.com) for your project.
