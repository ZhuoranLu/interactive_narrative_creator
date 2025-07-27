#!/usr/bin/env python3
"""
Database Migration Script: Add Story Edit History Table

This script adds the story_edit_history table to support undo functionality
for story editing operations.

Usage:
    python create_history_table_migration.py

Make sure to run this from the server directory and that your database
configuration is properly set up in app/database.py
"""

import sys
import os

# Add the server directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'server'))

from sqlalchemy import create_engine, text
from app.database import DATABASE_URL, Base, StoryEditHistory
from app.database import get_db

def create_history_table():
    """Create the story_edit_history table if it doesn't exist"""
    
    print("🔧 Starting database migration: Adding story_edit_history table...")
    
    try:
        # Create engine
        engine = create_engine(DATABASE_URL)
        
        # Check if table already exists (PostgreSQL compatible)
        with engine.connect() as conn:
            # Use PostgreSQL syntax to check if table exists
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'story_edit_history'
                );
            """))
            
            exists = result.fetchone()[0]
            if exists:
                print("✅ Table 'story_edit_history' already exists. Migration skipped.")
                return True
        
        # Create the table
        StoryEditHistory.__table__.create(engine, checkfirst=True)
        
        print("✅ Successfully created 'story_edit_history' table!")
        print("📋 Table schema:")
        print("   - id (String, Primary Key)")
        print("   - project_id (String, Foreign Key to narrative_projects)")
        print("   - user_id (String, Foreign Key to users)")
        print("   - snapshot_data (JSON)")
        print("   - operation_type (String)")
        print("   - operation_description (String)")
        print("   - affected_node_id (String, Optional)")
        print("   - created_at (DateTime)")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        return False

def verify_migration():
    """Verify that the migration was successful"""
    
    print("\n🔍 Verifying migration...")
    
    try:
        engine = create_engine(DATABASE_URL)
        
        with engine.connect() as conn:
            # Check table exists (PostgreSQL compatible)
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'story_edit_history'
                );
            """))
            
            exists = result.fetchone()[0]
            if not exists:
                print("❌ Verification failed: Table not found")
                return False
            
            # Check table structure (PostgreSQL compatible)
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'story_edit_history'
                ORDER BY ordinal_position;
            """))
            columns = result.fetchall()
            
            expected_columns = [
                'id', 'project_id', 'user_id', 'snapshot_data',
                'operation_type', 'operation_description', 
                'affected_node_id', 'created_at'
            ]
            
            actual_columns = [col[0] for col in columns]  # col[0] is column name
            
            for expected in expected_columns:
                if expected not in actual_columns:
                    print(f"❌ Verification failed: Missing column '{expected}'")
                    return False
            
            print("✅ Migration verification successful!")
            print(f"📊 Table has {len(actual_columns)} columns: {', '.join(actual_columns)}")
            
            return True
            
    except Exception as e:
        print(f"❌ Verification error: {e}")
        return False

def main():
    """Main migration function"""
    
    print("=" * 60)
    print("📚 Story Edit History Migration")
    print("=" * 60)
    
    # Perform migration
    migration_success = create_history_table()
    
    if not migration_success:
        print("\n❌ Migration failed. Please check the error messages above.")
        sys.exit(1)
    
    # Verify migration
    verification_success = verify_migration()
    
    if not verification_success:
        print("\n❌ Migration verification failed.")
        sys.exit(1)
    
    print("\n" + "=" * 60)
    print("🎉 Migration completed successfully!")
    print("=" * 60)
    print("✨ Your database now supports story edit history and undo operations!")
    print("🔄 Users can now rollback up to 5 previous edits per project.")
    print("\n📖 Next steps:")
    print("   1. Restart your FastAPI server")
    print("   2. Test the new history functionality in the React frontend")
    print("   3. Check that snapshots are being created during edit operations")

if __name__ == "__main__":
    main() 