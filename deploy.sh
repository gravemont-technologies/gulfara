#!/bin/bash

# Gulfara Deployment Script
# This script helps you deploy Gulfara to production

echo "🚀 Gulfara Deployment Script"
echo "=============================="

# Check if .env.local exists
if [ ! -f ".env" ]; then
    echo "❌ .env not found!"
    echo "Please create .env with your environment variables:"
    echo ""
    echo "VITE_SUPABASE_URL=your_supabase_url"
    echo "VITE_SUPABASE_ANON_KEY=your_supabase_anon_key"
    echo "VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key"
    echo "VITE_OPENAI_API_KEY=your_openai_api_key"
    echo "VITE_APP_BASE_URL=http://localhost:5173"
    echo ""
    exit 1
fi

echo "✅ .env found"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run build
echo "🔨 Building for production..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed!"
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Set environment variables in Vercel dashboard"
echo "2. Run database schema in Supabase"
echo "3. Seed flashcard data"
echo "4. Test all features"
echo ""
echo "📚 See FINAL_DEPLOYMENT_GUIDE.md for detailed instructions"
