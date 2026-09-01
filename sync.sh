#!/bin/bash

# 1. Fetch the latest updates from GitHub
echo "Fetching latest updates from origin..."
git fetch origin

# 2. Merge origin/main into the current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "Merging origin/main into $CURRENT_BRANCH..."
git merge origin/main

# 3. Laravel Sync (The "Health Check")
if [ $? -eq 0 ]; then
    echo "Git merge successful. Updating Laravel environment..."
    
    # Install any new dependencies
    composer install
    
    # Update the database (fixes 'no such column' errors)
    php artisan migrate
    
    # Clear old cache
    php artisan optimize:clear
    
    echo "✅ Project is up to date and ready!"
else
    echo "❌ Merge conflicts detected. Please resolve them manually before running migrations."
fi