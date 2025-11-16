import pg from 'pg';
const { Client } = pg;

async function testConnection(config: any, name: string) {
  console.log(`\n=== Testing ${name} ===`);
  console.log('Config:', JSON.stringify(config, null, 2));

  const client = new Client(config);

  try {
    console.log('Attempting to connect...');
    await client.connect();
    console.log('✓ Connected successfully!');

    // Test a simple query
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✓ Query executed successfully!');
    console.log('Current time:', result.rows[0].current_time);
    console.log('PostgreSQL version:', result.rows[0].pg_version.split(',')[0]);

    // Check database size
    const dbSizeResult = await client.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `);
    console.log('Database size:', dbSizeResult.rows[0].size);

    return true;
  } catch (error: any) {
    console.error('✗ Connection failed!');
    console.error('Error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    return false;
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('PostgreSQL Connection Test\n');
  console.log('='.repeat(50));

  // Test 1: Connection string format
  const connectionString = 'postgresql://neondb_owner:npg_yHvJxWwdLI06@ep-polished-bush-a4rlilp8-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';
  const test1Success = await testConnection(
    { connectionString },
    'Connection String Format'
  );

  console.log('\n' + '='.repeat(50));

  // Test 2: Individual parameters (Note: PostgreSQL default port is 5432, not 3306)
  const test2Success = await testConnection(
    {
      host: 'ep-polished-bush-a4rlilp8-pooler.us-east-1.aws.neon.tech',
      user: 'neondb_owner',
      password: 'npg_yHvJxWwdLI06',
      database: 'neondb',
      port: 5432, // PostgreSQL default port (3306 is MySQL)
      ssl: { rejectUnauthorized: false }
    },
    'Individual Parameters (Port 5432)'
  );

  console.log('\n' + '='.repeat(50));

  // Test 3: Individual parameters with the port you provided (3306 - MySQL port)
  const test3Success = await testConnection(
    {
      host: 'ep-polished-bush-a4rlilp8-pooler.us-east-1.aws.neon.tech',
      user: 'neondb_owner',
      password: 'npg_yHvJxWwdLI06',
      database: 'neondb',
      port: 3306, // MySQL port - likely incorrect for PostgreSQL
      ssl: { rejectUnauthorized: false }
    },
    'Individual Parameters (Port 3306 - MySQL port)'
  );

  console.log('\n' + '='.repeat(50));
  console.log('\n=== SUMMARY ===');
  console.log(`Connection String: ${test1Success ? '✓ SUCCESS' : '✗ FAILED'}`);
  console.log(`Individual Params (Port 5432): ${test2Success ? '✓ SUCCESS' : '✗ FAILED'}`);
  console.log(`Individual Params (Port 3306): ${test3Success ? '✓ SUCCESS' : '✗ FAILED'}`);

  console.log('\n=== NOTES ===');
  console.log('- PostgreSQL default port: 5432');
  console.log('- MySQL default port: 3306');
  console.log('- Your connection string uses port 5432 (default)');
  console.log('- The individual parameters you provided use port 3306 (MySQL port)');
  console.log('- For PostgreSQL (Neon.tech), use port 5432');
}

main().catch(console.error);
