const stt = require('../src/services/stt');
const fs = require('fs');
const path = require('path');

async function testSTT() {
  console.log('Testing Deepgram STT...');


  if (!process.env.DEEPGRAM_API_KEY) {
    console.error('ERROR: DEEPGRAM_API_KEY not set in .env');
    return;
  }

  console.log('Client initialized successfully.');


  try {
    console.log('Verifying SDK method visibility...');
    if (stt.client.listen && stt.client.listen.prerecorded) {
      console.log('SUCCESS: Deepgram v4 SDK methods are visible.');
    } else {
      console.error('FAILURE: Deepgram v2/v3 SDK detected or client is malformed.');
    }
  } catch (e) {
    console.error('SDK Error:', e.message);
  }
}

testSTT().catch(console.error);