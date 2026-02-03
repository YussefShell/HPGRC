
import { AzureOpenAI } from "openai";

export interface AzureConfig {
    apiKey: string;
    endpoint: string;
    deployment: string;
}

const STORAGE_KEY = 'azure_ai_config';

export const saveAzureConfig = (config: AzureConfig) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};

export const getAzureConfig = (): AzureConfig | null => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
};

export const clearAzureConfig = () => {
    localStorage.removeItem(STORAGE_KEY);
};

export const askAzureAI = async (
    systemPrompt: string,
    userQuery: string,
    onUpdate?: (chunk: string) => void
): Promise<string> => {
    const config = getAzureConfig();
    if (!config) throw new Error("Azure Configuration missing.");

    const client = new AzureOpenAI({
        apiKey: config.apiKey,
        endpoint: config.endpoint,
        apiVersion: "2024-02-15-preview", // Stable preview version
        deployment: config.deployment,
        dangerouslyAllowBrowser: true // Required since we are running client-side
    });

    const stream = await client.chat.completions.create({
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userQuery }
        ],
        model: config.deployment,
        max_tokens: 800,
        temperature: 0.7,
        stream: true,
    });

    let fullResponse = "";

    for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        fullResponse += content;
        if (onUpdate) onUpdate(fullResponse);
    }

    return fullResponse;
};
