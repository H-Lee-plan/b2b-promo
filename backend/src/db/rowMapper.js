function toCamelCase(snakeStr) {
  return snakeStr.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function mapRow(row) {
  const result = {};
  for (const key of Object.keys(row)) {
    result[toCamelCase(key)] = row[key];
  }
  return result;
}

function mapRows(rows) {
  return rows.map(mapRow);
}

module.exports = { mapRow, mapRows };
