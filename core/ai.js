// core/ai.js
const { loadSettings } = require("./settingsStore");

function applyTemplate(template, variables) {
    if (!template) return "";
    return template.replace(/{{(.*?)}}/g, (_, key) => {
        const k = key.trim();
        return variables[k] != null ? String(variables[k]) : "";
    });
}

/**
 * 调用 AI：
 * @param {string} roleName - settings.roles 里的 key，比如 "teacherQuestion"
 * @param {object} variables - 模板中可用的变量，如 { front, back, answer, input }
 */
async function callAIChat({ roleName, variables }) {
    const settings = loadSettings();
    const role = settings.roles?.[roleName];

    if (!role) {
        throw new Error(`Unknown AI role: ${roleName}`);
    }

    const modelConfig = settings.models?.[role.model];
    if (!modelConfig) {
        throw new Error(`Model '${role.model}' not found for role '${roleName}'`);
    }

    const apiKey = process.env[modelConfig.apiKeyEnvName];
    if (!apiKey) {
        throw new Error(`API key not found for env variable: ${modelConfig.apiKeyEnvName}`);
    }

    const systemPrompt = applyTemplate(role.template.system, variables || {});
    const userPrompt = applyTemplate(role.template.user, variables || {});

    const payload = {
        model: modelConfig.model,
        temperature: modelConfig.temperature,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ]
    };

    const response = await fetch(modelConfig.baseURL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message || JSON.stringify(data.error));
    }

    const choice = data.choices?.[0]?.message?.content;
    if (!choice) throw new Error("Invalid AI response.");

    return choice;
}

module.exports = callAIChat;
