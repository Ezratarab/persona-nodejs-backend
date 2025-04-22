const crypto = require('crypto');
const fs = require('fs');
const cron = require('node-cron');

const generateAESKey = () => {
    const key = crypto.randomBytes(32).toString('hex');
    console.log("Generated AES Key:", key);

    fs.writeFileSync('.env', `SECRET_KEY=${key}\n`, 'utf-8');
    console.log("Updated .env file with the new key.");
};

cron.schedule('0 0 * * 0', () => {
    console.log("Running weekly key rotation...");
    generateAESKey();
});

console.log("Key rotation scheduled. The script will run every Sunday at midnight.");