

 async function callAIChat({ apiKeyEnvName, aiUrl, modelName, temperature, messages }) {
    const apiKey = process.env[apiKeyEnvName];

    if (!apiKey) {
        throw new Error(`API key not found for env variable: ${apiKeyEnvName}`);
    }

    const response = await fetch(aiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: modelName,
            temperature,
            messages
        })
    });

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message || JSON.stringify(data.error));
    }

    const choice = data.choices?.[0]?.message?.content;
    if (!choice) throw new Error('Invalid AI response.');

    return choice;
}
module.exports = callAIChat;