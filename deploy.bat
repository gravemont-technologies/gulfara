@echo off
REM Gulfara Deployment Script for Windows
REM This script helps you deploy Gulfara to production

echo 🚀 Gulfara Deployment Script
echo ==============================

REM Check if .env.local exists
if not exist ".env" (
    echo ❌ .env not found!
    echo Please create .env with your environment variables:
    echo.
    echo VITE_SUPABASE_URL=your_supabase_url
    echo VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    echo VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
    echo VITE_OPENAI_API_KEY=your_openai_api_key
    echo VITE_APP_BASE_URL=http://localhost:5173
    echo.
    pause
    exit /b 1
)

echo ✅ .env found

REM Install dependencies
echo 📦 Installing dependencies...
call npm install

REM Run build
echo 🔨 Building for production...
call npm run build

if %errorlevel% neq 0 (
    echo ❌ Build failed!
    pause
    exit /b 1
)

echo ✅ Build successful!

REM Check if Vercel CLI is installed
where vercel >nul 2>nul
if %errorlevel% neq 0 (
    echo 📦 Installing Vercel CLI...
    call npm install -g vercel
)

REM Deploy to Vercel
echo 🚀 Deploying to Vercel...
call vercel --prod

echo.
echo 🎉 Deployment complete!
echo.
echo Next steps:
echo 1. Set environment variables in Vercel dashboard
echo 2. Run database schema in Supabase
echo 3. Seed flashcard data
echo 4. Test all features
echo.
echo 📚 See FINAL_DEPLOYMENT_GUIDE.md for detailed instructions
pause
