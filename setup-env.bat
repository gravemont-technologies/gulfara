@echo off
echo Setting up Gulfara Environment Variables...
echo.

REM Copy template to `.env` only (single env file for local development)
copy env.template .env
echo ✅ Created .env file from template
echo.

echo 📝 Please edit .env with your actual values (this single .env holds both public and server-only keys for local dev):
echo    - NEXT_PUBLIC_FIREBASE_*: Replace placeholders with Firebase project values
echo    - VITE_CLERK_PUBLISHABLE_KEY: Set your Clerk publishable credential
echo    - VITE_APP_BASE_URL: Use http://localhost:5200 for local development
echo    - FIREBASE_ADMIN_*: Copy your Firebase service account info
echo    - CLERK_JWKS_URL: Ensure the JWKS URL is configured
echo    - OPENAI_API_KEY / OPENAI_USER_MONTHLY_CAP: Provide your OpenAI secret
echo.

echo 🚀 For production deployment:
echo    - Update VITE_APP_BASE_URL to your Vercel URL
echo    - Set environment variables in Vercel Dashboard
echo.

pause
