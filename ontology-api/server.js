const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "cxgn",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
};

const dbPool = new Pool(dbConfig);

app.get("/api/health", async (req, res) => {
  try {
    await dbPool.query("SELECT 1");
    res.json({
      status: "API is running",
      database: "connected",
    });
  } catch (err) {
    res.status(503).json({
      status: "API is running",
      database: "disconnected",
      error: err.message,
    });
  }
});

// Test endpoint to verify database connection and data availability
app.get("/api/test", async (req, res) => {
  try {
    // Test 1: Database connection
    const connectionTest = await dbPool.query(
      "SELECT NOW() as current_time, version() as pg_version",
    );

    // Test 2: Count ontologies (CVs)
    const cvCount = await dbPool.query("SELECT COUNT(*) as count FROM cv");

    // Test 3: Count total terms
    const termCount = await dbPool.query(
      "SELECT COUNT(*) as count FROM cvterm WHERE is_obsolete = 0",
    );

    // Test 4: Count relationships
    const relCount = await dbPool.query(
      "SELECT COUNT(*) as count FROM cvterm_relationship",
    );

    // Test 5: Get sample ontologies
    const sampleCvs = await dbPool.query(`
      SELECT cv_id, name, definition 
      FROM cv 
      ORDER BY name 
      LIMIT 5
    `);

    // Test 6: Get sample terms from first CV
    let sampleTerms = [];
    if (sampleCvs.rows.length > 0) {
      const firstCvId = sampleCvs.rows[0].cv_id;
      const termsResult = await dbPool.query(
        `
        SELECT cvterm_id, name, definition
        FROM cvterm
        WHERE cv_id = $1 AND is_obsolete = 0
        ORDER BY name
        LIMIT 5
      `,
        [firstCvId],
      );
      sampleTerms = termsResult.rows;
    }

    res.json({
      success: true,
      database: {
        connected: true,
        currentTime: connectionTest.rows[0].current_time,
        postgresVersion: connectionTest.rows[0].pg_version.split(",")[0], // First line only
        config: {
          host: dbConfig.host,
          port: dbConfig.port,
          database: dbConfig.database,
          user: dbConfig.user,
        },
      },
      data: {
        totalOntologies: parseInt(cvCount.rows[0].count),
        totalTerms: parseInt(termCount.rows[0].count),
        totalRelationships: parseInt(relCount.rows[0].count),
        sampleOntologies: sampleCvs.rows,
        sampleTerms: sampleTerms,
      },
      endpoints: {
        health: "/api/health",
        ontologies: "/api/ontologies",
        hierarchy: "/api/ontologies/:cv_id/hierarchy",
        test: "/api/test",
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      database: {
        connected: false,
        config: {
          host: dbConfig.host,
          port: dbConfig.port,
          database: dbConfig.database,
          user: dbConfig.user,
        },
      },
      troubleshooting: [
        "Check if breedbase_db container is running: docker ps | grep breedbase_db",
        "Verify database credentials in .env file",
        "Check if database is accessible: psql -h localhost -U postgres -d cxgn",
        "Ensure database host/port are correct for your setup",
      ],
    });
  }
});

const { parseMainClasses, parseSubclassHierarchy } = require("./oboParser");

function readOboFile() {
  const oboPath = path.join(__dirname, "blueberry.obo");
  return fs.readFileSync(oboPath, "utf-8");
}

app.get("/api/ontology/load", (req, res) => {
  try {
    const content = readOboFile();
    const classes = parseMainClasses(content);

    res.json({
      success: true,
      classes,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: `Failed to load ontology: ${err.message}`,
    });
  }
});

app.get("/api/ontology/classes/:className/subclasses", (req, res) => {
  try {
    const { className } = req.params;
    const content = readOboFile();
    const tree = parseSubclassHierarchy(content, className);

    if (!tree) {
      return res.status(400).json({
        success: false,
        error: `Invalid class. Must be one of: Method, Scale, Trait, Variable`,
      });
    }

    res.json({
      success: true,
      class: className,
      subclasses: tree.subclasses,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: `Failed to fetch subclasses: ${err.message}`,
    });
  }
});

app.get("/api/ontologies", async (req, res) => {
  try {
    const result = await dbPool.query(`
      SELECT cv_id, name, definition
      FROM cv
      ORDER BY name
    `);

    const ontologies = result.rows.map((row) => ({
      cv_id: row.cv_id,
      name: row.name,
      definition: row.definition || "",
    }));
    res.json(ontologies);
  } catch (err) {
    res.status(500).json({
      error: `Failed to fetch ontologies: ${err.message}`,
      hint: "Make sure Breedbase database (breedbase_db) is running and accessible",
    });
  }
});

app.get("/api/ontologies/:cv_id/hierarchy", async (req, res) => {
  try {
    const { cv_id } = req.params;
    const termsQuery = await dbPool.query(
      `
      SELECT cvterm_id, name, definition
      FROM cvterm
      WHERE cv_id = $1
        AND is_obsolete = 0
      ORDER BY name
    `,
      [cv_id],
    );

    const relationshipsQuery = await dbPool.query(
      `
      SELECT 
        cr.subject_id,
        cr.object_id,
        t.name as relationship_type
      FROM cvterm_relationship cr
      JOIN cvterm t ON cr.type_id = t.cvterm_id
      WHERE cr.subject_id IN (
        SELECT cvterm_id FROM cvterm WHERE cv_id = $1
      )
      ORDER BY cr.subject_id
    `,
      [cv_id],
    );

    const terms = termsQuery.rows.map((row) => ({
      cvterm_id: row.cvterm_id,
      name: row.name,
      definition: row.definition || "",
    }));

    const relationships = relationshipsQuery.rows.map((row) => ({
      subject_id: row.subject_id,
      object_id: row.object_id,
      relationship_type: row.relationship_type || "related_to",
    }));
    res.json({
      terms,
      relationships,
    });
  } catch (err) {
    res.status(500).json({
      error: `Failed to fetch hierarchy: ${err.message}`,
      cv_id,
      hint: "Make sure cv_id is valid and Breedbase database is accessible",
    });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
  console.log(
    `Connecting to Breedbase database at ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`,
  );
});
