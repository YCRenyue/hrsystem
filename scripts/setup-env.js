#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const generateRandomKey = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

const copyEnvFile = (source, destination) => {
  try {
    if (!fs.existsSync(destination)) {
      let content = fs.readFileSync(source, 'utf8');
      
      // Replace placeholder values with generated ones
      content = content.replace(/your_super_secure_jwt_secret_here_at_least_32_characters/g, generateRandomKey(32));
      content = content.replace(/your_32_character_encryption_key_here/g, generateRandomKey(32));
      content = content.replace(/your_db_password_here/g, generateRandomKey(16));
      content = content.replace(/hr_password/g, generateRandomKey(16));
      content = content.replace(/hr_system_root/g, generateRandomKey(16));
      
      fs.writeFileSync(destination, content);
      console.log(`✅ Created ${destination}`);
    } else {
      console.log(`⚠️  ${destination} already exists, skipping...`);
    }
  } catch (error) {
    console.error(`❌ Error creating ${destination}:`, error.message);
  }
};

const createDirectories = () => {
  const dirs = [
    'backend/logs',
    'backend/uploads',
    'docker/ssl'
  ];
  
  dirs.forEach(dir => {
    const fullPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
};

const main = () => {
  console.log('🚀 Setting up HR Management System environment...\n');
  
  // Create necessary directories
  createDirectories();
  
  // Copy environment files
  copyEnvFile('.env.example', '.env');
  copyEnvFile('backend/.env.example', 'backend/.env');
  copyEnvFile('frontend/.env.example', 'frontend/.env');
  copyEnvFile('docker/.env.example', 'docker/.env');
  
  console.log('\n✨ Environment setup complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Review and update the .env files with your actual configuration');
  console.log('2. Set up your MySQL database');
  console.log('3. Configure DingTalk API credentials');
  console.log('4. Run "npm run db:migrate" to create database tables');
  console.log('5. Run "npm run dev" to start development servers');
  console.log('\n🐳 For Docker deployment:');
  console.log('1. Run "npm run docker:up" to start all services');
};

if (require.main === module) {
  main();
}

module.exports = { generateRandomKey, copyEnvFile, createDirectories };