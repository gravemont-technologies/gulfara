# 🔧 Gulfara Environment Setup Guide

## 📋 Quick Setup Checklist

-### ✅ Files Created:
- ✅ `.env` - Consolidated environment file (PUBLIC + PRIVATE for local dev)
- ✅ `env.template` - Template for easy setup
- ✅ `setup-env.bat` - Windows setup script
- ✅ `setup-env.sh` - macOS/Linux setup script

## 🚀 Environment Variables Overview

### Single environment file (`.env`) — PUBLIC + PRIVATE (Local only)
```env
# Consolidated single `.env` file for local development.
# This file contains both browser-safe `NEXT_PUBLIC_`/`VITE_` vars and server-only secrets.
# Keep `.env` in `.gitignore` and do not commit it.

# Supabase (Public + Private)
VITE_SUPABASE_URL=https://your-instance.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Firebase (Public / client)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_USE_FIREBASE=true
NEXT_PUBLIC_DUAL_WRITE_MODE=false

# Firebase Admin (Private - server-only)
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk@your_project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"

# Clerk (Public)
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# OpenAI (Private)
OPENAI_API_KEY=your_openai_api_key

# Application
VITE_APP_BASE_URL=http://localhost:5173
```

### Notes about single `.env`

- Use the single `.env` for local development only. It must remain gitignored.
- For production, set each private environment variable in your deployment provider (Vercel, Firebase) rather than committing a file.

## 🎯 How to Get Missing Values

### 1. Supabase Anon Key
1. Go to [supabase.com](https://supabase.com)
2. Open your project dashboard
3. Go to **Settings** → **API**
4. Copy the **anon public** key
5. Replace `your_supabase_anon_key_here` in `.env`

### 2. For Production Deployment
1. **Vercel URL**: After deploying to Vercel, update:
   ```env
   VITE_APP_BASE_URL=https://your-app-name.vercel.app
   ```

2. **Environment Variables in Vercel**:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add all variables from `.env` (production secrets should be set in your deployment provider)

## 🏃‍♂️ Quick Start Commands

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Setup
```bash
# Windows
.\setup-env.bat

# macOS/Linux
chmod +x setup-env.sh
./setup-env.sh
```

## 🔄 Development vs Production

### Development (.env)
```env
VITE_APP_BASE_URL=http://localhost:5173
```

### Production (Vercel)
```env
VITE_APP_BASE_URL=https://gulfara.vercel.app
```

## 🛡️ Security Notes

- ✅ **VITE_ prefixed variables** are safe for frontend
 - ❌ **Never expose** private (server-only) variables to the frontend in production
 - 🔒 **`.env`** used for local development may contain private keys; in production set secrets in your provider
 - 🌐 **NEXT_PUBLIC_** variables remain safe for browser usage

## 📁 File Structure
```
gulfara/
├── .env                 # Frontend variables (PUBLIC)
├── .env                 # Consolidated local env (PUBLIC + PRIVATE for local dev)
├── env.template         # Template for setup
├── setup-env.bat        # Windows setup script
├── setup-env.sh         # macOS/Linux setup script
└── ENVIRONMENT_SETUP.md # This guide
```

## 🚨 Troubleshooting

### Common Issues:
1. **Missing .env file**: Run `copy env.template .env`
2. **Build errors**: Check all VITE_ variables are set
3. **Authentication issues**: Verify Clerk keys are correct
4. **Database errors**: Check Supabase URL and keys

### Verification:
```bash
# Check if .env exists
dir .env

# Check environment variables are loaded
npm run dev
```

## 🎉 Ready to Go!

Your environment is now set up for both local development and production deployment. Just update the missing values in `.env` and you're ready to start coding!
