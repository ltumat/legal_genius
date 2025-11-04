export function chunkLegalText(text: string): string[] {
  // Normalize whitespace and fix line breaks
  text = text.replace(/\r?\n+/g, "\n").replace(/\s{2,}/g, " ");

  // Split by Swedish law patterns: "1 kap. 2 §"
  const sections = text.split(/(?=\d+\s*kap\.\s*\d+\s*§)/gi);

  const chunks: string[] = [];
  let buffer = "";

  for (const s of sections) {
    const trimmed = s.trim();
    if (!trimmed) continue;

    // Merge small sections to avoid under-sized chunks
    if ((buffer + trimmed).length < 800) buffer += trimmed + "\n";
    else {
      if (buffer.trim()) chunks.push(buffer.trim());
      buffer = trimmed;
    }
  }

  if (buffer.trim()) chunks.push(buffer.trim());
  return chunks;
}
