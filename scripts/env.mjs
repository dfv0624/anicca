import fs from "node:fs";

export function loadEnv(path = ".env") {
  if (!fs.existsSync(path)) {
    return {};
  }

  const entries = fs
    .readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      if (separator === -1) {
        return [line.trim(), ""];
      }

      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim();
      return [key, value];
    });

  return Object.fromEntries(entries);
}

export function requireEnv(env, key) {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing ${key} in .env`);
  }

  return value;
}
