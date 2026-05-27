import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pokemonPath = path.join(root, "src", "data", "pokemon.json");
const outputPath = path.join(root, "src", "data", "moves-gen9-sv.json");
const pokemon = JSON.parse(fs.readFileSync(pokemonPath, "utf8"));
const moveKeys = [...new Set(pokemon.map((entry) => entry.movesKey))].sort();

const emptyLearnset = () => ({
  levelUp: [],
  tm: [],
  evolution: [],
  egg: [],
});

const headingToGroup = new Map([
  ["moves learnt by level up", "levelUp"],
  ["moves learnt by tm", "tm"],
  ["moves learnt on evolution", "evolution"],
  ["egg moves", "egg"],
]);

function decodeHtml(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: "\"",
    eacute: "e",
  };

  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&([a-z]+);/gi, (_, name) => named[name.toLowerCase()] ?? `&${name};`)
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value) {
  return decodeHtml(String(value).replace(/<[^>]+>/g, " "));
}

function extractCategory(cellHtml) {
  const altMatch = cellHtml.match(/alt="([^"]+)"/i);
  if (altMatch) {
    return decodeHtml(altMatch[1]);
  }

  const sortMatch = cellHtml.match(/data-sort-value="([^"]+)"/i);
  if (sortMatch) {
    return decodeHtml(sortMatch[1]).replace(/^\w/, (letter) => letter.toUpperCase());
  }

  return stripTags(cellHtml);
}

function extractCells(rowHtml) {
  return [...rowHtml.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => match[1]);
}

function parseRows(tableHtml, group) {
  const bodyMatch = tableHtml.match(/<tbody>([\s\S]*?)<\/tbody>/i);
  if (!bodyMatch) {
    return [];
  }

  return [...bodyMatch[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((match) => extractCells(match[1]))
    .filter((cells) => cells.length > 0)
    .map((cells) => {
      const offset = group === "levelUp" || group === "tm" ? 1 : 0;
      const move = {
        name: stripTags(cells[offset]),
        type: stripTags(cells[offset + 1]),
        category: extractCategory(cells[offset + 2]),
        power: stripTags(cells[offset + 3]),
        accuracy: stripTags(cells[offset + 4]),
      };

      if (group === "levelUp") {
        move.level = stripTags(cells[0]);
      }

      if (group === "tm") {
        move.tm = stripTags(cells[0]);
      }

      return move;
    });
}

function extractScarletVioletPanel(html) {
  const tabMatch = html.match(/<a class="sv-tabs-tab[^"]*\bactive\b[^"]*" href="#([^"]+)">Scarlet\/Violet<\/a>/i)
    ?? html.match(/<a class="sv-tabs-tab[^"]*" href="#([^"]+)">Scarlet\/Violet<\/a>/i);

  if (!tabMatch) {
    return null;
  }

  const panelStart = html.indexOf(`id="${tabMatch[1]}"`);
  if (panelStart === -1) {
    return null;
  }

  const startDiv = html.lastIndexOf("<div", panelStart);
  if (startDiv === -1) {
    return null;
  }

  const tagPattern = /<\/?div\b[^>]*>/gi;
  tagPattern.lastIndex = startDiv;
  let depth = 0;

  for (const match of html.matchAll(tagPattern)) {
    const tag = match[0];
    if (tag.startsWith("</")) {
      depth -= 1;
    } else {
      depth += 1;
    }

    if (depth === 0) {
      return html.slice(startDiv, match.index + tag.length);
    }
  }

  return html.slice(startDiv);
}

function parseLearnset(html, sourceUrl) {
  const learnset = {
    ...emptyLearnset(),
    sourceUrl,
  };
  const panel = extractScarletVioletPanel(html);

  if (!panel) {
    learnset.note = "No Scarlet/Violet learnset panel found on PokemonDB generation 9 page.";
    return learnset;
  }

  const headingMatches = [...panel.matchAll(/<h3>([\s\S]*?)<\/h3>/gi)];

  headingMatches.forEach((match, index) => {
    const heading = stripTags(match[1]).toLowerCase();
    const group = headingToGroup.get(heading);
    if (!group) {
      return;
    }

    const sectionStart = match.index + match[0].length;
    const sectionEnd = index + 1 < headingMatches.length ? headingMatches[index + 1].index : panel.length;
    const sectionHtml = panel.slice(sectionStart, sectionEnd);
    const tableMatch = sectionHtml.match(/<table class="data-table">([\s\S]*?)<\/table>/i);

    learnset[group] = tableMatch ? parseRows(tableMatch[0], group) : [];
  });

  return learnset;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Pokemon Champions Pokedex data updater",
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.text();
}

const output = {};

for (const [index, key] of moveKeys.entries()) {
  const sourceUrl = `https://pokemondb.net/pokedex/${key}/moves/9`;
  process.stdout.write(`[${index + 1}/${moveKeys.length}] ${key} ... `);

  try {
    const html = await fetchText(sourceUrl);
    output[key] = parseLearnset(html, sourceUrl);
    const totalMoves = output[key].levelUp.length + output[key].tm.length + output[key].evolution.length + output[key].egg.length;
    process.stdout.write(`${totalMoves} moves\n`);
  } catch (error) {
    output[key] = {
      ...emptyLearnset(),
      sourceUrl,
      error: error.message,
    };
    process.stdout.write(`failed: ${error.message}\n`);
  }

  await new Promise((resolve) => setTimeout(resolve, 120));
}

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");
console.log(`Wrote ${Object.keys(output).length} learnsets to ${path.relative(root, outputPath)}.`);
