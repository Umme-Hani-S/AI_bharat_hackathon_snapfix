# Google Maps API Setup Guide

## How to Get a Google Maps API Key

### Step 1: Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Click on the project dropdown at the top
4. Click **"New Project"**
5. Enter a project name (e.g., "SnapFix Maps")
6. Click **"Create"**

### Step 2: Enable Required APIs
1. In the Google Cloud Console, go to **"APIs & Services" > "Library"**
2. Search for and enable these APIs:
   - **Maps Embed API** (for embedding maps)
   - **Maps JavaScript API** (for interactive maps - optional)
   - **Geocoding API** (for address to coordinates conversion - optional)
   - **Places API** (for place search - optional)

### Step 3: Create API Key
1. Go to **"APIs & Services" > "Credentials"**
2. Click **"Create Credentials" > "API Key"**
3. Copy your API key (it will look like: `AIzaSy...`)

### Step 4: Restrict API Key (Recommended for Security)
1. Click on your newly created API key to edit it
2. Under **"API restrictions"**, select **"Restrict key"**
3. Select only the APIs you need:
   - Maps Embed API
   - Maps JavaScript API (if using)
   - Geocoding API (if using)
   - Places API (if using)
4. Under **"Application restrictions"**, you can:
   - **HTTP referrers (web sites)**: Add your domain (e.g., `localhost:3000/*`, `yourdomain.com/*`)
   - Or leave it unrestricted for development
5. Click **"Save"**

### Step 5: Add API Key to Your Project
1. Create a `.env` file in the `frontend` folder (if it doesn't exist)
2. Add your API key:
   ```
   VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```
3. **Important**: Never commit the `.env` file to git! It should be in `.gitignore`

### Step 6: Restart Your Development Server
After adding the API key, restart your Vite dev server:
```bash
npm run dev
```

## Pricing Information
- Google Maps Embed API: **Free** (unlimited requests)
- Maps JavaScript API: **Free tier**: $200 credit/month (covers ~28,000 map loads)
- Geocoding API: **Free tier**: $200 credit/month (covers ~40,000 requests)
- Places API: **Free tier**: $200 credit/month

For most small to medium applications, the free tier is sufficient.

## Troubleshooting
- **"This page can't load Google Maps correctly"**: Check that your API key is correct and the Maps Embed API is enabled
- **API key not working**: Make sure you've enabled the required APIs in Google Cloud Console
- **CORS errors**: Add your domain to the HTTP referrers in API key restrictions

## Security Best Practices
1. **Always restrict your API key** to specific APIs and domains
2. **Never expose your API key** in client-side code that's publicly accessible
3. **Use environment variables** to store API keys
4. **Monitor usage** in Google Cloud Console to detect unauthorized use
5. **Set up billing alerts** to avoid unexpected charges

