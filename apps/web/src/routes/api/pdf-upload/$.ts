import { createFileRoute } from "@tanstack/react-router";
import { Mistral } from "@mistralai/mistralai";
import { openai } from "@ai-sdk/openai";
import { Client } from "pg";
import { chunkLegalText } from "@/utils/chunkLegalText";
import { toSql } from 'pgvector';

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY!,
});

export const Route = createFileRoute("/api/pdf-upload/$")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // --- 1️⃣ Parse multipart form ---
          const formData = await request.formData();
          const file = formData.get("file") as File;
          if (!file) throw new Error("No file uploaded");

          // --- 2️⃣ Send PDF to Mistral OCR ---
          const arrayBuffer = await file.arrayBuffer();
          const pdfBase64 = Buffer.from(arrayBuffer).toString("base64");

          const mistralResult = await mistral.ocr.process({
            model: "mistral-ocr-latest",
            document: {
              documentUrl: `data:application/pdf;base64,${pdfBase64}`,
              type: "document_url",
            },
          });

          // --- 3️⃣ Extract all text ---
          const rawText = mistralResult.pages.map(p => p.markdown).join("\n\n");
          if (!rawText.trim()) throw new Error("PDF contains no readable text");

          // --- 4️⃣ Split text into law-aware chunks ---
          const chunks = chunkLegalText(rawText);

          // --- 5️⃣ Create embeddings for all chunks ---
          const embedModel = openai.embedding("text-embedding-3-small");
          const embeddingsResult = await embedModel.doEmbed({ values: chunks });
          const embeddings = embeddingsResult.embeddings; // array of number arrays

          // process.stdout.write(JSON.stringify(embeddings[0]));

          // --- 6️⃣ Store chunks + embeddings in Postgres ---
          console.log("Connecting to:", process.env.DATABASE_URL);
          const client = new Client({ connectionString: process.env.DATABASE_URL });
          await client.connect();

          // throw new Error(JSON.stringify(embeddings[0]));

          for (let i = 0; i < chunks.length; i++) {
            const vectorValue = toSql(embeddings[i]); // convert embedding array to pgvector literal

            try {
              await client.query(
                `INSERT INTO document_chunks (document_name, chunk_index, content, embedding)
                VALUES ($1, $2, $3, $4)`,
                [file.name, i, chunks[i], vectorValue]
              );
              console.log(`✅ Inserted chunk ${i}`);
            } catch (err) {
              console.error(`❌ Failed to insert chunk ${i}:`, err);
            }
          }

          await client.end();

          // --- ✅ Respond success ---
          return new Response(
            JSON.stringify({
              message: `Uploaded ${file.name} — ${chunks.length} chunks stored.`,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } catch (err: any) {
          console.error("Upload error:", err);
          return new Response(
            JSON.stringify({ error: err.message || String(err) }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      },
    },
  },
});
