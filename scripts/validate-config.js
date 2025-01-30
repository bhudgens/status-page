#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

// Initialize Ajv
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Load schema and config files
const schemaPath = path.join(__dirname, '..', 'config', 'schema.json');
const systemsPath = path.join(__dirname, '..', 'config', 'systems.json');

try {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    const systems = JSON.parse(fs.readFileSync(systemsPath, 'utf8'));

    // Add schema to validator
    const validate = ajv.compile(schema);

    // Validate systems configuration
    const valid = validate(systems);

    if (!valid) {
        console.error('Configuration validation failed:');
        validate.errors.forEach((error) => {
            console.error(`- ${error.instancePath}: ${error.message}`);
        });
        process.exit(1);
    }

    console.log('Configuration validation successful!');
    process.exit(0);
} catch (error) {
    console.error('Error during validation:', error.message);
    process.exit(1);
}
