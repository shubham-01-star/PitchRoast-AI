import mysql from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';

async function initializeDatabase() {
  const connection = await mysql.createConnection({
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
  });

  try {
    console.log('Connecting to MySQL...');
    
    // Create database if it doesn't exist
    console.log(`Creating database '${config.database.name}' if not exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database.name}\``);
    await connection.query(`USE \`${config.database.name}\``);
    
    console.log('Reading schema file...');
    const schemaPath = path.join(__dirname, '../../schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    console.log('Executing schema...');
    // Split by semicolon and execute each statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      await connection.query(statement);
    }
    
    console.log('Database initialized successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

initializeDatabase();
