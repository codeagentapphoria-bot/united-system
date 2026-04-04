import express from "express";
import { allUsers } from "../middlewares/auth.js";
import { pool } from "../config/db.js";
import { smartCache } from "../middlewares/smartCache.js";

const router = express.Router();

// Public endpoints (no authentication required)
router.get("/public/geojson/city", smartCache(), async (req, res) => {
  try {
    const query = `
      SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', jsonb_agg(
          jsonb_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(geom)::jsonb,
            'properties', jsonb_build_object(
              'id', id,
              'name', name,
              'area', shape_sqkm
            )
          )
  )
      ) AS geojson
      FROM gis_borongan;
    `;
    const result = await pool.query(query);
    res.json(result.rows[0].geojson);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Public endpoint to fetch barangay GeoJSON data with polygons
router.get("/public/geojson/barangays/:id", async (req, res) => {
  try {
    const targetId = req.params.id; // Get the barangay ID from URL
    const type = req.query.type; // 'municipality' or 'barangay' to distinguish the request type
    const simplified = req.query.simplified === 'true'; // For simplified geometry (faster loading)

    if (!targetId) {
      return res.status(400).json({ error: "No target_id provided" });
    }

    // If targetId is 'all', fetch all barangay boundaries from gis_barangay
    if (targetId === "all") {
      const query = `
        SELECT jsonb_build_object(
          'type', 'FeatureCollection',
          'features', jsonb_agg(
            jsonb_build_object(
              'type', 'Feature',
              'geometry', ST_AsGeoJSON(geom)::jsonb,
              'properties', jsonb_build_object(
                'gis_code', gis_barangay_code,
                'name', name,
                'area', shape_sqkm
              )
            )
          )
        ) AS geojson
        FROM gis_barangay;
      `;

      const result = await pool.query(query);

      if (
        !result.rows[0].geojson.features ||
        result.rows[0].geojson.features.length === 0
      ) {
        return res.status(404).json({
          error: "No barangays found with coordinates",
        });
      }

      return res.json(result.rows[0].geojson);
    }

    // Handle based on type parameter or auto-detect
    if (type === 'barangay' || (!type && !isNaN(targetId))) {
      // Treat as barangay ID or GIS code - show only this specific barangay
      console.log("Public: Treating as barangay ID/GIS code:", targetId);
      
      // Determine if targetId is a barangay ID (numeric) or GIS code (string)
      const isNumericId = !isNaN(targetId);
      
      // Get the specific barangay's GIS code and boundary
      const geometryField = simplified ? 'ST_Simplify(gb.geom, 0.001)' : 'gb.geom';
      const query = isNumericId ? `
        SELECT jsonb_build_object(
          'type', 'FeatureCollection',
          'features', jsonb_agg(
            jsonb_build_object(
              'type', 'Feature',
              'geometry', ST_AsGeoJSON(${geometryField})::jsonb,
              'properties', jsonb_build_object(
                'id', b.id,
                'name', b.barangay_name,
                'code', b.barangay_code,
                'contact', b.contact_number,
                'email', b.email,
                'gis_code', gb.gis_barangay_code,
                'gis_name', gb.name,
                'area_type', 'barangay',
                'area', gb.shape_sqkm
              )
            )
          )
        ) AS geojson
        FROM barangays b
        JOIN gis_barangay gb ON b.gis_code = gb.gis_barangay_code
        WHERE b.id = $1 AND b.gis_code IS NOT NULL;
      ` : `
        SELECT jsonb_build_object(
          'type', 'FeatureCollection',
          'features', jsonb_agg(
            jsonb_build_object(
              'type', 'Feature',
              'geometry', ST_AsGeoJSON(${geometryField})::jsonb,
              'properties', jsonb_build_object(
                'id', COALESCE(b.id, NULL),
                'name', COALESCE(b.barangay_name, gb.name),
                'code', COALESCE(b.barangay_code, NULL),
                'contact', COALESCE(b.contact_number, NULL),
                'email', COALESCE(b.email, NULL),
                'gis_code', gb.gis_barangay_code,
                'gis_name', gb.name,
                'area_type', 'barangay',
                'area', gb.shape_sqkm
              )
            )
          )
        ) AS geojson
        FROM gis_barangay gb
        LEFT JOIN barangays b ON b.gis_code = gb.gis_barangay_code
        WHERE gb.gis_barangay_code = $1;
      `;

      const result = await pool.query(query, [targetId]);
      console.log("Public: Found", result.rows[0].geojson.features?.length || 0, "barangay boundaries for", isNumericId ? "barangay ID" : "GIS code", targetId);

      if (
        !result.rows[0].geojson.features ||
        result.rows[0].geojson.features.length === 0
      ) {
        return res.status(404).json({
          error: "No barangays found for this ID/GIS code",
        });
      }

      return res.json(result.rows[0].geojson);
    } else {
      // Treat as municipality - show all barangays in the municipality
      console.log("Public: Treating as municipality code/ID:", targetId);
      
      // Try to find municipality by code first, then by ID as fallback
      let municipalityQuery = `
        SELECT m.municipality_name, m.municipality_code, gm.gis_municipality_code
        FROM municipalities m
        LEFT JOIN gis_municipality gm ON m.gis_code = gm.gis_municipality_code
        WHERE m.municipality_code = $1;
      `;
      
      let municipalityResult = await pool.query(municipalityQuery, [targetId]);
      
      // If not found by code and targetId is numeric, try by ID
      if (municipalityResult.rows.length === 0 && !isNaN(targetId)) {
        console.log("Public: Municipality not found by code, trying by ID:", targetId);
        municipalityQuery = `
          SELECT m.municipality_name, m.municipality_code, gm.gis_municipality_code
          FROM municipalities m
          LEFT JOIN gis_municipality gm ON m.gis_code = gm.gis_municipality_code
          WHERE m.id = $1;
        `;
        municipalityResult = await pool.query(municipalityQuery, [targetId]);
      }
      
            if (municipalityResult.rows.length === 0) {
        return res.status(404).json({
          error: "Municipality not found",
        });
      }
      
      // Municipality found, get all barangays for this municipality
      const municipality = municipalityResult.rows[0];
      const municipalityGisCode = municipality?.gis_municipality_code || 'PH0802604';
      const gisCodePrefix = municipalityGisCode.substring(0, 9); // Get the municipality prefix
      
      console.log("Public: Found municipality:", municipality.municipality_name, "with code:", municipality.municipality_code);
      console.log("Public: Fetching barangays for municipality with GIS prefix:", gisCodePrefix);
      
      // Get all barangays that belong to this municipality
      const query = `
        SELECT jsonb_build_object(
          'type', 'FeatureCollection',
          'features', jsonb_agg(
            jsonb_build_object(
              'type', 'Feature',
              'geometry', ST_AsGeoJSON(gb.geom)::jsonb,
              'properties', jsonb_build_object(
                'id', COALESCE(b.id, NULL),
                'name', COALESCE(b.barangay_name, gb.name),
                'code', COALESCE(b.barangay_code, NULL),
                'contact', COALESCE(b.contact_number, NULL),
                'email', COALESCE(b.email, NULL),
                'gis_code', gb.gis_barangay_code,
                'gis_name', gb.name,
                'area_type', 'barangay',
                'area', gb.shape_sqkm
              )
            )
          )
        ) AS geojson
        FROM gis_barangay gb
        LEFT JOIN barangays b ON b.gis_code = gb.gis_barangay_code
        WHERE gb.gis_barangay_code LIKE $1 || '%';
      `;
      
      const result = await pool.query(query, [gisCodePrefix]);
      console.log("Public: Found", result.rows[0].geojson.features?.length || 0, "barangays for municipality", municipality.municipality_name);

      if (
        !result.rows[0].geojson.features ||
        result.rows[0].geojson.features.length === 0
      ) {
        return res.status(404).json({
          error: "No barangays found for this municipality",
        });
      }

      return res.json(result.rows[0].geojson);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Endpoint to fetch GeoJSON - for municipality users, show barangays for their municipality
router.get("/geojson/city", ...allUsers, async (req, res) => {
  try {
    // Get the municipality ID from the user's target_id
    const municipalityId = req.user?.target_id;
    
    if (!municipalityId) {
      return res.status(400).json({ error: "Municipality ID not found" });
    }

    // First, get the municipality's GIS code to filter barangays
    const municipalityQuery = `
      SELECT m.municipality_name, m.municipality_code, gm.gis_municipality_code
      FROM municipalities m
      LEFT JOIN gis_municipality gm ON m.gis_code = gm.gis_municipality_code
      WHERE m.id = $1;
    `;
    
    const municipalityResult = await pool.query(municipalityQuery, [municipalityId]);
    const municipalityGisCode = municipalityResult.rows[0]?.gis_municipality_code || 'PH0802604';
    const gisCodePrefix = municipalityGisCode.substring(0, 9); // Get the municipality prefix
    
    // Get barangays that belong to this municipality
    const query = `
      SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', jsonb_agg(
          jsonb_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(gb.geom)::jsonb,
            'properties', jsonb_build_object(
              'id', COALESCE(b.id, NULL),
              'name', COALESCE(b.barangay_name, gb.name),
              'code', COALESCE(b.barangay_code, NULL),
              'contact', COALESCE(b.contact_number, NULL),
              'email', COALESCE(b.email, NULL),
              'gis_code', gb.gis_barangay_code,
              'gis_name', gb.name,
              'area_type', 'barangay',
              'area', gb.shape_sqkm
            )
          )
        )
      ) AS geojson
      FROM gis_barangay gb
      LEFT JOIN barangays b ON b.gis_code = gb.gis_barangay_code
      WHERE gb.gis_barangay_code LIKE $1 || '%';
    `;
    const result = await pool.query(query, [gisCodePrefix]);
    res.json(result.rows[0].geojson);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Endpoint to fetch barangay GeoJSON data with polygons
router.get("/geojson/barangays/:id", ...allUsers, async (req, res) => {
  try {
    const targetId = req.params.id; // Get the barangay ID from URL
    const type = req.query.type; // 'municipality' or 'barangay' to distinguish the request type
    const simplified = req.query.simplified === 'true'; // For simplified geometry (faster loading)

    if (!targetId) {
      return res.status(400).json({ error: "No target_id provided" });
    }

    // If targetId is 'all', fetch all barangay boundaries from gis_barangay
    if (targetId === "all") {
      const query = `
        SELECT jsonb_build_object(
          'type', 'FeatureCollection',
          'features', jsonb_agg(
            jsonb_build_object(
              'type', 'Feature',
              'geometry', ST_AsGeoJSON(geom)::jsonb,
              'properties', jsonb_build_object(
                'gis_code', gis_barangay_code,
                'name', name,
                'area', shape_sqkm
              )
            )
          )
        ) AS geojson
        FROM gis_barangay;
      `;

      const result = await pool.query(query);

      if (
        !result.rows[0].geojson.features ||
        result.rows[0].geojson.features.length === 0
      ) {
        return res.status(404).json({
          error: "No barangays found with coordinates",
        });
      }

      return res.json(result.rows[0].geojson);
    }

    // Handle based on type parameter or auto-detect
    if (type === 'barangay' || (!type && !isNaN(targetId))) {
      // Treat as barangay ID - show only this specific barangay
      console.log("Treating as barangay ID:", targetId);
      
      // Get the specific barangay's GIS code and boundary
      const query = `
        SELECT jsonb_build_object(
          'type', 'FeatureCollection',
          'features', jsonb_agg(
            jsonb_build_object(
              'type', 'Feature',
              'geometry', ST_AsGeoJSON(gb.geom)::jsonb,
              'properties', jsonb_build_object(
                'id', b.id,
                'name', b.barangay_name,
                'code', b.barangay_code,
                'contact', b.contact_number,
                'email', b.email,
                'gis_code', gb.gis_barangay_code,
                'gis_name', gb.name,
                'area_type', 'barangay',
                'area', gb.shape_sqkm
              )
            )
          )
        ) AS geojson
        FROM barangays b
        JOIN gis_barangay gb ON b.gis_code = gb.gis_barangay_code
        WHERE b.id = $1 AND b.gis_code IS NOT NULL;
      `;

      const result = await pool.query(query, [targetId]);
      console.log("Found", result.rows[0].geojson.features?.length || 0, "barangay boundaries for barangay ID", targetId);

      if (
        !result.rows[0].geojson.features ||
        result.rows[0].geojson.features.length === 0
      ) {
        return res.status(404).json({
          error: "No barangays found for this ID",
        });
      }

      return res.json(result.rows[0].geojson);
    } else {
      // Treat as municipality - show all barangays in the municipality
      console.log("Treating as municipality code/ID:", targetId);
      
      // Try to find municipality by code first, then by ID as fallback
      let municipalityQuery = `
        SELECT m.municipality_name, m.municipality_code, gm.gis_municipality_code
        FROM municipalities m
        LEFT JOIN gis_municipality gm ON m.gis_code = gm.gis_municipality_code
        WHERE m.municipality_code = $1;
      `;
      
      let municipalityResult = await pool.query(municipalityQuery, [targetId]);
      
      // If not found by code and targetId is numeric, try by ID
      if (municipalityResult.rows.length === 0 && !isNaN(targetId)) {
        console.log("Municipality not found by code, trying by ID:", targetId);
        municipalityQuery = `
          SELECT m.municipality_name, m.municipality_code, gm.gis_municipality_code
          FROM municipalities m
          LEFT JOIN gis_municipality gm ON m.gis_code = gm.gis_municipality_code
          WHERE m.id = $1;
        `;
        municipalityResult = await pool.query(municipalityQuery, [targetId]);
      }
      
      if (municipalityResult.rows.length === 0) {
        return res.status(404).json({
          error: "Municipality not found",
        });
      }
      
      // Municipality found, get all barangays for this municipality
      const municipality = municipalityResult.rows[0];
      const municipalityGisCode = municipality?.gis_municipality_code || 'PH0802604';
      const gisCodePrefix = municipalityGisCode.substring(0, 9); // Get the municipality prefix
      
      console.log("Found municipality:", municipality.municipality_name, "with code:", municipality.municipality_code);
      console.log("Fetching barangays for municipality with GIS prefix:", gisCodePrefix);
      
      // Get all barangays that belong to this municipality
      const query = `
        SELECT jsonb_build_object(
          'type', 'FeatureCollection',
          'features', jsonb_agg(
            jsonb_build_object(
              'type', 'Feature',
              'geometry', ST_AsGeoJSON(gb.geom)::jsonb,
              'properties', jsonb_build_object(
                'id', COALESCE(b.id, NULL),
                'name', COALESCE(b.barangay_name, gb.name),
                'code', COALESCE(b.barangay_code, NULL),
                'contact', COALESCE(b.contact_number, NULL),
                'email', COALESCE(b.email, NULL),
                'gis_code', gb.gis_barangay_code,
                'gis_name', gb.name,
                'area_type', 'barangay',
                'area', gb.shape_sqkm
              )
            )
          )
        ) AS geojson
        FROM gis_barangay gb
        LEFT JOIN barangays b ON b.gis_code = gb.gis_barangay_code
        WHERE gb.gis_barangay_code LIKE $1 || '%';
      `;
      
      const result = await pool.query(query, [gisCodePrefix]);
      console.log("Found", result.rows[0].geojson.features?.length || 0, "barangays for municipality", municipality.municipality_name);

      if (
        !result.rows[0].geojson.features ||
        result.rows[0].geojson.features.length === 0
      ) {
        return res.status(404).json({
          error: "No barangays found for this municipality",
        });
      }

      return res.json(result.rows[0].geojson);
    }

    // Handle non-numeric targetId (should not happen in normal usage)
    return res.status(400).json({
      error: "Invalid target ID format",
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Public endpoint to fetch all barangays for a municipality
router.get("/public/geojson/barangays", async (req, res) => {
  try {
    const query = `
      SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', jsonb_agg(
          jsonb_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(gb.geom)::jsonb,
            'properties', jsonb_build_object(
              'id', b.id,
              'name', b.barangay_name,
              'code', b.barangay_code,
              'contact', b.contact_number,
              'email', b.email,
              'gis_code', b.gis_code,
              'gis_name', gb.name,
              'municipality_id', b.municipality_id,
              'area', gb.shape_sqkm
            )
          )
        )
      ) AS geojson
      FROM barangays b
      JOIN gis_barangay gb ON b.gis_code = gb.gis_barangay_code
      WHERE b.gis_code IS NOT NULL;
    `;

    const result = await pool.query(query);

    if (
      !result.rows[0].geojson.features ||
      result.rows[0].geojson.features.length === 0
    ) {
      return res.status(404).json({
        error: "No barangays found with GIS codes",
      });
    }

    res.json(result.rows[0].geojson);
  } catch (err) {
    console.error("Error fetching all barangays GeoJSON:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Endpoint to fetch municipalities GeoJSON data
router.get("/geojson/municipalities", ...allUsers, async (req, res) => {
  try {
    const query = `
      SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', jsonb_agg(
          jsonb_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(geom)::jsonb,
            'properties', jsonb_build_object(
              'gis_municipality_code', gis_municipality_code,
              'name', name,
              'area', shape_sqkm
            )
          )
        )
      ) AS geojson
      FROM gis_municipality;
    `;

    const result = await pool.query(query);

    if (
      !result.rows[0].geojson.features ||
      result.rows[0].geojson.features.length === 0
    ) {
      return res.status(404).json({
        error: "No municipalities found with GIS data",
      });
    }

    res.json(result.rows[0].geojson);
  } catch (err) {
    console.error("Error fetching municipalities GeoJSON:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Public endpoint to fetch municipalities GeoJSON data
router.get("/public/geojson/municipalities", smartCache(), async (req, res) => {
  try {
    const query = `
      SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', jsonb_agg(
          jsonb_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(geom)::jsonb,
            'properties', jsonb_build_object(
              'gis_municipality_code', gis_municipality_code,
              'name', name,
              'area', shape_sqkm
            )
          )
        )
      ) AS geojson
      FROM gis_municipality;
    `;

    const result = await pool.query(query);

    if (
      !result.rows[0].geojson.features ||
      result.rows[0].geojson.features.length === 0
    ) {
      return res.status(404).json({
        error: "No municipalities found with GIS data",
      });
    }

    res.json(result.rows[0].geojson);
  } catch (err) {
    console.error("Error fetching municipalities GeoJSON:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
