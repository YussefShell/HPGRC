
import { CreateMLCEngine, MLCEngine, InitProgressCallback } from "@mlc-ai/web-llm";

// Using the 4-bit quantized version of Phi-3.5 Mini for optimal laptop performance
const SELECTED_MODEL = "Phi-3.5-mini-instruct-q4f16_1-MLC";

let engine: MLCEngine | null = null;
let isInitializing = false;

export const initSovereignAI = async (
    onProgress: (text: string) => void
): Promise<void> => {
    if (engine) return;
    if (isInitializing) return;

    isInitializing = true;
    onProgress("Initializing WebGPU Engine...");

    try {
        const initProgressCallback: InitProgressCallback = (report) => {
            onProgress(report.text);
        };

        engine = await CreateMLCEngine(
            SELECTED_MODEL,
            { initProgressCallback }
        );

        onProgress("Sovereign AI Ready.");
    } catch (err) {
        console.error("Failed to load Sovereign AI:", err);
        onProgress("Initialization failed. Check WebGPU support.");
        isInitializing = false;
        throw err;
    }
};

export const askSovereignAI = async (
    systemPrompt: string,
    userQuery: string,
    onUpdate?: (chunk: string) => void
): Promise<string> => {
    if (!engine) {
        throw new Error("AI Engine not initialized. Please click the 'Initialize AI' button first.");
    }

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userQuery }
    ];

    const chunks = await engine.chat.completions.create({
        messages: messages as any,
        temperature: 0.7,
        max_tokens: 500,
        stream: true, // Enable streaming
    });

    let fullResponse = "";

    for await (const chunk of chunks) {
        const content = chunk.choices[0]?.delta?.content || "";
        fullResponse += content;
        if (onUpdate) onUpdate(fullResponse);
    }

    return fullResponse;
};

export const isAIReady = () => !!engine;
