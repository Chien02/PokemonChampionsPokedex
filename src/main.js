import rawPokemonData from "./data/pokemon.json";
import movesData from "./data/moves-gen9-sv.json";
import "./styles.css";

const app = document.querySelector("#app");
const pokemonData = rawPokemonData.map((pokemon, rosterIndex) => ({ ...pokemon, rosterIndex }));

const typeOptions = [
  "normal",
  "fire",
  "water",
  "grass",
  "electric",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
];

const moveGroups = [
  ["levelUp", "Level Up"],
  ["tm", "TM"],
  ["evolution", "Evolution"],
  ["egg", "Egg"],
];

const heroPokemon = [
  { name: "Mega Charizard X", sprite: "10034", className: "hero-card-large" },
  { name: "Gengar", sprite: "94", className: "hero-card-offset" },
  { name: "Lucario", sprite: "448", className: "hero-card-low" },
  { name: "Meowscarada", sprite: "908", className: "hero-card-thin" },
];

const marquees = ["Pokemon Champions", "Gen IX", "Moves DB", "Mega Index", "PokeAPI Art", "Stats Engine"];

const state = {
  query: "",
  type: "all",
  mega: "all",
  dexDirection: "asc",
  statSort: {
    key: null,
    direction: null,
  },
  moveSort: [],
  expandedRowKey: null,
};

function buildPokeApiSpriteUrl(spriteValue) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${spriteValue}.png`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getRowKey(pokemon) {
  return `${pokemon.movesKey}-${pokemon.rosterIndex}`;
}

function isMegaPokemon(pokemon) {
  return pokemon.form.toLowerCase().includes("mega") || pokemon.name.startsWith("Mega ");
}

function renderShell() {
  const uniqueSpeciesCount = new Set(pokemonData.map((pokemon) => pokemon.id)).size;
  const megaCount = pokemonData.filter(isMegaPokemon).length;
  const moveKeyCount = new Set(pokemonData.map((pokemon) => pokemon.movesKey)).size;
  const formCount = pokemonData.filter((pokemon) => pokemon.form).length;

  app.innerHTML = `
    <main class="pokedex-container">
      <header class="hero-section" aria-labelledby="heroTitle">
        <div class="hero-copy">
          <span class="eyebrow">Pokemon Champions / Pokedex Studio</span>
          <h1 id="heroTitle">Battle data built like a <span>midnight lab.</span></h1>
          <p>Browse Champions stats, abilities, forms, and Gen 9 Scarlet/Violet moves in a sharp dark interface tuned for fast comparison.</p>
        </div>
        <div class="hero-art-grid" aria-label="Featured Pokemon artwork">
          ${heroPokemon.map(renderHeroArtwork).join("")}
        </div>
      </header>

      <section class="marquee-band" aria-label="Data sources and features">
        <div class="marquee-track">
          ${renderMarqueeSet()}
          ${renderMarqueeSet()}
        </div>
      </section>

      <section class="system-grid" aria-label="Pokedex system statistics">
        ${renderSystemMetric("Species", uniqueSpeciesCount)}
        ${renderSystemMetric("Rows", pokemonData.length)}
        ${renderSystemMetric("Forms", formCount)}
        ${renderSystemMetric("Mega", megaCount)}
        ${renderSystemMetric("Move Sets", moveKeyCount)}
      </section>

      <section class="workspace-section" aria-labelledby="workspaceTitle">
        <div class="section-heading">
          <span class="eyebrow">Live database</span>
          <h2 id="workspaceTitle">Champions Works</h2>
        </div>

        <section class="search-filter-panel" aria-label="Pokedex controls">
          <div class="control-item">
            <label for="searchBar">Tìm kiếm tên loài</label>
            <input type="search" id="searchBar" placeholder="Nhập tên Pokemon..." autocomplete="off" />
          </div>
          <div class="control-item">
            <label for="filterType">Bộ lọc hệ</label>
            <select id="filterType">
              <option value="all">Tất cả hệ</option>
              ${typeOptions.map((type) => `<option value="${type}">${type}</option>`).join("")}
            </select>
          </div>
          <div class="control-item">
            <label for="filterMega">Bộ lọc Mega Evolution</label>
            <select id="filterMega">
              <option value="all">Tất cả Pokemon</option>
              <option value="mega-only">Chỉ Mega Evolution</option>
            </select>
          </div>
          <div class="control-item">
            <label for="sortOrder">Sắp xếp National Dex</label>
            <select id="sortOrder">
              <option value="asc">Tăng dần (#0001 -> ...)</option>
              <option value="desc">Giảm dần (... -> #0001)</option>
            </select>
          </div>
          <div class="counter-box" id="pokedexCounter">Đang tải dữ liệu...</div>
        </section>

        <div class="table-responsive">
          <table class="pokedex-table">
            <thead>
              <tr>
                <th rowspan="2" class="column-toggle" aria-label="Mở moves"></th>
                <th rowspan="2" class="column-ndex">Số NDex</th>
                <th rowspan="2" class="column-sprite">Sprite</th>
                <th rowspan="2" class="column-name">Tên Pokemon / Phân dạng</th>
                <th rowspan="2" class="column-types">Hệ</th>
                <th colspan="2" class="group-header">Đặc tính</th>
                <th colspan="7" class="group-header">Stats</th>
              </tr>
              <tr>
                <th class="column-ability">Thường</th>
                <th class="column-ability">Ẩn</th>
                ${renderStatHeader("hp", "HP")}
                ${renderStatHeader("atk", "Atk")}
                ${renderStatHeader("def", "Def")}
                ${renderStatHeader("spa", "SpA")}
                ${renderStatHeader("spd", "SpD")}
                ${renderStatHeader("spe", "Spe")}
                ${renderStatHeader("total", "Tổng")}
              </tr>
            </thead>
            <tbody id="pokedexEngineBody"></tbody>
          </table>
        </div>
      </section>
    </main>
  `;

  document.querySelector("#searchBar").addEventListener("input", (event) => {
    state.query = event.target.value.toLowerCase().trim();
    renderTable();
  });

  document.querySelector("#filterType").addEventListener("change", (event) => {
    state.type = event.target.value;
    renderTable();
  });

  document.querySelector("#filterMega").addEventListener("change", (event) => {
    state.mega = event.target.value;
    renderTable();
  });

  document.querySelector("#sortOrder").addEventListener("change", (event) => {
    state.dexDirection = event.target.value;
    state.statSort = { key: null, direction: null };
    renderTable();
  });

  document.querySelectorAll("[data-sort-key]").forEach((button) => {
    button.addEventListener("click", () => setStatSort(button.dataset.sortKey));
  });
}

function renderHeroArtwork(item) {
  const spriteUrl = buildPokeApiSpriteUrl(item.sprite);

  return `
    <figure class="hero-art-card ${item.className}">
      <img src="${spriteUrl}" alt="${escapeHtml(item.name)}" loading="lazy" />
      <figcaption>${escapeHtml(item.name)}</figcaption>
    </figure>
  `;
}

function renderMarqueeSet() {
  return marquees.map((label) => `<span>${label}</span>`).join("");
}

function renderSystemMetric(label, value) {
  return `
    <div class="system-metric">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function renderStatHeader(key, label) {
  return `
    <th class="column-stat">
      <button type="button" class="stat-sort-button" data-sort-key="${key}">
        ${label}<span class="sort-indicator" data-sort-indicator="${key}"></span>
      </button>
    </th>
  `;
}

function renderAbilityList(abilities) {
  if (!abilities || abilities.length === 0) {
    return `<span class="empty-cell">-</span>`;
  }

  return `
    <div class="ability-list">
      ${abilities.map((ability) => `<span class="ability-chip">${escapeHtml(ability)}</span>`).join("")}
    </div>
  `;
}

function renderTypeBadges(types) {
  return `
    <div class="type-tags-container">
      ${types.map((type) => `<span class="type-tag ${type}">${type}</span>`).join("")}
    </div>
  `;
}

function renderFormBadge(pokemon) {
  if (!pokemon.form) {
    return "";
  }

  return `<span class="badge ${isMegaPokemon(pokemon) ? "badge-mega" : "badge-form"}">${escapeHtml(pokemon.form)}</span>`;
}

function setStatSort(key) {
  if (state.statSort.key !== key) {
    state.statSort = { key, direction: "asc" };
  } else if (state.statSort.direction === "asc") {
    state.statSort = { key, direction: "desc" };
  } else {
    state.statSort = { key: null, direction: null };
  }

  renderTable();
}

function getSortValue(pokemon, key) {
  if (key === "id") {
    return pokemon.id;
  }

  return pokemon.stats[key];
}

function applyCurrentSort(targetData) {
  const activeKey = state.statSort.key || "id";
  const direction = state.statSort.key ? state.statSort.direction : state.dexDirection;
  const directionFactor = direction === "asc" ? 1 : -1;

  targetData.sort((alpha, beta) => {
    const primary = getSortValue(alpha, activeKey) - getSortValue(beta, activeKey);
    if (primary !== 0) {
      return primary * directionFactor;
    }

    if (alpha.id !== beta.id) {
      return alpha.id - beta.id;
    }

    return alpha.rosterIndex - beta.rosterIndex;
  });
}

function updateSortIndicators() {
  document.querySelectorAll("[data-sort-indicator]").forEach((indicator) => {
    const isActive = state.statSort.key === indicator.dataset.sortIndicator;
    indicator.textContent = isActive ? (state.statSort.direction === "asc" ? " +" : " -") : "";
  });
}

function getFilteredPokemon() {
  const processedData = pokemonData.filter((pokemon) => {
    const isNameMatched = pokemon.name.toLowerCase().includes(state.query);
    const isTypeMatched = state.type === "all" || pokemon.types.includes(state.type);
    const isMegaMatched = state.mega === "all" || isMegaPokemon(pokemon);

    return isNameMatched && isTypeMatched && isMegaMatched;
  });

  applyCurrentSort(processedData);
  return processedData;
}

function renderTable() {
  const tbody = document.querySelector("#pokedexEngineBody");
  const filteredPokemon = getFilteredPokemon();
  const visibleKeys = new Set(filteredPokemon.map(getRowKey));

  if (state.expandedRowKey && !visibleKeys.has(state.expandedRowKey)) {
    state.expandedRowKey = null;
  }

  updateSortIndicators();
  tbody.innerHTML = filteredPokemon.map(renderPokemonRows).join("");
  document.querySelector("#pokedexCounter").textContent = `Kết quả: Đang hiển thị ${filteredPokemon.length} / ${pokemonData.length} Pokemon hợp lệ`;

  tbody.querySelectorAll("[data-expand-row]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleExpandedRow(button.dataset.expandRow);
    });
  });

  tbody.querySelectorAll("[data-row-key]").forEach((row) => {
    row.addEventListener("click", () => toggleExpandedRow(row.dataset.rowKey));
  });

  tbody.querySelectorAll("[data-move-sort-key]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      setMoveSort(button.dataset.moveSortKey);
    });
  });
}

function toggleExpandedRow(rowKey) {
  state.expandedRowKey = state.expandedRowKey === rowKey ? null : rowKey;
  renderTable();
}

function setMoveSort(key) {
  if (state.moveSort.includes(key)) {
    state.moveSort = state.moveSort.filter((activeKey) => activeKey !== key);
  } else {
    state.moveSort = [...state.moveSort, key];
  }

  renderTable();
}

function getMoveSortPriority(key) {
  const index = state.moveSort.indexOf(key);
  return index === -1 ? "" : String(index + 1);
}

function parseMovePower(power) {
  const value = Number.parseInt(String(power ?? "").replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(value) ? value : null;
}

function getMoveSortValue(move, key) {
  if (key === "power") {
    return parseMovePower(move.power);
  }

  if (key === "category") {
    return String(move.category ?? "").toLowerCase();
  }

  return String(move.type ?? "").toLowerCase();
}

function compareMoveValues(alpha, beta, key) {
  const alphaValue = getMoveSortValue(alpha, key);
  const betaValue = getMoveSortValue(beta, key);

  if (key === "power") {
    if (alphaValue === null && betaValue === null) return 0;
    if (alphaValue === null) return 1;
    if (betaValue === null) return -1;
    return betaValue - alphaValue;
  }

  return alphaValue.localeCompare(betaValue);
}

function applyMoveSort(moves) {
  if (state.moveSort.length === 0) {
    return moves;
  }

  return moves
    .map((move, index) => ({ move, index }))
    .sort((alpha, beta) => {
      for (const key of state.moveSort) {
        const comparison = compareMoveValues(alpha.move, beta.move, key);
        if (comparison !== 0) {
          return comparison;
        }
      }

      return alpha.index - beta.index;
    })
    .map(({ move }) => move);
}

function renderPokemonRows(pokemon) {
  const rowKey = getRowKey(pokemon);
  const isExpanded = state.expandedRowKey === rowKey;
  const spriteUrl = buildPokeApiSpriteUrl(pokemon.sprite);
  const expandLabel = isExpanded ? "Đóng moves" : "Mở moves";

  const pokemonRow = `
    <tr class="pokemon-row ${isExpanded ? "is-expanded" : ""}" data-row-key="${rowKey}">
      <td class="toggle-cell">
        <button type="button" class="expand-button" data-expand-row="${rowKey}" aria-expanded="${isExpanded}" aria-label="${expandLabel} for ${escapeHtml(pokemon.name)}">
          ${isExpanded ? "-" : "+"}
        </button>
      </td>
      <td class="ndex-cell">${escapeHtml(pokemon.num)}</td>
      <td class="sprite-cell">
        <div class="sprite-wrapper">
          <img src="${spriteUrl}" alt="${escapeHtml(pokemon.name)}" loading="lazy" onerror="this.onerror=null; this.src='${buildPokeApiSpriteUrl(pokemon.id)}';" />
        </div>
      </td>
      <td class="name-cell">
        <span class="pkmn-name">${escapeHtml(pokemon.name)}</span>${renderFormBadge(pokemon)}
      </td>
      <td class="types-cell">${renderTypeBadges(pokemon.types)}</td>
      <td class="ability-cell">${renderAbilityList(pokemon.abilities.normal)}</td>
      <td class="ability-cell">${renderAbilityList(pokemon.abilities.hidden)}</td>
      <td class="stat-cell">${pokemon.stats.hp}</td>
      <td class="stat-cell">${pokemon.stats.atk}</td>
      <td class="stat-cell">${pokemon.stats.def}</td>
      <td class="stat-cell">${pokemon.stats.spa}</td>
      <td class="stat-cell">${pokemon.stats.spd}</td>
      <td class="stat-cell">${pokemon.stats.spe}</td>
      <td class="stat-cell stat-total-cell">${pokemon.stats.total}</td>
    </tr>
  `;

  if (!isExpanded) {
    return pokemonRow;
  }

  return `
    ${pokemonRow}
    <tr class="moves-row">
      <td colspan="14">
        ${renderMovesPanel(pokemon)}
      </td>
    </tr>
  `;
}

function renderMovesPanel(pokemon) {
  const moves = movesData[pokemon.movesKey] || {};
  const sourceUrl = moves.sourceUrl || `https://pokemondb.net/pokedex/${pokemon.movesKey}/moves/9`;

  return `
    <section class="moves-panel" aria-label="Scarlet and Violet moves for ${escapeHtml(pokemon.name)}">
      <div class="moves-panel-header">
        <div>
          <h2>${escapeHtml(pokemon.name)} moves</h2>
          <p>Gen 9 Scarlet/Violet learnset. Mega and custom Champions forms inherit their base species moves.</p>
        </div>
        <a href="${sourceUrl}" target="_blank" rel="noreferrer">PokemonDB source</a>
      </div>
      <div class="moves-grid">
        ${moveGroups.map(([key, label]) => renderMoveGroup(label, moves[key] || [], key)).join("")}
      </div>
    </section>
  `;
}

function renderMoveGroup(label, moves, key) {
  const sortedMoves = applyMoveSort(moves);

  return `
    <section class="move-group">
      <h3>${label} <span>${moves.length}</span></h3>
      ${
        moves.length === 0
          ? `<p class="empty-moves">-</p>`
          : `
            <div class="move-table-scroll">
              <table class="move-table">
                <thead>
                  <tr>
                    ${key === "levelUp" ? "<th>Lv.</th>" : ""}
                    ${key === "tm" ? "<th>TM</th>" : ""}
                    <th>Move</th>
                    <th>${renderMoveSortButton("type", "Type")}</th>
                    <th>${renderMoveSortButton("category", "Cat.")}</th>
                    <th>${renderMoveSortButton("power", "Power")}</th>
                    <th>Acc.</th>
                  </tr>
                </thead>
                <tbody>
                  ${sortedMoves.map((move) => renderMoveRow(move, key)).join("")}
                </tbody>
              </table>
            </div>
          `
      }
    </section>
  `;
}

function renderMoveSortButton(key, label) {
  const priority = getMoveSortPriority(key);

  return `
    <button type="button" class="move-sort-button ${priority ? "is-active" : ""}" data-move-sort-key="${key}">
      ${label}<span class="move-sort-indicator">${priority}</span>
    </button>
  `;
}

function renderMoveRow(move, key) {
  return `
    <tr>
      ${key === "levelUp" ? `<td class="move-num">${escapeHtml(move.level)}</td>` : ""}
      ${key === "tm" ? `<td class="move-num">${escapeHtml(move.tm)}</td>` : ""}
      <td class="move-name">${escapeHtml(move.name)}</td>
      <td><span class="move-type type-tag ${escapeHtml(move.type.toLowerCase())}">${escapeHtml(move.type)}</span></td>
      <td>${escapeHtml(move.category)}</td>
      <td class="move-num">${escapeHtml(move.power)}</td>
      <td class="move-num">${escapeHtml(move.accuracy)}</td>
    </tr>
  `;
}

renderShell();
renderTable();
