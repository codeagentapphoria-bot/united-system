import { Pool } from 'pg';
import logger from '../utils/logger.js';
import { loadEnvConfig } from '../utils/envLoader.js';

// Load environment variables
loadEnvConfig();

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT || 5432,
  ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false
});

const classificationTypes = [
  {
    name: "Senior Citizen",
    description: "Residents aged 60 and above",
    color: "#FF9800",
    details: [{ key: "remarks", label: "Remarks", type: "text" }],
  },
  {
    name: "Person with Disability",
    description: "Individuals with physical or mental disabilities",
    color: "#E91E63",
    details: [{ key: "type", label: "Type of Disability", type: "text" }, { key: "remarks", label: "Remarks", type: "text" }],
  },
  {
    name: "Pregnant",
    description: "Women who are currently pregnant",
    color: "#9C27B0",
    details: [{ key: "remarks", label: "Remarks", type: "text" }],
  },
  {
    name: "Indigenous Person",
    description: "Members of indigenous communities",
    color: "#795548",
    details: [{ key: "remarks", label: "Remarks", type: "text" }],
  },
  {
    name: "Solo Parent",
    description: "Single parents raising children alone",
    color: "#607D8B",
    details: [{ key: "remarks", label: "Remarks", type: "text" }],
  },
  {
    name: "Overseas Filipino Worker",
    description: "Filipinos working abroad",
    color: "#3F51B5",
    details: [{ key: "remarks", label: "Remarks", type: "text" }],
  },
  {
    name: "Student",
    description: "Students enrolled in educational institutions",
    color: "#2196F3",
    details: [{ key: "educationLevel", label: "Education Level", type: "text" }, { key: "gradeLevel", label: "Grade Level", type: "text" }, { key: "remarks", label: "Remarks", type: "text" }],
  },
  {
    name: "Unemployed",
    description: "Individuals currently without employment",
    color: "#F44336",
    details: [{ key: "remarks", label: "Remarks", type: "text" }],
  },
  {
    name: "Farmer",
    description: "Individuals engaged in farming activities",
    color: "#4CAF50",
    details: [{ key: "status", label: "Status", type: "select", options: ["Land Owner", "Rental"] }, { key: "type", label: "Type of Farmer", type: "text" }, { key: "remarks", label: "Remarks", type: "text" }],
  },
  {
    name: "Fisherman",
    description: "Individuals engaged in fishing activities",
    color: "#00BCD4",
    details: [{ key: "status", label: "Status", type: "select", options: ["Boat Owner", "Passenger", "Rental"] }, { key: "type", label: "Type of Fisherfolk", type: "text" }, { key: "remarks", label: "Remarks", type: "text" }],
  },
  {
    name: "Business Owner",
    description: "Individuals who own and operate businesses",
    color: "#FF5722",
    details: [{ key: "type", label: "Type of Business", type: "text" }, { key: "permit", label: "Business Permit", type: "text" }, { key: "remarks", label: "Remarks", type: "text" }],
  },
  {
    name: "Government Employee",
    description: "Individuals working in government agencies",
    color: "#009688",
    details: [{ key: "remarks", label: "Remarks", type: "text" }],
  },
  {
    name: "Private Employee",
    description: "Individuals working in private companies",
    color: "#FF9800",
    details: [{ key: "remarks", label: "Remarks", type: "text" }],
  },
  {
    name: "Self Employed",
    description: "Individuals working for themselves",
    color: "#4CAF50",
    details: [{ key: "remarks", label: "Remarks", type: "text" }],
  },
  {
    name: "Retired",
    description: "Individuals who have retired from work",
    color: "#607D8B",
    details: [{ key: "remarks", label: "Remarks", type: "text" }],
  },
  {
    name: "Housewife",
    description: "Women who manage household duties",
    color: "#E91E63",
    details: [{ key: "remarks", label: "Remarks", type: "text" }],
  },
];

const seedClassificationTypes = async () => {
  const client = await pool.connect();
  try {
    console.log('Starting to seed classification types...');
    
    // Get all municipalities
    const { rows: municipalities } = await client.query('SELECT id FROM municipalities');
    
    if (municipalities.length === 0) {
      console.log('No municipalities found. Please create municipalities first.');
      return;
    }
    
    console.log(`Found ${municipalities.length} municipalities. Seeding classification types...`);
    
    for (const municipality of municipalities) {
      console.log(`Seeding for municipality ID: ${municipality.id}`);
      
      for (const classificationType of classificationTypes) {
        try {
          // Check if classification type already exists for this municipality
          const { rows: existing } = await client.query(
            'SELECT id FROM classification_types WHERE municipality_id = $1 AND name = $2',
            [municipality.id, classificationType.name]
          );
          
          if (existing.length === 0) {
            // Insert new classification type
            await client.query(`
              INSERT INTO classification_types(
                municipality_id,
                name,
                description,
                color,
                details
              ) VALUES ($1, $2, $3, $4, $5)
            `, [
              municipality.id,
              classificationType.name,
              classificationType.description,
              classificationType.color,
              JSON.stringify(classificationType.details)
            ]);
            
            console.log(`✓ Created: ${classificationType.name}`);
          } else {
            console.log(`- Skipped: ${classificationType.name} (already exists)`);
          }
        } catch (error) {
          console.error(`✗ Error creating ${classificationType.name}:`, error.message);
        }
      }
    }
    
    console.log('Classification types seeding completed!');
    
    // Show summary
    const { rows: totalCount } = await client.query('SELECT COUNT(*) as count FROM classification_types');
    console.log(`Total classification types in database: ${totalCount[0].count}`);
    
  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    client.release();
    await pool.end();
  }
};

// Run the function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedClassificationTypes()
    .then(() => {
      console.log('Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

export default seedClassificationTypes;
