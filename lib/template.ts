export function replaceTemplate(
  html: string,
  data: Record<string, unknown>
): string {
  return html.replace(
    /\{\{\s*([^}]+?)\s*\}\}/g,
    (_match, key: string) => {
      const value = data[key.trim()];

      return value === null ||
        value === undefined
        ? ""
        : String(value);
    }
  );
}