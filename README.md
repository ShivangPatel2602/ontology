# Setup Instructions for Ontology Visualizer

## Prerequisites
- Docker Desktop installed
- Running local instance of Breedbase
    - [Setting up local instance of breedbase](https://github.com/solgenomics/breedbase_dockerfile)

## Step 01: Clone the Repository
```bash
git clone https://github.com/ShivangPatel2602/ontology.git
cd ontology
```

## Step 02: Configure Environment Variables
- Create ontology/ontology-api/.env
```.env
DB_HOST=breedbase_db
DB_PORT=5432
DB_NAME=breedbase
DB_USER=postgres
DB_PASSWORD=postgres
```
- Create ontology/ontology-visualizer/.env
```.env
VITE_API_URL=/api
```

## Step 03: Build and Start Services
```bash
# Build Docker images
docker compose build
# Start all services
docker compose up -d
```

# Step 04: Verify endpoint API is running
```bash
curl http://localhost:5001/api/ontologies
```
Access the ontology visualizer at this URL: http://localhost:3000

# Stopping services
```bash
docker compose down
```