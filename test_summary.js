async function testSummary() {
    const history = [
        { role: 'model', parts: [{ text: "それでは面接を始めます。まずは簡単に自己紹介をお願いします。" }] },
        { role: 'user', parts: [{ text: "はい、私は山田太郎と申します。大学では情報工学を専攻しており、特にWeb開発に興味を持っています。" }] },
        { role: 'model', parts: [{ text: "ありがとうございます。Web開発に興味を持ったきっかけは何ですか？" }] },
        { role: 'user', parts: [{ text: "大学の講義で初めてWebサイトを作った際に、自分の書いたコードが形になる面白さを感じたからです。" }] }
    ];

    try {
        console.log("Sending request to http://localhost:3000/api/mensetu/summary...");
        const response = await fetch('http://localhost:3000/api/mensetu/summary', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ history: history })
        });

        console.log("Response Status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }

        const data = await response.json();
        console.log("Response Data:", JSON.stringify(data, null, 2));

        if (data.overallScore && data.radarChart) {
            console.log("✅ Verification SUCCESS: Valid JSON received with required fields.");
        } else {
            console.error("❌ Verification FAILED: Missing required fields in response.");
        }

    } catch (error) {
        console.error("❌ Verification ERROR:", error.message);
    }
}

testSummary();
