const escapePostgrestQuotedValue = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

export const buildIlikeOrFilter = (columns: string[], value: string) => {
  const pattern = `%${escapePostgrestQuotedValue(value.trim())}%`;
  return columns.map((column) => `${column}.ilike."${pattern}"`).join(",");
};
