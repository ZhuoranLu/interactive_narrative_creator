#!/bin/bash

# Interactive Narrative Creator - PostgreSQL Setup Script
# This script helps you quickly set up PostgreSQL for development

set -e

echo "🚀 Interactive Narrative Creator - PostgreSQL Setup"
echo "=================================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

echo "✅ Docker is available"

# Function to use docker-compose or docker compose
docker_compose_cmd() {
    if command -v docker-compose &> /dev/null; then
        docker-compose "$@"
    else
        docker compose "$@"
    fi
}

# Check if .env file exists, if not create it from example
if [ ! -f "server/.env" ]; then
    echo "📝 Creating .env file from example..."
    cp server/.env.example server/.env
    echo "✅ Created server/.env file. You can modify it if needed."
else
    echo "✅ Found existing server/.env file"
fi

# Start PostgreSQL
echo "🐘 Starting PostgreSQL database..."
docker_compose_cmd up -d db

echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

# Check if PostgreSQL is ready
for i in {1..30}; do
    if docker exec narrative_creator_db pg_isready -U postgres > /dev/null 2>&1; then
        echo "✅ PostgreSQL is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ PostgreSQL failed to start. Check the logs:"
        docker_compose_cmd logs db
        exit 1
    fi
    sleep 2
done

# Install Python dependencies
echo "📦 Installing Python dependencies..."
cd server
pip install -r requirements.txt
cd ..

# Initialize database
echo "🗄️ Initializing database..."
cd server
python app/init_db.py init
cd ..

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Start the FastAPI server:"
echo "     cd server && uvicorn app.main:app --reload"
echo ""
echo "  2. Your PostgreSQL database is running at:"
echo "     Host: localhost"
echo "     Port: 5432"
echo "     Database: narrative_creator"
echo "     Username: postgres"
echo "     Password: password"
echo ""
echo "  3. Optional: Access pgAdmin at http://localhost:8080"
echo "     Start with: docker-compose up -d pgadmin"
echo "     Login: admin@example.com / admin"
echo ""
echo "  4. To stop the database:"
echo "     docker-compose down"
echo ""
echo "  5. To view database logs:"
echo "     docker-compose logs db"
echo ""
echo "Happy coding! 🚀" 