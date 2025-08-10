import { readFileSync } from 'fs';
import { join } from 'path';
import { DatabaseConnection } from './connection';

interface LegacySample {
  id: number;
  content: string;
  label: 'normal' | 'clickbait';
  wordCount: number;
  qualityScore: number;
  createdAt: string;
}

export class DatabaseMigrator {
  
  /**
   * Initialize database with schema
   */
  static async initializeSchema(): Promise<void> {
    console.log('Initializing database schema...');
    
    try {
      const schemaSQL = readFileSync(
        join(__dirname, 'schema.sql'), 
        'utf-8'
      );
      
      await DatabaseConnection.query(schemaSQL);
      console.log('✅ Database schema initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize schema:', error);
      throw error;
    }
  }

  /**
   * Migrate JSON data to PostgreSQL
   */
  static async migrateJSONData(): Promise<void> {
    console.log('Starting JSON to PostgreSQL migration...');
    
    try {
      // Check if data already exists
      const existingCount = await DatabaseConnection.query(
        'SELECT COUNT(*) as count FROM text_samples'
      );
      
      if (existingCount.rows[0].count > 0) {
        console.log('⚠️ Data already exists in database. Skipping migration.');
        return;
      }

      // Try to read existing JSON files
      const dataDirectories = [
        '../../data/persistent/',
        '../../../data/persistent/'
      ];

      let samples: LegacySample[] = [];
      
      for (const dir of dataDirectories) {
        try {
          const samplesPath = join(__dirname, dir, 'samples.json');
          const fileContent = readFileSync(samplesPath, 'utf-8');
          samples = JSON.parse(fileContent);
          console.log(`📁 Found samples.json with ${samples.length} records`);
          break;
        } catch (error) {
          // Try next path
          continue;
        }
      }

      if (samples.length === 0) {
        console.log('📝 No existing JSON data found. Creating sample data...');
        samples = DatabaseMigrator.createSampleData();
      }

      // Insert data into PostgreSQL
      for (const sample of samples) {
        await DatabaseConnection.query(
          `INSERT INTO text_samples (content, label, word_count, quality_score, created_at) 
           VALUES ($1, $2, $3, $4, $5)`,
          [
            sample.content,
            sample.label,
            sample.wordCount,
            sample.qualityScore,
            new Date(sample.createdAt)
          ]
        );
      }

      console.log(`✅ Successfully migrated ${samples.length} samples to PostgreSQL`);
      
      // Print summary
      const summary = await DatabaseConnection.query(`
        SELECT 
          label,
          COUNT(*) as count,
          AVG(quality_score) as avg_quality
        FROM text_samples 
        GROUP BY label
      `);
      
      console.log('📊 Migration Summary:');
      summary.rows.forEach((row: any) => {
        console.log(`  ${row.label}: ${row.count} samples (avg quality: ${Number(row.avg_quality).toFixed(2)})`);
      });

    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Create sample data if no existing data found
   */
  private static createSampleData(): LegacySample[] {
    const sampleData: LegacySample[] = [
      // Normal news samples
      {
        id: 1,
        content: "央行发布最新货币政策报告，强调稳健货币政策取向",
        label: "normal",
        wordCount: 22,
        qualityScore: 0.85,
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        content: "教育部公布2024年高考改革方案，多省份将实施新政策",
        label: "normal", 
        wordCount: 25,
        qualityScore: 0.88,
        createdAt: new Date().toISOString()
      },
      {
        id: 3,
        content: "科技企业发布Q3财报，营收同比增长15%",
        label: "normal",
        wordCount: 18,
        qualityScore: 0.82,
        createdAt: new Date().toISOString()
      },
      
      // Clickbait samples
      {
        id: 4,
        content: "震惊！这个方法让我一夜暴富，你绝对想不到！",
        label: "clickbait",
        wordCount: 20,
        qualityScore: 0.15,
        createdAt: new Date().toISOString()
      },
      {
        id: 5,
        content: "太可怕了！看完这个视频我整个人都不好了！！！",
        label: "clickbait",
        wordCount: 22,
        qualityScore: 0.12,
        createdAt: new Date().toISOString()
      },
      {
        id: 6,
        content: "99%的人都不知道的秘密！赶紧看看！",
        label: "clickbait",
        wordCount: 18,
        qualityScore: 0.18,
        createdAt: new Date().toISOString()
      }
    ];

    return sampleData;
  }

  /**
   * Run all migration steps
   */
  static async runMigration(): Promise<void> {
    try {
      console.log('🚀 Starting database migration...');
      
      await DatabaseMigrator.initializeSchema();
      await DatabaseMigrator.migrateJSONData();
      
      // Test connection
      const isHealthy = await DatabaseConnection.healthCheck();
      if (isHealthy) {
        console.log('✅ Database connection healthy');
      } else {
        throw new Error('Database health check failed');
      }
      
      console.log('🎉 Migration completed successfully!');
      
    } catch (error) {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    }
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  DatabaseMigrator.runMigration()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}