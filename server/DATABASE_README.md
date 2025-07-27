# Interactive Narrative Creator - Database Setup

This document explains how to set up and use PostgreSQL database for data storage and loading in the Interactive Narrative Creator.

## Features

- **PostgreSQL Database**: Robust, production-ready relational database
- **SQLAlchemy ORM**: Type-safe database operations with Python objects
- **Comprehensive Schema**: Supports all narrative elements (projects, nodes, events, actions, world state)
- **Repository Pattern**: Clean separation between business logic and data access
- **Auto-migrations**: Database tables are created automatically on startup
- **Connection Pooling**: Optimized for production workloads

## Database Setup

### Option 1: Using Docker (Recommended for Development)

1. **Start PostgreSQL with Docker Compose**:
   ```bash
   # From project root directory
   docker-compose up -d db
   ```

2. **Optional: Start pgAdmin for database management**:
   ```bash
   docker-compose up -d pgadmin
   ```
   - Access pgAdmin at: http://localhost:8080
   - Login: admin@example.com / admin
   - Add server with host: `db`, port: `5432`, user: `postgres`, password: `password`

### Option 2: Local PostgreSQL Installation

1. **Install PostgreSQL**:
   ```bash
   # macOS with Homebrew
   brew install postgresql
   brew services start postgresql
   
   # Ubuntu/Debian
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   sudo systemctl start postgresql
   
   # Windows
   # Download from https://www.postgresql.org/download/windows/
   ```

2. **Create Database and User**:
   ```bash
   # Connect to PostgreSQL
   sudo -u postgres psql
   
   # Create database and user
   CREATE DATABASE narrative_creator;
   CREATE USER narrative_user WITH ENCRYPTED PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE narrative_creator TO narrative_user;
   \q
   ```

### Configuration

1. **Environment Variables**:
   Copy the example environment file and modify it:
   ```bash
   cp server/.env.example server/.env
   ```

2. **Configure Database Connection**:
   Edit `server/.env` file:
   ```env
   # Option A: Complete DATABASE_URL (recommended)
   DATABASE_URL=postgresql://postgres:password@localhost:5432/narrative_creator
   
   # Option B: Individual variables
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=your_password
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_DB=narrative_creator
   ```

## Database Schema

### Core Tables

1. **narrative_projects**: Main project/story container
   - `id`, `title`, `description`, `world_setting`, `characters`, `style`
   - `start_node_id`, `metadata`, `created_at`, `updated_at`

2. **narrative_nodes**: Story nodes/scenes
   - `id`, `project_id`, `scene`, `node_type`, `level`, `parent_node_id`
   - `metadata`, `created_at`, `updated_at`

3. **narrative_events**: Events within nodes (dialogue, narration)
   - `id`, `node_id`, `speaker`, `content`, `description`, `timestamp`
   - `event_type`, `metadata`, `created_at`

4. **actions**: Player actions
   - `id`, `event_id`, `description`, `is_key_action`, `metadata`

5. **action_bindings**: Links actions to their targets
   - `id`, `action_id`, `source_node_id`, `target_node_id`, `target_event_id`

6. **world_states**: Current game state
   - `id`, `project_id`, `current_node_id`, `state_data`, `created_at`, `updated_at`

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
pip install -r requirements.txt
```

### 2. Initialize Database

Run the initialization script:

```bash
cd server
python app/init_db.py
```

Choose option:
- **1**: Initialize database (create tables)
- **2**: Create sample data (for testing)
- **3**: Reset database (WARNING: deletes all data)

Or use command line:

```bash
# Initialize database tables
python app/init_db.py init

# Create sample data
python app/init_db.py sample

# Reset database (deletes all data)
python app/init_db.py reset
```

### 3. Start the Server

```bash
cd server
uvicorn app.main:app --reload
```

The database will be automatically initialized on startup if it doesn't exist.

## API Endpoints

### Project Management

- `POST /projects` - Create a new narrative project
- `GET /projects` - Get all projects
- `GET /projects/{project_id}` - Get specific project
- `DELETE /projects/{project_id}` - Delete a project

### Data Persistence

- `POST /save_graph` - Save narrative graph to database
- `GET /load_graph/{project_id}` - Load narrative graph from database

### Example Usage

```bash
# Create a new project
curl -X POST "http://localhost:8000/projects" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Interactive Story",
    "description": "An exciting adventure",
    "world_setting": "Fantasy realm",
    "characters": ["Hero", "Villain", "Guide"],
    "style": "Epic fantasy"
  }'

# Get all projects
curl "http://localhost:8000/projects"

# Save a narrative graph
curl -X POST "http://localhost:8000/save_graph" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "your-project-id",
    "graph_data": {
      "title": "Updated Story",
      "nodes": {...}
    },
    "world_state": {
      "current_node_id": "node-id",
      "player_data": {...}
    }
  }'

# Load a narrative graph
curl "http://localhost:8000/load_graph/your-project-id"
```

## Database Configuration

### Environment Variables

- `DATABASE_URL`: Complete database connection string (recommended)
- `POSTGRES_USER`: Database username (default: postgres)
- `POSTGRES_PASSWORD`: Database password
- `POSTGRES_HOST`: Database host (default: localhost)
- `POSTGRES_PORT`: Database port (default: 5432)
- `POSTGRES_DB`: Database name (default: narrative_creator)
- `DEBUG`: Enable SQL query logging (default: False)

### Connection Examples

```bash
# PostgreSQL (default)
export DATABASE_URL="postgresql://postgres:password@localhost:5432/narrative_creator"

# PostgreSQL with SSL
export DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# For Docker development
export POSTGRES_HOST="localhost"  # or "db" when using docker-compose

# For production with connection pooling
export DATABASE_URL="postgresql://user:password@host:5432/dbname?pool_size=20&max_overflow=30"
```

## Migration from SQLite

If you have existing SQLite data, you can migrate it to PostgreSQL:

1. **Export SQLite data**:
   ```bash
   sqlite3 narrative_creator.db .dump > data_export.sql
   ```

2. **Clean up SQL for PostgreSQL**:
   - Remove SQLite-specific syntax
   - Adjust data types if needed
   - Handle UUID generation differences

3. **Import to PostgreSQL**:
   ```bash
   psql -U postgres -d narrative_creator < cleaned_data.sql
   ```

## Production Deployment

### Recommended Settings

```env
# Production database URL with connection pooling
DATABASE_URL=postgresql://user:password@host:5432/narrative_creator?pool_size=20&max_overflow=30

# Security
DEBUG=false

# Performance
POSTGRES_SHARED_BUFFERS=256MB
POSTGRES_EFFECTIVE_CACHE_SIZE=1GB
```

### Backup Strategy

```bash
# Create backup
pg_dump -U postgres -h localhost narrative_creator > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
psql -U postgres -h localhost narrative_creator < backup_file.sql
```

## Development Tips

### Performance Optimization

1. **Indexes**: Add indexes for frequently queried columns
2. **Connection Pooling**: Use the built-in SQLAlchemy connection pooling
3. **Query Optimization**: Use SQLAlchemy's lazy loading and eager loading appropriately
4. **Monitoring**: Enable query logging in development with `DEBUG=true`

### Troubleshooting

- **Connection Issues**: Check PostgreSQL service status and firewall settings
- **Permission Errors**: Ensure user has proper permissions on database and tables
- **Pool Exhaustion**: Adjust `pool_size` and `max_overflow` settings
- **SSL Issues**: Add `?sslmode=disable` to DATABASE_URL for local development

## Monitoring and Maintenance

### Health Checks

The application includes automatic database health checks and connection recovery.

### Query Performance

Enable query logging for development:
```env
DEBUG=true
```

This will log all SQL queries to help with performance optimization. 