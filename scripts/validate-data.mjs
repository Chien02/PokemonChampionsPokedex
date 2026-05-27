import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pokemonPath = path.join(root, "src", "data", "pokemon.json");
const movesPath = path.join(root, "src", "data", "moves-gen9-sv.json");

const pokemon = JSON.parse(fs.readFileSync(pokemonPath, "utf8"));
const moves = JSON.parse(fs.readFileSync(movesPath, "utf8"));
const expectedGroups = ["levelUp", "tm", "evolution", "egg"];
const errors = [];

if (pokemon.length !== 268) {
  errors.push(`Expected 268 pokemon rows, found ${pokemon.length}.`);
}

pokemon.forEach((entry, index) => {
  if (!entry.movesKey) {
    errors.push(`Row ${index} (${entry.name}) is missing movesKey.`);
  }

  if (!entry.stats || ["hp", "atk", "def", "spa", "spd", "spe", "total"].some((key) => typeof entry.stats[key] !== "number")) {
    errors.push(`Row ${index} (${entry.name}) has incomplete stats.`);
  }

  if (!entry.abilities || !Array.isArray(entry.abilities.normal) || !Array.isArray(entry.abilities.hidden)) {
    errors.push(`Row ${index} (${entry.name}) has incomplete abilities.`);
  }
});

const uniqueMoveKeys = [...new Set(pokemon.map((entry) => entry.movesKey))];

uniqueMoveKeys.forEach((key) => {
  if (!moves[key]) {
    errors.push(`Missing moves entry for ${key}.`);
    return;
  }

  expectedGroups.forEach((group) => {
    if (!Array.isArray(moves[key][group])) {
      errors.push(`Moves entry ${key} is missing array group ${group}.`);
    }
  });
});

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Validated ${pokemon.length} pokemon rows and ${uniqueMoveKeys.length} move learnsets.`);
