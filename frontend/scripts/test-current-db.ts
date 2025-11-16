import pg from 'pg';
const { Client } = pg;

async function testConnection() {
  // This is the actual connection string from your .env file
  const connectionString = 'postgresql://neondb_owner:npg_qEo2tSb7HNIC@ep-ancient-scene-adjqsmnu-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

  console.log('Testing ACTUAL database connection from .env file\n');
  console.log('='.repeat(60));
  console.log('Hostname: ep-ancient-scene-adjqsmnu-pooler.c-2.us-east-1.aws.neon.tech');
  console.log('Database: neondb');
  console.log('User: neondb_owner');
  console.log('='.repeat(60));

  const client = new Client({ connectionString });

  try {
    console.log('\nAttempting to connect...');
    await client.connect();
    console.log('✓ Connected successfully!');

    // Test a simple query
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('\n✓ Query executed successfully!');
    console.log('Current time:', result.rows[0].current_time);
    console.log('PostgreSQL version:', result.rows[0].pg_version.split(',')[0]);

    // Check database size
    const dbSizeResult = await client.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `);
    console.log('Database size:', dbSizeResult.rows[0].size);

    // List tables
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('\nTables in database:', tablesResult.rows.length);
    if (tablesResult.rows.length > 0) {
      console.log('Table names:');
      tablesResult.rows.forEach((row, i) => {
        console.log(`  ${i + 1}. ${row.table_name}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✓ DATABASE CONNECTION SUCCESSFUL!');
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('\n✗ Connection failed!');
    console.error('Error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    console.log('\n' + '='.repeat(60));
    console.log('✗ DATABASE CONNECTION FAILED!');
    console.log('='.repeat(60));
  } finally {
    await client.end();
  }
}

testConnection().catch(console.error);
