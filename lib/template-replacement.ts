function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function replaceTemplate(
  html: string,
  data: Record<string, unknown>
): string {
  return html.replace(
    /\{\{([a-zA-Z0-9_]+)\}\}/g,
    (_match, key: string) => {
      const value = data[key];

      if (value === null || value === undefined) {
        return "";
      }

      return escapeHtml(String(value));
    }
  );
}