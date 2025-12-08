const https = require('https');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
    console.error("Error: API Key is not set in .env");
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

console.log(`Checking models at: ${url.replace(apiKey, 'HIDDEN')}`);

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.models) {
                console.log("\n--- Available Models ---");
                json.models.forEach(m => {
                    // Filter for generating content
                    if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                        console.log(m.name.replace('models/', ''));
                    }
                });
                console.log("------------------------\n");
            } else {
                console.log("Error response:", json);
            }
        } catch (e) {
            console.error("Failed to parse response:", e);
        }
    });
}).on('error', (e) => {
    console.error("Network error:", e);
});
