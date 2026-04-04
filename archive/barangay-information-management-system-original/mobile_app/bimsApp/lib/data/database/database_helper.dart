import 'dart:io';
import 'dart:convert';
import 'dart:typed_data';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class DatabaseHelper {
  static final DatabaseHelper _instance = DatabaseHelper._internal();
  static Database? _database;
  
  factory DatabaseHelper() => _instance;
  DatabaseHelper._internal();
  
  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    await _configureDatabase(_database!);
    
    // CRITICAL: Check and protect household data integrity
    await _ensureHouseholdDataIntegrity();
    
    return _database!;
  }

  // Method to force database reinitialization (useful for testing migrations)
  Future<void> reinitializeDatabase() async {
    if (_database != null) {
      await _database!.close();
      _database = null;
    }
    _database = await _initDatabase();
    await _configureDatabase(_database!);
  }

  // Configure database after opening
  Future<void> _configureDatabase(Database db) async {
    try {
      // Enable foreign key constraints
      await db.execute('PRAGMA foreign_keys = ON');
      
      // Ensure all required columns exist (fix for schema mismatches)
      await _ensurePuroksColumnsExist(db);
    } catch (e) {
      // If PRAGMA statements fail, continue without them
      print('Warning: Could not enable foreign key constraints: $e');
    }
  }

  /// CRITICAL: Ensure household data integrity is maintained
  Future<void> _ensureHouseholdDataIntegrity() async {
    try {
      final db = await database;
      
      // Check if households table exists
      final tableInfo = await db.rawQuery("PRAGMA table_info(households)");
      if (tableInfo.isEmpty) {
        print('🚨 CRITICAL: Households table does not exist! Recreating...');
        await _recreateHouseholdsTable();
        return;
      }
      
      // Check household count
      final householdCount = await db.rawQuery('SELECT COUNT(*) as count FROM households');
      final count = householdCount.first['count'] as int;
      print('🛡️ HOUSEHOLD PROTECTION: Found $count households in database');
      
      if (count == 0) {
        print('⚠️ WARNING: No households found in database!');
        print('   This might indicate data loss during database operations.');
        print('   Checking for potential causes...');
        
        // Check if this is a fresh database
        final residentCount = await db.rawQuery('SELECT COUNT(*) as count FROM residents');
        final residentCountValue = residentCount.first['count'] as int;
        
        if (residentCountValue > 0) {
          print('🚨 CRITICAL: Residents exist but households are missing!');
          print('   This indicates household data was lost while resident data was preserved.');
          print('   This is a serious data integrity issue.');
          
          // DISABLED: Automatic recovery to prevent data corruption
          // Recovery should only be triggered manually via debug tools
          print('ℹ️ HOUSEHOLD PROTECTION: Automatic recovery disabled to prevent data corruption');
          print('   Use manual recovery tools if households are legitimately missing');
        } else {
          print('ℹ️ INFO: No residents or households found - this appears to be a fresh database');
        }
      } else {
        print('✅ HOUSEHOLD PROTECTION: Household data integrity verified');
      }
      
    } catch (e) {
      print('❌ HOUSEHOLD PROTECTION: Error checking household data integrity: $e');
    }
  }


  /// Recreate households table if it's missing
  Future<void> _recreateHouseholdsTable() async {
    try {
      final db = await database;
      
      print('🔄 RECREATING HOUSEHOLDS TABLE...');
      
      await db.execute('''
        CREATE TABLE IF NOT EXISTS households (
          id INTEGER PRIMARY KEY,
          barangay_id INTEGER NOT NULL,
          house_number TEXT NOT NULL,
          house_head_id TEXT NOT NULL,
          purok_id INTEGER NOT NULL,
          latitude REAL,
          longitude REAL,
          address TEXT,
          sync_status TEXT DEFAULT 'pending',
          server_id TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (barangay_id) REFERENCES barangays (id) ON DELETE CASCADE,
          FOREIGN KEY (purok_id) REFERENCES puroks (id) ON DELETE CASCADE
        )
      ''');
      
      // Create indexes
      await db.execute('CREATE INDEX IF NOT EXISTS idx_households_barangay ON households(barangay_id)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_households_purok ON households(purok_id)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_households_sync ON households(sync_status)');
      
      print('✅ HOUSEHOLDS TABLE RECREATED SUCCESSFULLY');
      
    } catch (e) {
      print('❌ ERROR: Failed to recreate households table: $e');
    }
  }
  
  Future<Database> _initDatabase() async {
    String path = join(await getDatabasesPath(), 'bims_local.db');
    print('🔄 DATABASE INIT: Initializing database at: $path');
    print('🔄 DATABASE INIT: Version: 10');
    
    return await openDatabase(
      path,
      version: 10, // Current version
      onCreate: _onCreate,
      onUpgrade: _onUpgrade,
    );
  }
  
  Future<void> _onCreate(Database db, int version) async {
    // Create municipalities table
    await db.execute('''
      CREATE TABLE municipalities (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        province TEXT NOT NULL,
        region TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    ''');
    
    // Create barangay_polygons table for offline mapping
    await db.execute('''
      CREATE TABLE barangay_polygons (
        id INTEGER PRIMARY KEY,
        barangay_id TEXT NOT NULL,
        geojson_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    ''');
    
    // Create map_tiles table for offline mapping
    await db.execute('''
      CREATE TABLE map_tiles (
        id INTEGER PRIMARY KEY,
        barangay_id TEXT NOT NULL,
        zoom_level INTEGER NOT NULL,
        tile_x INTEGER NOT NULL,
        tile_y INTEGER NOT NULL,
        tile_data BLOB NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(barangay_id, zoom_level, tile_x, tile_y)
      )
    ''');
    
    // Create barangays table
    await db.execute('''
      CREATE TABLE barangays (
        id INTEGER PRIMARY KEY,
        municipality_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (municipality_id) REFERENCES municipalities (id) ON DELETE CASCADE
      )
    ''');
    
    // Create puroks table
    await db.execute('''
      CREATE TABLE puroks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        barangay_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        leader TEXT,
        description TEXT,
        server_id INTEGER,
        sync_status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (barangay_id) REFERENCES barangays (id) ON DELETE CASCADE
      )
    ''');
    
    // Create residents table
    await db.execute('''
      CREATE TABLE residents (
        id TEXT PRIMARY KEY,
        server_resident_id TEXT,
        local_id INTEGER,
        barangay_id INTEGER NOT NULL,
        last_name TEXT NOT NULL,
        first_name TEXT NOT NULL,
        middle_name TEXT,
        suffix TEXT,
        sex TEXT NOT NULL CHECK (sex IN('male', 'female')),
        civil_status TEXT NOT NULL CHECK (civil_status IN ('single', 'married', 'widowed', 'separated', 'divorced', 'live_in')),
        birthdate TEXT NOT NULL,
        birthplace TEXT,
        contact_number TEXT,
        email TEXT,
        occupation TEXT,
        monthly_income REAL,
        employment_status TEXT CHECK (employment_status IN ('employed', 'unemployed', 'self-employed', 'student', 'retired', 'not_applicable')),
        education_attainment TEXT,
        resident_status TEXT DEFAULT 'active' CHECK (resident_status IN ('active', 'deceased', 'moved_out', 'temporarily_away')),
        picture_path TEXT,
        indigenous_person INTEGER DEFAULT 0,
        sync_status TEXT DEFAULT 'pending',
        server_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (barangay_id) REFERENCES barangays (id) ON DELETE CASCADE
      )
    ''');
    
    // Create resident_classifications table
    await db.execute('''
      CREATE TABLE resident_classifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        local_id TEXT NOT NULL,
        classification_type TEXT NOT NULL,
        classification_details TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (local_id) REFERENCES residents (id) ON DELETE CASCADE
      )
    ''');
    
         // Create households table
     await db.execute('''
       CREATE TABLE households (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         local_id INTEGER,
        house_number TEXT,
        street TEXT,
        purok_id INTEGER NOT NULL,
        barangay_id INTEGER NOT NULL,
        house_head TEXT NOT NULL,
        housing_type TEXT,
        structure_type TEXT,
        electricity INTEGER DEFAULT 0,
        water_source TEXT,
        toilet_facility TEXT,
        latitude REAL,
        longitude REAL,
        area REAL,
        household_image_path TEXT,
        sync_status TEXT DEFAULT 'pending',
        server_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (purok_id) REFERENCES puroks (id) ON DELETE CASCADE,
        FOREIGN KEY (barangay_id) REFERENCES barangays (id) ON DELETE CASCADE,
        FOREIGN KEY (house_head) REFERENCES residents (id) ON DELETE CASCADE
      )
    ''');
    
    // Create families table
    await db.execute('''
      CREATE TABLE families (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER NOT NULL,
        family_group TEXT NOT NULL,
        family_head TEXT NOT NULL,
        sync_status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (household_id) REFERENCES households (id) ON DELETE CASCADE,
        FOREIGN KEY (family_head) REFERENCES residents (id) ON DELETE CASCADE
      )
    ''');
    
    // Create family_members table
    await db.execute('''
      CREATE TABLE family_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        family_id INTEGER NOT NULL,
        family_member TEXT NOT NULL,
        relationship_to_head TEXT,
        sync_status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (family_id) REFERENCES families (id) ON DELETE CASCADE,
        FOREIGN KEY (family_member) REFERENCES residents (id) ON DELETE CASCADE
      )
    ''');
    
    // Create pets table
    await db.execute('''
      CREATE TABLE pets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id TEXT NOT NULL,
        pet_name TEXT NOT NULL,
        species TEXT NOT NULL,
        breed TEXT NOT NULL,
        sex TEXT NOT NULL CHECK (sex IN ('male', 'female')),
        birthdate TEXT NOT NULL,
        color TEXT NOT NULL,
        picture_path TEXT,
        description TEXT,
        is_vaccinated INTEGER DEFAULT 0,
        vaccination_date TEXT,
        sync_status TEXT DEFAULT 'pending',
        server_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES residents (id) ON DELETE CASCADE
      )
    ''');

    // Create sync_log table for tracking synchronization
    await db.execute('''
      CREATE TABLE sync_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        sync_status TEXT NOT NULL,
        sync_timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0
      )
    ''');
    
    // Create classification_types table
    await db.execute('''
      CREATE TABLE classification_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        municipality_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT DEFAULT '#4CAF50',
        details TEXT DEFAULT '[]',
        is_active INTEGER DEFAULT 1,
        server_id INTEGER,
        sync_status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (municipality_id) REFERENCES municipalities (id) ON DELETE CASCADE
      )
    ''');
    
    // Create indexes for better performance
    await db.execute('CREATE INDEX idx_residents_barangay ON residents(barangay_id)');
    await db.execute('CREATE INDEX idx_residents_name ON residents(last_name, first_name)');
    await db.execute('CREATE INDEX idx_residents_status ON residents(resident_status)');
    await db.execute('CREATE INDEX idx_residents_sync ON residents(sync_status)');
    
    await db.execute('CREATE INDEX idx_households_barangay ON households(barangay_id)');
    await db.execute('CREATE INDEX idx_households_purok ON households(purok_id)');
    await db.execute('CREATE INDEX idx_households_head ON households(house_head)');
    await db.execute('CREATE INDEX idx_households_sync ON households(sync_status)');
    
    await db.execute('CREATE INDEX idx_families_household ON families(household_id)');
    await db.execute('CREATE INDEX idx_family_members_family ON family_members(family_id)');
    
    await db.execute('CREATE INDEX idx_pets_owner ON pets(owner_id)');
    await db.execute('CREATE INDEX idx_pets_species ON pets(species)');
    await db.execute('CREATE INDEX idx_pets_breed ON pets(breed)');
    await db.execute('CREATE INDEX idx_pets_vaccinated ON pets(is_vaccinated)');
    
    // Classification types indexes
    await db.execute('CREATE INDEX idx_classification_types_municipality ON classification_types(municipality_id)');
    await db.execute('CREATE INDEX idx_classification_types_name ON classification_types(name)');
    await db.execute('CREATE INDEX idx_classification_types_active ON classification_types(is_active)');
    await db.execute('CREATE INDEX idx_classification_types_sync ON classification_types(sync_status)');
    
    // Purok indexes
    await db.execute('CREATE INDEX idx_puroks_barangay ON puroks(barangay_id)');
    await db.execute('CREATE INDEX idx_puroks_sync ON puroks(sync_status)');
    
    // Insert default municipality and barangay for testing
    await db.execute('''
      INSERT INTO municipalities (id, name, province, region) 
      VALUES (1, 'Borongan City', 'Eastern Samar', 'Region VIII')
    ''');
    
    await db.execute('''
      INSERT INTO barangays (id, municipality_id, name) 
      VALUES (1, 1, 'Barangay 1')
    ''');
    
    await db.execute('''
      INSERT INTO puroks (id, barangay_id, name) 
      VALUES (1, 1, 'Purok 1')
    ''');
  }
  
  Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    // Handle database upgrades here
    print('🔄 DATABASE UPGRADE: $oldVersion -> $newVersion');
    print('🚨 CRITICAL: Database upgrade is running! This should only happen once per version.');
    print('   If you see this message repeatedly, there is a database version tracking issue.');
    
    if (oldVersion < 2) {
      // Add missing columns to pets table if they don't exist
      try {
        await db.execute('ALTER TABLE pets ADD COLUMN is_vaccinated INTEGER DEFAULT 0');
        print('Added is_vaccinated column to pets table');
      } catch (e) {
        print('is_vaccinated column might already exist: $e');
      }
      
      try {
        await db.execute('ALTER TABLE pets ADD COLUMN vaccination_date TEXT');
        print('Added vaccination_date column to pets table');
      } catch (e) {
        print('vaccination_date column might already exist: $e');
      }
    }
    
    if (oldVersion < 3) {
      // Add missing columns to puroks table if they don't exist
      await _ensurePuroksColumnsExist(db);
    }
    
    if (oldVersion < 4) {
      print('🔄 Creating classification_types table for version 4 upgrade');
      // Create classification_types table if it doesn't exist
      try {
        await db.execute('''
          CREATE TABLE classification_types (
            id INTEGER PRIMARY KEY,
            municipality_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            color TEXT DEFAULT '#4CAF50',
            details TEXT DEFAULT '[]',
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (municipality_id) REFERENCES municipalities (id) ON DELETE CASCADE
          )
        ''');
        print('✅ Created classification_types table');
        
        // Create indexes for classification_types
        await db.execute('CREATE INDEX idx_classification_types_municipality ON classification_types(municipality_id)');
        await db.execute('CREATE INDEX idx_classification_types_name ON classification_types(name)');
        await db.execute('CREATE INDEX idx_classification_types_active ON classification_types(is_active)');
        print('✅ Created classification_types indexes');
      } catch (e) {
        print('❌ Error creating classification_types table: $e');
        // Try to check if table exists
        try {
          await db.rawQuery('SELECT COUNT(*) FROM classification_types');
          print('✅ classification_types table already exists');
        } catch (checkError) {
          print('❌ classification_types table does not exist: $checkError');
        }
      }
    }
    
    if (oldVersion < 5) {
      print('🔄 Adding server_resident_id column for version 5 upgrade');
      // Add server_resident_id column to residents table
      try {
        await db.execute('ALTER TABLE residents ADD COLUMN server_resident_id TEXT');
        print('✅ Added server_resident_id column to residents table');
      } catch (e) {
        print('❌ Error adding server_resident_id column: $e');
        // Check if column already exists
        try {
          await db.rawQuery('SELECT server_resident_id FROM residents LIMIT 1');
          print('✅ server_resident_id column already exists');
        } catch (checkError) {
          print('❌ server_resident_id column does not exist: $checkError');
        }
      }
    }
    
    if (oldVersion < 6) {
      print('🔄 Adding offline mapping tables for version 6 upgrade');
      // Create barangay_polygons table for offline mapping
      try {
        await db.execute('''
          CREATE TABLE barangay_polygons (
            id INTEGER PRIMARY KEY,
            barangay_id TEXT NOT NULL,
            geojson_data TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        ''');
        print('✅ Created barangay_polygons table');
      } catch (e) {
        print('❌ Error creating barangay_polygons table: $e');
      }
      
      // Create map_tiles table for offline mapping
      try {
        await db.execute('''
          CREATE TABLE map_tiles (
            id INTEGER PRIMARY KEY,
            zoom_level INTEGER NOT NULL,
            tile_x INTEGER NOT NULL,
            tile_y INTEGER NOT NULL,
            tile_data BLOB NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(zoom_level, tile_x, tile_y)
          )
        ''');
        print('✅ Created map_tiles table');
      } catch (e) {
        print('❌ Error creating map_tiles table: $e');
      }
    }
    
    if (oldVersion < 7) {
      print('🔄 Adding server_id and sync_status columns for version 7 upgrade');
      
      // Add server_id and sync_status to puroks table
      try {
        await db.execute('ALTER TABLE puroks ADD COLUMN server_id INTEGER');
        print('✅ Added server_id column to puroks table');
      } catch (e) {
        print('⚠️ server_id column might already exist in puroks: $e');
      }
      
      try {
        await db.execute('ALTER TABLE puroks ADD COLUMN sync_status TEXT DEFAULT \'pending\'');
        print('✅ Added sync_status column to puroks table');
      } catch (e) {
        print('⚠️ sync_status column might already exist in puroks: $e');
      }
      
      // Add server_id and sync_status to classification_types table
      try {
        await db.execute('ALTER TABLE classification_types ADD COLUMN server_id INTEGER');
        print('✅ Added server_id column to classification_types table');
      } catch (e) {
        print('⚠️ server_id column might already exist in classification_types: $e');
      }
      
      try {
        await db.execute('ALTER TABLE classification_types ADD COLUMN sync_status TEXT DEFAULT \'pending\'');
        print('✅ Added sync_status column to classification_types table');
      } catch (e) {
        print('⚠️ sync_status column might already exist in classification_types: $e');
      }
      
      // Create indexes for sync status
      try {
        await db.execute('CREATE INDEX idx_puroks_sync ON puroks(sync_status)');
        print('✅ Created idx_puroks_sync index');
      } catch (e) {
        print('⚠️ idx_puroks_sync index might already exist: $e');
      }
      
      try {
        await db.execute('CREATE INDEX idx_classification_types_sync ON classification_types(sync_status)');
        print('✅ Created idx_classification_types_sync index');
      } catch (e) {
        print('⚠️ idx_classification_types_sync index might already exist: $e');
      }
    }
    
    if (oldVersion < 8) {
      print('🔄 Updating employment_status CHECK constraint for version 8 upgrade');
      
      // SQLite doesn't support modifying CHECK constraints directly
      // We need to recreate the residents table with the updated constraint
      try {
        // Temporarily disable foreign key constraints
        await db.execute('PRAGMA foreign_keys = OFF');
        print('✅ Disabled foreign key constraints for migration');
        
        // Create a temporary new table with updated CHECK constraint
        await db.execute('''
          CREATE TABLE residents_new (
            id TEXT PRIMARY KEY,
            server_resident_id TEXT,
            local_id INTEGER,
            barangay_id INTEGER NOT NULL,
            last_name TEXT NOT NULL,
            first_name TEXT NOT NULL,
            middle_name TEXT,
            suffix TEXT,
            sex TEXT NOT NULL CHECK (sex IN('male', 'female')),
            civil_status TEXT NOT NULL CHECK (civil_status IN ('single', 'married', 'widowed', 'separated', 'divorced', 'live_in')),
            birthdate TEXT NOT NULL,
            birthplace TEXT,
            contact_number TEXT,
            email TEXT,
            occupation TEXT,
            monthly_income REAL,
            employment_status TEXT CHECK (employment_status IN ('employed', 'unemployed', 'self-employed', 'student', 'retired', 'not_applicable')),
            education_attainment TEXT,
            resident_status TEXT DEFAULT 'active' CHECK (resident_status IN ('active', 'deceased', 'moved_out', 'temporarily_away')),
            picture_path TEXT,
            indigenous_person INTEGER DEFAULT 0,
            sync_status TEXT DEFAULT 'pending',
            server_id TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (barangay_id) REFERENCES barangays (id) ON DELETE CASCADE
          )
        ''');
        print('✅ Created residents_new table with updated CHECK constraint');
        
        // Copy all data from old table to new table
        await db.execute('''
          INSERT INTO residents_new 
          SELECT * FROM residents
        ''');
        print('✅ Copied all data from residents to residents_new');
        
        // Drop the old table
        await db.execute('DROP TABLE residents');
        print('✅ Dropped old residents table');
        
        // Rename new table to residents
        await db.execute('ALTER TABLE residents_new RENAME TO residents');
        print('✅ Renamed residents_new to residents');
        
        // Recreate indexes for residents table
        try {
          await db.execute('CREATE INDEX idx_residents_barangay ON residents(barangay_id)');
          await db.execute('CREATE INDEX idx_residents_sync ON residents(sync_status)');
          await db.execute('CREATE INDEX idx_residents_name ON residents(last_name, first_name)');
          print('✅ Recreated residents indexes');
        } catch (e) {
          print('⚠️ Error creating residents indexes: $e');
        }
        
        // Re-enable foreign key constraints
        await db.execute('PRAGMA foreign_keys = ON');
        print('✅ Re-enabled foreign key constraints');
        
        print('✅ Successfully updated employment_status CHECK constraint');
      } catch (e) {
        print('❌ Error updating residents table CHECK constraint: $e');
        // Try to re-enable foreign keys even if migration failed
        try {
          await db.execute('PRAGMA foreign_keys = ON');
        } catch (pragmaError) {
          print('⚠️ Could not re-enable foreign keys: $pragmaError');
        }
      }
    }
    
    if (oldVersion < 9) {
      print('🔄 Migrating employment_status data for version 9 upgrade (underscore to hyphen)');
      
      try {
        // Update 'self_employed' to 'self-employed' (underscore to hyphen) to match server
        final selfEmployedCount = await db.rawUpdate('''
          UPDATE residents 
          SET employment_status = 'self-employed' 
          WHERE employment_status = 'self_employed'
        ''');
        print('✅ Updated $selfEmployedCount residents from self_employed to self-employed');
        
        print('✅ Successfully migrated employment_status data to match server requirements');
      } catch (e) {
        print('❌ Error migrating employment_status data: $e');
      }
    }
    
    if (oldVersion < 10) {
      print('🔄 Adding live_in to civil_status CHECK constraint for version 10 upgrade');
      
      try {
        // CRITICAL: Backup households data before migration
        print('💾 BACKUP: Backing up households data before migration...');
        final householdsBackup = await db.rawQuery('SELECT * FROM households');
        print('📊 BACKUP: Found ${householdsBackup.length} households to backup');
        
        // Temporarily disable foreign key constraints
        await db.execute('PRAGMA foreign_keys = OFF');
        print('✅ Disabled foreign key constraints for migration');
        
        // Create a temporary new table with updated CHECK constraint including 'live_in'
        await db.execute('''
          CREATE TABLE residents_new_v10 (
            id TEXT PRIMARY KEY,
            server_resident_id TEXT,
            local_id INTEGER,
            barangay_id INTEGER NOT NULL,
            last_name TEXT NOT NULL,
            first_name TEXT NOT NULL,
            middle_name TEXT,
            suffix TEXT,
            sex TEXT NOT NULL CHECK (sex IN('male', 'female')),
            civil_status TEXT NOT NULL CHECK (civil_status IN ('single', 'married', 'widowed', 'separated', 'divorced', 'live_in')),
            birthdate TEXT NOT NULL,
            birthplace TEXT,
            contact_number TEXT,
            email TEXT,
            occupation TEXT,
            monthly_income REAL,
            employment_status TEXT CHECK (employment_status IN ('employed', 'unemployed', 'self-employed', 'student', 'retired', 'not_applicable')),
            education_attainment TEXT,
            resident_status TEXT DEFAULT 'active' CHECK (resident_status IN ('active', 'deceased', 'moved_out', 'temporarily_away')),
            picture_path TEXT,
            indigenous_person INTEGER DEFAULT 0,
            sync_status TEXT DEFAULT 'pending',
            server_id TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (barangay_id) REFERENCES barangays (id) ON DELETE CASCADE
          )
        ''');
        print('✅ Created residents_new_v10 table with live_in civil status');
        
        // Copy all data from old table to new table
        await db.execute('''
          INSERT INTO residents_new_v10 
          SELECT * FROM residents
        ''');
        print('✅ Copied all data from residents to residents_new_v10');
        
        // Drop the old table
        await db.execute('DROP TABLE residents');
        print('✅ Dropped old residents table');
        
        // Rename the new table to the original name
        await db.execute('ALTER TABLE residents_new_v10 RENAME TO residents');
        print('✅ Renamed residents_new_v10 to residents');
        
        // Recreate indexes
        await db.execute('CREATE INDEX idx_residents_barangay ON residents(barangay_id)');
        await db.execute('CREATE INDEX idx_residents_last_name ON residents(last_name)');
        await db.execute('CREATE INDEX idx_residents_sync ON residents(sync_status)');
        print('✅ Recreated residents table indexes');
        
        // Re-enable foreign key constraints
        await db.execute('PRAGMA foreign_keys = ON');
        print('✅ Re-enabled foreign key constraints');
        
        // CRITICAL: Restore households data if it was lost
        print('🔄 RESTORE: Checking if households data needs to be restored...');
        final householdsAfterMigration = await db.rawQuery('SELECT COUNT(*) as count FROM households');
        final householdsCountAfter = householdsAfterMigration.first['count'] as int;
        print('📊 RESTORE: Households count after migration: $householdsCountAfter');
        
        if (householdsCountAfter == 0 && householdsBackup.isNotEmpty) {
          print('🚨 CRITICAL: Households data was lost during migration! Restoring from backup...');
          
          // Restore households data
          for (final household in householdsBackup) {
            try {
              await db.insert('households', household);
            } catch (e) {
              print('❌ Error restoring household ${household['id']}: $e');
            }
          }
          
          final householdsAfterRestore = await db.rawQuery('SELECT COUNT(*) as count FROM households');
          final householdsCountAfterRestore = householdsAfterRestore.first['count'] as int;
          print('✅ RESTORE: Restored $householdsCountAfterRestore households from backup');
        } else if (householdsCountAfter > 0) {
          print('✅ RESTORE: Households data intact after migration');
        }
        
        print('✅ Successfully updated civil_status CHECK constraint to include live_in');
        
        // Also ensure households table is properly migrated
        print('🔄 Ensuring households table is properly migrated for version 10');
        try {
          // Check if households table exists and has proper structure
          final householdsInfo = await db.rawQuery("PRAGMA table_info(households)");
          if (householdsInfo.isNotEmpty) {
            print('✅ Households table exists with ${householdsInfo.length} columns');
            
            // Verify households data is intact
            final householdCount = await db.rawQuery('SELECT COUNT(*) as count FROM households');
            final count = householdCount.first['count'] as int;
            print('📊 Households table contains $count records');
            
            if (count == 0) {
              print('⚠️ WARNING: Households table is empty after migration!');
            }
          } else {
            print('❌ ERROR: Households table does not exist after migration!');
          }
        } catch (e) {
          print('❌ Error checking households table: $e');
        }
        
      } catch (e) {
        print('❌ Error updating civil_status constraint: $e');
        // Re-enable foreign keys even if migration failed
        try {
          await db.execute('PRAGMA foreign_keys = ON');
        } catch (fkError) {
          print('❌ Error re-enabling foreign keys: $fkError');
        }
      }
    }
    
  }
  
  // Classification Types CRUD operations
  
  /// Ensure classification_types table exists (safety method)
  Future<void> ensureClassificationTypesTableExists() async {
    final db = await database;
    try {
      // Try to query the table to see if it exists
      await db.rawQuery('SELECT COUNT(*) FROM classification_types');
      print('✅ classification_types table exists');
    } catch (e) {
      print('❌ classification_types table does not exist, creating it...');
      try {
        await db.execute('''
          CREATE TABLE classification_types (
            id INTEGER PRIMARY KEY,
            municipality_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            color TEXT DEFAULT '#4CAF50',
            details TEXT DEFAULT '[]',
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (municipality_id) REFERENCES municipalities (id) ON DELETE CASCADE
          )
        ''');
        print('✅ Created classification_types table manually');
        
        // Create indexes
        await db.execute('CREATE INDEX idx_classification_types_municipality ON classification_types(municipality_id)');
        await db.execute('CREATE INDEX idx_classification_types_name ON classification_types(name)');
        await db.execute('CREATE INDEX idx_classification_types_active ON classification_types(is_active)');
        print('✅ Created classification_types indexes manually');
      } catch (createError) {
        print('❌ Failed to create classification_types table manually: $createError');
        rethrow;
      }
    }
  }
  
  /// Insert classification types into the database
  Future<void> insertClassificationTypes(List<Map<String, dynamic>> classificationTypes) async {
    // Ensure table exists before inserting
    await ensureClassificationTypesTableExists();
    
    final db = await database;
    
    for (final classificationType in classificationTypes) {
      // Convert details object to JSON string if it's not already a string
      String detailsJson = '[]';
      if (classificationType['details'] != null) {
        if (classificationType['details'] is String) {
          detailsJson = classificationType['details'];
        } else {
          // Convert object to JSON string
          detailsJson = jsonEncode(classificationType['details']);
        }
      }
      
      await db.insert(
        'classification_types',
        {
          'id': classificationType['id'],
          'municipality_id': classificationType['municipality_id'],
          'name': classificationType['name'],
          'description': classificationType['description'],
          'color': classificationType['color'] ?? '#4CAF50',
          'details': detailsJson,
          'is_active': classificationType['is_active'] == true || classificationType['is_active'] == 1 ? 1 : 0,
          'server_id': classificationType['server_id'],      // ✅ Include server_id if provided
          'sync_status': classificationType['sync_status'] ?? 'pending',  // ✅ Use provided status or default
          'created_at': classificationType['created_at'],
          'updated_at': classificationType['updated_at'],
        },
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }
  }
  
  /// Get all classification types for a municipality
  Future<List<Map<String, dynamic>>> getClassificationTypesByMunicipality(int municipalityId) async {
    // Ensure table exists before querying
    await ensureClassificationTypesTableExists();
    
    final db = await database;
    final result = await db.query(
      'classification_types',
      where: 'municipality_id = ? AND is_active = 1',
      whereArgs: [municipalityId],
      orderBy: 'name ASC',
    );
    return result;
  }
  
  /// Get all classification types
  Future<List<Map<String, dynamic>>> getAllClassificationTypes() async {
    // Ensure table exists before querying
    await ensureClassificationTypesTableExists();
    
    final db = await database;
    final result = await db.query(
      'classification_types',
      orderBy: 'municipality_id ASC, name ASC',
    );
    return result;
  }
  
  /// Clear all classification types
  Future<void> clearClassificationTypes() async {
    final db = await database;
    await db.delete('classification_types');
  }
  
  /// Clear classification types for a specific municipality
  Future<void> clearClassificationTypesByMunicipality(int municipalityId) async {
    // DISABLED: Don't delete classifications to prevent data loss
    print('⚠️ DISABLED: Classification deletion disabled to prevent data loss');
    print('ℹ️ Classifications will be updated/inserted instead of deleted/recreated');
    
    // Ensure table exists
    await ensureClassificationTypesTableExists();
    
    // DISABLED: No longer delete classifications to prevent data loss
    // The classification fetching logic now uses update/insert instead of delete/recreate
    // This ensures resident data is never lost due to classification changes
  }

  /// Insert a single classification type
  Future<int> insertClassificationType(Map<String, dynamic> classificationType) async {
    await ensureClassificationTypesTableExists();
    final db = await database;
    
    String detailsJson = '[]';
    if (classificationType['details'] != null) {
      if (classificationType['details'] is String) {
        detailsJson = classificationType['details'];
      } else {
        detailsJson = jsonEncode(classificationType['details']);
      }
    }
    
    return await db.insert(
      'classification_types',
      {
        'municipality_id': classificationType['municipality_id'],
        'name': classificationType['name'],
        'description': classificationType['description'],
        'color': classificationType['color'] ?? '#4CAF50',
        'details': detailsJson,
        'is_active': classificationType['is_active'] == true || classificationType['is_active'] == 1 ? 1 : 0,
        'server_id': null,             // ✅ Locally created, no server ID yet
        'sync_status': 'pending',      // ✅ Needs to be synced
        'created_at': classificationType['created_at'] ?? DateTime.now().toIso8601String(),
        'updated_at': DateTime.now().toIso8601String(),
      },
    );
  }

  /// Update a classification type
  Future<int> updateClassificationType(int id, Map<String, dynamic> classificationType) async {
    await ensureClassificationTypesTableExists();
    final db = await database;
    
    String? detailsJson;
    if (classificationType['details'] != null) {
      if (classificationType['details'] is String) {
        detailsJson = classificationType['details'];
      } else {
        detailsJson = jsonEncode(classificationType['details']);
      }
    }
    
    Map<String, dynamic> updateData = {
      'updated_at': DateTime.now().toIso8601String(),
    };
    
    if (classificationType['name'] != null) updateData['name'] = classificationType['name'];
    if (classificationType['description'] != null) updateData['description'] = classificationType['description'];
    if (classificationType['color'] != null) updateData['color'] = classificationType['color'];
    if (detailsJson != null) updateData['details'] = detailsJson;
    if (classificationType['is_active'] != null) {
      updateData['is_active'] = classificationType['is_active'] == true || classificationType['is_active'] == 1 ? 1 : 0;
    }
    
    return await db.update(
      'classification_types',
      updateData,
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  /// Delete a classification type
  Future<int> deleteClassificationType(int id) async {
    await ensureClassificationTypesTableExists();
    final db = await database;
    return await db.delete(
      'classification_types',
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  /// Get a classification type by ID
  Future<Map<String, dynamic>?> getClassificationTypeById(int id) async {
    await ensureClassificationTypesTableExists();
    final db = await database;
    final result = await db.query(
      'classification_types',
      where: 'id = ?',
      whereArgs: [id],
    );
    return result.isEmpty ? null : result.first;
  }

  // Purok CRUD operations

  /// Get all puroks
  Future<List<Map<String, dynamic>>> getAllPuroks() async {
    final db = await database;
    await _ensurePuroksColumnsExist(db);
    return await db.query('puroks', orderBy: 'name ASC');
  }

  /// Get puroks by barangay ID
  Future<List<Map<String, dynamic>>> getPuroksByBarangayId(int barangayId) async {
    final db = await database;
    await _ensurePuroksColumnsExist(db);
    return await db.query(
      'puroks',
      where: 'barangay_id = ?',
      whereArgs: [barangayId],
      orderBy: 'name ASC',
    );
  }

  /// Get a purok by ID
  Future<Map<String, dynamic>?> getPurokById(int id) async {
    final db = await database;
    await _ensurePuroksColumnsExist(db);
    final result = await db.query(
      'puroks',
      where: 'id = ?',
      whereArgs: [id],
    );
    return result.isEmpty ? null : result.first;
  }

  /// Insert a purok
  Future<int> insertPurok(Map<String, dynamic> purok) async {
    final db = await database;
    await _ensurePuroksColumnsExist(db);
    return await db.insert(
      'puroks',
      {
        'barangay_id': purok['barangay_id'],
        'name': purok['name'],
        'leader': purok['leader'],
        'description': purok['description'],
        'server_id': null,             // ✅ Locally created, no server ID yet
        'sync_status': 'pending',      // ✅ Needs to be synced
      },
    );
  }

  /// Update a purok
  Future<int> updatePurok(int id, Map<String, dynamic> purok) async {
    final db = await database;
    await _ensurePuroksColumnsExist(db);
    
    Map<String, dynamic> updateData = {};
    if (purok['name'] != null) updateData['name'] = purok['name'];
    if (purok['leader'] != null) updateData['leader'] = purok['leader'];
    if (purok['description'] != null) updateData['description'] = purok['description'];
    
    return await db.update(
      'puroks',
      updateData,
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  /// Delete a purok
  Future<int> deletePurok(int id) async {
    final db = await database;
    return await db.delete(
      'puroks',
      where: 'id = ?',
      whereArgs: [id],
    );
  }
  
  // Resident Classifications CRUD operations
  
  /// Insert resident classifications
  Future<void> insertResidentClassifications(String localId, List<Map<String, dynamic>> classifications) async {
    final db = await database;
    
    // First, remove existing classifications for this resident
    await db.delete(
      'resident_classifications',
      where: 'local_id = ?',
      whereArgs: [localId],
    );
    
    // Insert new classifications
    for (final classification in classifications) {
      // Prepare classification details
      String classificationDetails = classification['description'] ?? '';
      
      // If dynamic fields exist, include them in the details
      if (classification.containsKey('dynamic_fields') && 
          classification['dynamic_fields'] != null) {
        final dynamicFields = classification['dynamic_fields'] as Map<String, dynamic>;
        if (dynamicFields.isNotEmpty) {
          // Convert dynamic fields to JSON string
          final dynamicFieldsJson = jsonEncode(dynamicFields);
          classificationDetails = dynamicFieldsJson;
        }
      }
      
      await db.insert(
        'resident_classifications',
        {
          'local_id': localId,
          'classification_type': classification['name'],
          'classification_details': classificationDetails,
          'created_at': DateTime.now().toIso8601String(),
          'updated_at': DateTime.now().toIso8601String(),
        },
      );
    }
  }
  
  /// Get resident classifications by local_id
  Future<List<Map<String, dynamic>>> getResidentClassifications(String localId) async {
    final db = await database;
    final result = await db.query(
      'resident_classifications',
      where: 'local_id = ?',
      whereArgs: [localId],
      orderBy: 'created_at ASC',
    );
    return result;
  }
  
  /// Delete resident classifications by local_id
  Future<void> deleteResidentClassifications(String localId) async {
    final db = await database;
    await db.delete(
      'resident_classifications',
      where: 'local_id = ?',
      whereArgs: [localId],
    );
  }
  
  // Close database
  Future<void> close() async {
    final db = await database;
    await db.close();
  }
  
  // Get database instance
  static DatabaseHelper get instance => _instance;
  
  /// Force recreate database (for development/testing)
  Future<void> recreateDatabase() async {
    print('🔄 RECREATING DATABASE...');
    if (_database != null) {
      await _database!.close();
      _database = null;
    }
    
    // Delete the database file
    try {
      final path = join(await getDatabasesPath(), 'bims_local.db');
      final file = File(path);
      if (await file.exists()) {
        await file.delete();
        print('✅ Deleted existing database file');
      }
    } catch (e) {
      print('⚠️ Error deleting database file: $e');
    }
    
    // Recreate database
    _database = await _initDatabase();
    await _configureDatabase(_database!);
    print('✅ Database recreated successfully');
  }
  
  // Offline Mapping CRUD operations
  
  /// Ensure offline mapping tables exist
  Future<void> ensureOfflineMappingTablesExist() async {
    final db = await database;
    
    // Check if barangay_polygons table exists
    try {
      await db.rawQuery('SELECT COUNT(*) FROM barangay_polygons');
      print('✅ barangay_polygons table exists');
    } catch (e) {
      print('❌ barangay_polygons table does not exist, creating it...');
      await db.execute('''
        CREATE TABLE barangay_polygons (
          id INTEGER PRIMARY KEY,
          barangay_id TEXT NOT NULL,
          geojson_data TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      ''');
      print('✅ Created barangay_polygons table');
    }
    
    // Check if map_tiles table exists
    try {
      await db.rawQuery('SELECT COUNT(*) FROM map_tiles');
      print('✅ map_tiles table exists');
      
      // Check if barangay_id column exists, if not, migrate the table
      try {
        await db.rawQuery('SELECT barangay_id FROM map_tiles LIMIT 1');
        print('✅ map_tiles table has barangay_id column');
      } catch (e) {
        print('🔄 Migrating map_tiles table to include barangay_id...');
        // Create new table with barangay_id
        await db.execute('''
          CREATE TABLE map_tiles_new (
            id INTEGER PRIMARY KEY,
            barangay_id TEXT NOT NULL,
            zoom_level INTEGER NOT NULL,
            tile_x INTEGER NOT NULL,
            tile_y INTEGER NOT NULL,
            tile_data BLOB NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(barangay_id, zoom_level, tile_x, tile_y)
          )
        ''');
        
        // Copy existing data with default barangay_id
        await db.execute('''
          INSERT INTO map_tiles_new (barangay_id, zoom_level, tile_x, tile_y, tile_data, created_at)
          SELECT '1', zoom_level, tile_x, tile_y, tile_data, created_at FROM map_tiles
        ''');
        
        // Drop old table and rename new one
        await db.execute('DROP TABLE map_tiles');
        await db.execute('ALTER TABLE map_tiles_new RENAME TO map_tiles');
        print('✅ Migrated map_tiles table successfully');
      }
    } catch (e) {
      print('❌ map_tiles table does not exist, creating it...');
      await db.execute('''
        CREATE TABLE map_tiles (
          id INTEGER PRIMARY KEY,
          barangay_id TEXT NOT NULL,
          zoom_level INTEGER NOT NULL,
          tile_x INTEGER NOT NULL,
          tile_y INTEGER NOT NULL,
          tile_data BLOB NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(barangay_id, zoom_level, tile_x, tile_y)
        )
      ''');
      print('✅ Created map_tiles table');
    }
  }
  
  /// Store barangay polygon data
  Future<void> storeBarangayPolygon(String barangayId, Map<String, dynamic> geojson) async {
    await ensureOfflineMappingTablesExist();
    final db = await database;
    
    print('🗺️ DATABASE - Storing polygon for barangay: $barangayId');
    
    // Delete existing polygon first (if any)
    final deleted = await db.delete(
      'barangay_polygons',
      where: 'barangay_id = ?',
      whereArgs: [barangayId],
    );
    if (deleted > 0) {
      print('🗺️ DATABASE - Deleted $deleted existing polygon(s)');
    }
    
    // Insert new polygon
    final id = await db.insert(
      'barangay_polygons',
      {
        'barangay_id': barangayId,
        'geojson_data': json.encode(geojson),
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
    
    print('🗺️ DATABASE - ✅ Polygon stored with ID: $id');
    
    // Verify storage
    final verify = await db.query(
      'barangay_polygons',
      where: 'barangay_id = ?',
      whereArgs: [barangayId],
    );
    print('🗺️ DATABASE - Verification: ${verify.length} polygon(s) found for barangay $barangayId');
  }
  
  /// Load barangay polygon data
  Future<Map<String, dynamic>?> loadBarangayPolygon(String barangayId) async {
    await ensureOfflineMappingTablesExist();
    final db = await database;
    final result = await db.query(
      'barangay_polygons',
      where: 'barangay_id = ?',
      whereArgs: [barangayId],
    );
    
    if (result.isNotEmpty) {
      final geojsonData = result.first['geojson_data'] as String;
      print('🗺️ Database - Loaded polygon data for barangay $barangayId');
      print('🗺️ Database - Data length: ${geojsonData.length} characters');
      
      final parsedData = json.decode(geojsonData);
      print('🗺️ Database - Parsed data type: ${parsedData['type']}');
      print('🗺️ Database - Features count: ${(parsedData['features'] as List).length}');
      
      return parsedData;
    }
    
    print('🗺️ Database - No polygon data found for barangay $barangayId');
    return null;
  }
  
  /// Store map tile data
  Future<void> storeMapTile(String barangayId, int zoom, int x, int y, Uint8List tileData) async {
    await ensureOfflineMappingTablesExist();
    final db = await database;
    await db.insert('map_tiles', {
      'barangay_id': barangayId,
      'zoom_level': zoom,
      'tile_x': x,
      'tile_y': y,
      'tile_data': tileData,
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }
  
  /// Load map tile data
  Future<Uint8List?> loadMapTile(String barangayId, int zoom, int x, int y) async {
    try {
      await ensureOfflineMappingTablesExist();
      final db = await database;
      
      final result = await db.query(
        'map_tiles',
        where: 'barangay_id = ? AND zoom_level = ? AND tile_x = ? AND tile_y = ?',
        whereArgs: [barangayId, zoom, x, y],
      );
      
      if (result.isNotEmpty) {
        return result.first['tile_data'] as Uint8List;
      }
      
      return null;
    } catch (e) {
      // Silently fail - tile provider will handle missing tiles
      return null;
    }
  }
  
  /// Check if barangay polygon exists
  Future<bool> hasBarangayPolygon(String barangayId) async {
    await ensureOfflineMappingTablesExist();
    final db = await database;
    
    print('🗺️ DATABASE - Checking if polygon exists for barangay: $barangayId');
    
    // First, check all polygons in the table
    final allPolygons = await db.query('barangay_polygons');
    print('🗺️ DATABASE - Total polygons in table: ${allPolygons.length}');
    for (var polygon in allPolygons) {
      print('🗺️ DATABASE - Found polygon: barangay_id=${polygon['barangay_id']}');
    }
    
    // Now check for specific barangay
    final result = await db.query(
      'barangay_polygons',
      where: 'barangay_id = ?',
      whereArgs: [barangayId],
    );
    
    print('🗺️ DATABASE - Polygons matching barangay $barangayId: ${result.length}');
    final exists = result.isNotEmpty;
    print('🗺️ DATABASE - hasBarangayPolygon($barangayId) returning: $exists');
    
    return exists;
  }
  
  /// Get count of stored map tiles
  Future<int> getMapTileCount() async {
    await ensureOfflineMappingTablesExist();
    final db = await database;
    final result = await db.rawQuery('SELECT COUNT(*) as count FROM map_tiles');
    return result.first['count'] as int;
  }
  
  /// Get count of stored map tiles for specific barangay
  Future<int> getMapTileCountForBarangay(String barangayId) async {
    try {
      await ensureOfflineMappingTablesExist();
      final db = await database;
      
      // Debug: Check what barangay IDs exist in database (only first time)
      final allBarangayIds = await db.rawQuery(
        'SELECT DISTINCT barangay_id FROM map_tiles LIMIT 5'
      );
      print('🗺️ DATABASE - Barangay IDs in map_tiles: ${allBarangayIds.map((r) => r['barangay_id']).toList()}');
      print('🗺️ DATABASE - Looking for: "$barangayId"');
      
      final result = await db.rawQuery(
        'SELECT COUNT(*) as count FROM map_tiles WHERE barangay_id = ?',
        [barangayId]
      );
      
      final count = result.first['count'] as int;
      print('🗺️ DATABASE - Found $count tiles');
      
      return count;
    } catch (e) {
      print('🗺️ DATABASE - Error counting tiles: $e');
      return 0;
    }
  }
  
  /// Check if map tiles exist for specific barangay
  Future<bool> hasMapTilesForBarangay(String barangayId) async {
    await ensureOfflineMappingTablesExist();
    final db = await database;
    final result = await db.rawQuery(
      'SELECT COUNT(*) as count FROM map_tiles WHERE barangay_id = ?',
      [barangayId]
    );
    return (result.first['count'] as int) > 0;
  }
  
  /// Check if map tiles have sufficient zoom levels for household viewing
  Future<bool> hasHighZoomTilesForBarangay(String barangayId) async {
    await ensureOfflineMappingTablesExist();
    final db = await database;
    final result = await db.rawQuery(
      'SELECT COUNT(*) as count FROM map_tiles WHERE barangay_id = ? AND zoom_level >= 15',
      [barangayId]
    );
    return (result.first['count'] as int) > 0;
  }
  
  /// Clear all map tiles and polygon data
  Future<void> clearAllOfflineMapData() async {
    await ensureOfflineMappingTablesExist();
    final db = await database;
    
    print('🗺️ CLEARING ALL OFFLINE MAP DATA...');
    
    // Show what's in the database before clearing
    final beforeTiles = await db.rawQuery('SELECT COUNT(*) as count FROM map_tiles');
    final beforePolygons = await db.rawQuery('SELECT COUNT(*) as count FROM barangay_polygons');
    print('   📊 Before: ${beforeTiles.first['count']} tiles, ${beforePolygons.first['count']} polygons');
    
    // Clear all map tiles
    final tilesDeleted = await db.delete('map_tiles');
    print('   ✅ Deleted $tilesDeleted map tiles');
    
    // Clear all polygon data
    final polygonsDeleted = await db.delete('barangay_polygons');
    print('   ✅ Deleted $polygonsDeleted polygon records');
    
    // Verify deletion
    final afterTiles = await db.rawQuery('SELECT COUNT(*) as count FROM map_tiles');
    final afterPolygons = await db.rawQuery('SELECT COUNT(*) as count FROM barangay_polygons');
    print('   📊 After: ${afterTiles.first['count']} tiles, ${afterPolygons.first['count']} polygons');
    
    // Execute VACUUM to reclaim space
    try {
      await db.execute('VACUUM');
      print('   ✅ Database vacuumed (space reclaimed)');
    } catch (e) {
      print('   ⚠️ Could not vacuum database: $e');
    }
    
    print('🗺️ ALL OFFLINE MAP DATA CLEARED');
  }
  
  /// Clear map tiles for specific barangay
  Future<void> clearMapTilesForBarangay(String barangayId) async {
    await ensureOfflineMappingTablesExist();
    final db = await database;
    
    print('🗺️ Clearing map tiles for barangay: $barangayId');
    
    final tilesDeleted = await db.delete(
      'map_tiles',
      where: 'barangay_id = ?',
      whereArgs: [barangayId],
    );
    
    print('   ✅ Deleted $tilesDeleted map tiles for barangay $barangayId');
  }
  
  /// Clear polygon data for specific barangay
  Future<void> clearPolygonForBarangay(String barangayId) async {
    await ensureOfflineMappingTablesExist();
    final db = await database;
    
    print('🗺️ Clearing polygon for barangay: $barangayId');
    
    final polygonsDeleted = await db.delete(
      'barangay_polygons',
      where: 'barangay_id = ?',
      whereArgs: [barangayId],
    );
    
    print('   ✅ Deleted $polygonsDeleted polygon records for barangay $barangayId');
  }
  
  /// Clear all offline map data for specific barangay (tiles + polygon)
  Future<void> clearOfflineMapDataForBarangay(String barangayId) async {
    await ensureOfflineMappingTablesExist();
    
    print('🗺️ CLEARING OFFLINE MAP DATA FOR BARANGAY: $barangayId');
    
    await clearMapTilesForBarangay(barangayId);
    await clearPolygonForBarangay(barangayId);
    
    print('🗺️ OFFLINE MAP DATA CLEARED FOR BARANGAY $barangayId');
  }
  
  /// Get households with coordinates for mapping
  Future<List<Map<String, dynamic>>> getHouseholdsWithCoordinates([int? barangayId]) async {
    final db = await database;
    final result = await db.rawQuery('''
      SELECT 
        h.id,
        h.house_number,
        h.street,
        h.latitude,
        h.longitude,
        h.house_head,
        r.first_name || ' ' || r.last_name as house_head_name
      FROM households h
      LEFT JOIN residents r ON h.house_head = r.id
      WHERE h.latitude IS NOT NULL 
        AND h.longitude IS NOT NULL
        AND h.barangay_id = ?
      ORDER BY h.house_number
    ''', [barangayId]); // Use provided barangayId from secure storage
    
    return result;
  }
  
  /// Clear all offline mapping data
  Future<void> clearOfflineMappingData() async {
    await ensureOfflineMappingTablesExist();
    final db = await database;
    await db.delete('barangay_polygons');
    await db.delete('map_tiles');
  }
  
  /// Clear offline mapping data for specific barangay
  Future<void> clearBarangayOfflineData(String barangayId) async {
    await ensureOfflineMappingTablesExist();
    final db = await database;
    await db.delete(
      'barangay_polygons',
      where: 'barangay_id = ?',
      whereArgs: [barangayId],
    );
    await db.delete(
      'map_tiles',
      where: 'barangay_id = ?',
      whereArgs: [barangayId],
    );
  }
  
  /// Ensure puroks table has all required columns
  Future<void> _ensurePuroksColumnsExist(Database db) async {
    try {
      print('🔍 Checking puroks table schema...');
      
      // Check if leader column exists
      try {
        await db.rawQuery('SELECT leader FROM puroks LIMIT 1');
        print('✅ leader column exists in puroks table');
      } catch (e) {
        print('⚠️ leader column missing, adding...');
        await db.execute('ALTER TABLE puroks ADD COLUMN leader TEXT');
        print('✅ Added leader column to puroks table');
      }
      
      // Check if description column exists
      try {
        await db.rawQuery('SELECT description FROM puroks LIMIT 1');
        print('✅ description column exists in puroks table');
      } catch (e) {
        print('⚠️ description column missing, adding...');
        await db.execute('ALTER TABLE puroks ADD COLUMN description TEXT');
        print('✅ Added description column to puroks table');
      }
      
      print('✅ Puroks table schema verified');
    } catch (e) {
      print('❌ Error ensuring puroks columns exist: $e');
    }
  }
  
  /// Public method to verify and fix database schema
  /// Call this method when the app starts to ensure database integrity
  Future<void> verifyDatabaseSchema() async {
    try {
      print('🔍 Verifying database schema...');
      final db = await database;
      await _ensurePuroksColumnsExist(db);
      print('✅ Database schema verification completed');
    } catch (e) {
      print('❌ Error verifying database schema: $e');
    }
  }
  
  // Purok Sync Methods
  
  /// Get all pending puroks that need to be synced
  /// Only returns locally-created puroks (server_id is NULL)
  Future<List<Map<String, dynamic>>> getPendingPuroks() async {
    final db = await database;
    await _ensurePuroksColumnsExist(db);
    return await db.query(
      'puroks',
      where: 'sync_status = ? AND server_id IS NULL',  // ✅ Only locally created puroks
      whereArgs: ['pending'],
      orderBy: 'created_at ASC',
    );
  }
  
  /// Update purok with server ID and mark as synced
  Future<int> updatePurokServerId(int localId, int serverId) async {
    final db = await database;
    return await db.update(
      'puroks',
      {
        'server_id': serverId,
        'sync_status': 'synced',
        'updated_at': DateTime.now().toIso8601String(),
      },
      where: 'id = ?',
      whereArgs: [localId],
    );
  }
  
  /// Get server ID for a local purok ID
  Future<int?> getPurokServerId(int localId) async {
    final db = await database;
    final result = await db.query(
      'puroks',
      columns: ['server_id'],
      where: 'id = ?',
      whereArgs: [localId],
    );
    if (result.isEmpty) return null;
    return result.first['server_id'] as int?;
  }
  
  /// Get local ID for a server purok ID
  Future<int?> getPurokLocalId(int serverId) async {
    final db = await database;
    final result = await db.query(
      'puroks',
      columns: ['id'],
      where: 'server_id = ?',
      whereArgs: [serverId],
    );
    if (result.isEmpty) return null;
    return result.first['id'] as int?;
  }
  
  // Classification Types Sync Methods
  
  /// Get all pending classification types that need to be synced
  /// Only returns locally-created classification types (server_id is NULL)
  Future<List<Map<String, dynamic>>> getPendingClassificationTypes() async {
    await ensureClassificationTypesTableExists();
    final db = await database;
    return await db.query(
      'classification_types',
      where: 'sync_status = ? AND server_id IS NULL',  // ✅ Only locally created classifications
      whereArgs: ['pending'],
      orderBy: 'created_at ASC',
    );
  }
  
  /// Update classification type with server ID and mark as synced
  Future<int> updateClassificationTypeServerId(int localId, int serverId) async {
    await ensureClassificationTypesTableExists();
    final db = await database;
    return await db.update(
      'classification_types',
      {
        'server_id': serverId,
        'sync_status': 'synced',
        'updated_at': DateTime.now().toIso8601String(),
      },
      where: 'id = ?',
      whereArgs: [localId],
    );
  }
  
  /// Get server ID for a local classification type ID
  Future<int?> getClassificationTypeServerId(int localId) async {
    await ensureClassificationTypesTableExists();
    final db = await database;
    final result = await db.query(
      'classification_types',
      columns: ['server_id'],
      where: 'id = ?',
      whereArgs: [localId],
    );
    if (result.isEmpty) return null;
    return result.first['server_id'] as int?;
  }
  
  /// Get local ID for a server classification type ID
  Future<int?> getClassificationTypeLocalId(int serverId) async {
    await ensureClassificationTypesTableExists();
    final db = await database;
    final result = await db.query(
      'classification_types',
      columns: ['id'],
      where: 'server_id = ?',
      whereArgs: [serverId],
    );
    if (result.isEmpty) return null;
    return result.first['id'] as int?;
  }
  
}
