const { ConfigSchema } = require('./config/schema');
const { ZodError } = require('zod');
require('dotenv').config({ override: true });

function validateConfig() {
  try {
    return ConfigSchema.parse(process.env);
  } catch (err) {
    if (err instanceof ZodError) {
      console.error('\n❌ CONFIGURATION ERROR: Invalid environment variables');
      err.errors.forEach((e) => {
        const path = e.path.join('.') || 'Global';
        console.error(`   - ${path}: ${e.message}`);
      });
      console.error('\nPlease check your .env file and restart the agent.\n');
      process.exit(1);
    }
    throw err;
  }
}

const config = validateConfig();

module.exports = config;
module.exports.ConfigSchema = ConfigSchema;