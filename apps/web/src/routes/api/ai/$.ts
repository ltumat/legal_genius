import { createFileRoute } from "@tanstack/react-router";
import { streamText, type UIMessage, convertToModelMessages } from "ai";
import { openai } from "@ai-sdk/openai";
import path from "path";
import { XMLParser } from "fast-xml-parser";
import { loadFile } from "@/utils/loadFile";
import { fileURLToPath } from "url";

async function loadSystemPrompt() {
	const __dirname = path.dirname(fileURLToPath(import.meta.url));
	const filePath = path.resolve(__dirname, "../../../../prompts/system-prompt.xml");
	const xml = await loadFile(filePath);

	const parser = new XMLParser({ ignoreAttributes: false });
	const data = parser.parse(xml);

	const p = data.prompt;
	const rules = Array.isArray(p.rules.rule) ? p.rules.rule.join("\n") : p.rules.rule;

	// Merge relevant sections into a single system prompt string
	const systemPrompt = `
Version ${p["@_version"]}, Jurisdiction: ${p["@_jurisdiction"]}
Persona: ${p.persona}
Tone: ${p.tone}
Disclaimers: ${p.disclaimers}

Rules:
${rules}

Response Format:
${p.outputFormat}
`;

	return systemPrompt.trim();
}

export const Route = createFileRoute("/api/ai/$")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const { messages }: { messages: UIMessage[] } = await request.json();

					const systemPrompt = await loadSystemPrompt();

					const result = streamText({
						model: openai("gpt-4o-mini"),
						messages: [
							{ role: "system", content: systemPrompt },
							...convertToModelMessages(messages),
						],
					});

					return result.toUIMessageStreamResponse();
				} catch (error) {
					console.error("AI API error:", error);
					return new Response(
						JSON.stringify({ error: "Failed to process AI request" }),
						{
							status: 500,
							headers: { "Content-Type": "application/json" },
						},
					);
				}
			},
		},
	},
});
