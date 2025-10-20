import { pgDb } from "lib/db/pg/db.pg";

async function checkTables() {
  try {
    const result = await pgDb.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('\n📊 Existing tables in database:');
    console.log('================================');
    result.rows.forEach((row: any) => {
      console.log(`  - ${row.table_name}`);
    });
    console.log(`\nTotal: ${result.rows.length} tables\n`);
    
    const ourTables = ['performance_history', 'concept_mastery', 'study_sessions', 'grade_predictions'];
    const existing = result.rows.filter((r: any) => ourTables.includes(r.table_name));
    
    if (existing.length > 0) {
      console.log('✅ Performance tracking tables found:');
      existing.forEach((r: any) => console.log(`  - ${r.table_name}`));
    } else {
      console.log('❌ Performance tracking tables NOT found');
      console.log('\nThese tables need to be created:');
      ourTables.forEach(t => console.log(`  - ${t}`));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkTables();
