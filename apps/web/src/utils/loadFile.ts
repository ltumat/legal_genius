export async function loadFile(filePath: string): Promise<string> {
  if (typeof Bun !== "undefined") {
    return await Bun.file(filePath).text();
  }
  const fs = await import("fs/promises");
  return await fs.readFile(filePath, "utf-8");
}