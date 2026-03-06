
const { fastClassify } = require('../src/services/fast-classifier');

const TEST_CASES = [

{ text: "stop the music in YouTube", expected: "media.stop" },
{ text: "pause the video on chrome", expected: "media.stop" },
{ text: "stop that now", expected: "media.stop" },
{ text: "resume the music on spotify", expected: "media.resume" },
{ text: "play again", expected: "media.resume" },


{ text: "list all my contacts of WhatsApp", expected: "whatsapp.contacts" },
{ text: "show wa contacts", expected: "whatsapp.contacts" },
{ text: "send a msg to Utkarsh on wa saying hello", expected: "whatsapp.send" },
{ text: "message 919876543210 on whatsapp: how are you?", expected: "whatsapp.send" },


{ text: "volume to 50", expected: "system.volume.set" },
{ text: "make it louder", expected: "system.volume.set" },
{ text: "mute sound", expected: "system.volume.mute" },
{ text: "brightness 80", expected: "system.brightness.set" },
{ text: "dim the screen", expected: "system.brightness.set" },


{ text: "play lofi hip hop on youtube", expected: "browser.play_youtube" },
{ text: "play some jazz", expected: "browser.play_youtube" },
{ text: "open google.com", expected: "browser.open" },
{ text: "can you please open wikipedia.org for me?", expected: "browser.open" },
{ text: "search for cats on google", expected: "browser.search" },
{ text: "look up the meaning of life on wikipedia", expected: "browser.search" },


{ text: "what's the weather in London?", expected: "knowledge.weather" },
{ text: "how is the weather in New York right now?", expected: "knowledge.weather" },
{ text: "define gravity", expected: "knowledge.define" },
{ text: "what is the meaning of existence", expected: "knowledge.define" },
{ text: "convert 100 usd to inr", expected: "knowledge.currency" },
{ text: "100 eur to usd", expected: "knowledge.currency" },


{ text: "tell me a joke", expected: "fun.joke" },
{ text: "give me a quote", expected: "fun.quote" },
{ text: "fun fact", expected: "fun.fact" },
{ text: "tell me something interesting", expected: "fun.fact" },


{ text: "what is your name?", expected: "chat.message" },
{ text: "who are you", expected: "chat.message" },
{ text: "who is this?", expected: "chat.message" },


{ text: "could you stop the music please?", expected: "media.stop" },
{ text: "please send a message to mom saying i am late on whatsapp", expected: "whatsapp.send" },
{ text: "hey kirtos define black hole", expected: "knowledge.define" }];


function runTests() {
  console.log("=== Kirtos Red Team: Fast Classifier Stress Test ===\n");
  let passed = 0;
  let failed = [];

  TEST_CASES.forEach((test) => {
    const result = fastClassify(test.text);
    if (result && result.intent === test.expected) {
      passed++;
      console.log(`✅ [PASS] "${test.text}" -> ${result.intent}`);
    } else {
      const actual = result ? result.intent : "NULL (Forwarded to NLP)";
      failed.push({ text: test.text, expected: test.expected, actual });
      console.log(`❌ [FAIL] "${test.text}" | Expected: ${test.expected} | Actual: ${actual}`);
    }
  });

  console.log(`\nResults: ${passed}/${TEST_CASES.length} passed.`);

  if (failed.length > 0) {
    console.log("\n--- Failure Details ---");
    failed.forEach((f) => {
      console.log(`Prompt: "${f.text}"`);
      console.log(`  Expected: ${f.expected}`);
      console.log(`  Actual:   ${f.actual}`);
      console.log("------------------------");
    });
    process.exit(1);
  } else {
    console.log("\n✨ All high-priority fast patterns are stable!");
    process.exit(0);
  }
}

runTests();