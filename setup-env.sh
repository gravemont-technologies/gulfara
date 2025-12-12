#!/bin/bash
echo "Setting up Gulfara Environment Variables..."
echo

# Copy template to `.env` only (we use a single env file for all secrets locally)
cp env.template .env
echo "✅ Created .env file from template"
echo

echo "📝 Please edit .env with your actual values (this single .env holds both public and server-only keys for local dev):"
echo "   - NEXT_PUBLIC_FIREBASE_*: replace placeholders with your Firebase project values"
echo "   - VITE_CLERK_PUBLISHABLE_KEY: set your Clerk publishable credential"
echo "   - VITE_APP_BASE_URL: use http://localhost:5200 for local development"
echo "   - FIREBASE_ADMIN_*: copy the service account info from your Firebase project"
echo "   - CLERK_JWKS_URL: ensure Clerk JWKS URL is configured"
echo "   - OPENAI_API_KEY / OPENAI_USER_MONTHLY_CAP: use your OpenAI secret"
echo

echo "🚀 For production deployment:"
echo "   - Update VITE_APP_BASE_URL to your Vercel URL"
echo "   - Set environment variables in Vercel Dashboard"
echo

read -p "Press Enter to continue..."
