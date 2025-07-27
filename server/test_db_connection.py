#!/usr/bin/env python3
"""
Test script for PostgreSQL connection and configuration
"""

import os
import sys
from pathlib import Path

# Add the app directory to the Python path
sys.path.append(str(Path(__file__).parent))

try:
    import psycopg2
    print("✅ psycopg2 successfully imported")
    print(f"📦 psycopg2 version: {psycopg2.__version__}")
except ImportError as e:
    print(f"❌ Failed to import psycopg2: {e}")
    sys.exit(1)

# Test database configuration
try:
    from app.database import get_database_url, engine
    print("✅ Database configuration imported successfully")
    
    # Show current database URL (without password)
    db_url = get_database_url()
    safe_url = db_url.replace(db_url.split('@')[0].split(':')[-1], '***') if '@' in db_url else db_url
    print(f"🔗 Database URL: {safe_url}")
    
except ImportError as e:
    print(f"❌ Failed to import database configuration: {e}")
    sys.exit(1)

# Test database connection
def test_database_connection():
    """Test database connection"""
    print("\n🔍 Testing database connection...")
    
    try:
        # Try to connect to database
        from sqlalchemy import text
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            print(f"✅ Successfully connected to PostgreSQL!")
            print(f"📊 PostgreSQL version: {version}")
            return True
            
    except Exception as e:
        print(f"❌ Failed to connect to database: {e}")
        print("\n💡 Troubleshooting tips:")
        print("1. Make sure PostgreSQL is running:")
        print("   - Docker: docker-compose up -d db")
        print("   - Local: brew services start postgresql")
        print("2. Check connection parameters in .env file")
        print("3. Verify database credentials")
        return False

# Test table creation
def test_table_creation():
    """Test table creation"""
    print("\n🗄️ Testing table creation...")
    
    try:
        from app.database import create_tables
        create_tables()
        print("✅ Database tables created successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Failed to create tables: {e}")
        return False

def main():
    """Main test function"""
    print("🚀 PostgreSQL Connection Test")
    print("=" * 50)
    
    # Test connection
    if not test_database_connection():
        print("\n❌ Database connection failed. Please check your setup.")
        return False
    
    # Test table creation
    if not test_table_creation():
        print("\n❌ Table creation failed.")
        return False
    
    print("\n🎉 All tests passed! PostgreSQL is ready to use.")
    print("\n📋 Next steps:")
    print("1. Start the FastAPI server: uvicorn app.main:app --reload")
    print("2. Initialize sample data: python app/init_db.py sample")
    print("3. Access the API at: http://localhost:8000")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 