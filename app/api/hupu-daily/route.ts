import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const HUPU_APP_URL =
  "https://activity-static.hupu.com/colorbox-activities/activity-project-ai-1783858284068/__ai_app.html";
const HUPU_API_BASE = "https://ricewell.ccwu.cc";

type Team = {
  teamId: number;
  abbrev: string;
  fullName: string;
};

type Category = {
  id: string;
  label: string;
  shortLabel: string;
  type: string;
  teamId?: number;
  teamAbbrev?: string;
  awardType?: string;
  statConfig?: Record<string, unknown>;
};

type PlayerRow = [
  number,
  string,
  string,
  number[],
  number[],
  number,
  unknown[],
];

type PuzzleStats = {
  total_players?: number;
  cell_sums?: Record<string, number>;
};

type RarityResponse = {
  cells?: Record<string, Record<string, number>>;
};

const teamNames: Record<string, string> = {
  ATL: "老鹰",
  BOS: "凯尔特人",
  CLE: "骑士",
  NOP: "鹈鹕",
  CHI: "公牛",
  DAL: "独行侠",
  DEN: "掘金",
  GSW: "勇士",
  HOU: "火箭",
  LAC: "快船",
  LAL: "湖人",
  MIA: "热火",
  MIL: "雄鹿",
  MIN: "森林狼",
  BKN: "篮网",
  NYK: "尼克斯",
  ORL: "魔术",
  IND: "步行者",
  PHI: "76人",
  PHX: "太阳",
  POR: "开拓者",
  SAC: "国王",
  SAS: "马刺",
  OKC: "雷霆",
  TOR: "猛龙",
  UTA: "爵士",
  MEM: "灰熊",
  WAS: "奇才",
  DET: "活塞",
  CHA: "黄蜂",
};

function extractJson<T>(source: string, variable: string): T {
  const marker = `var ${variable}=`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`未找到虎扑数据变量 ${variable}`);

  const valueStart = start + marker.length;
  const opener = source[valueStart];
  const closer = opener === "[" ? "]" : opener === "{" ? "}" : "";
  if (!closer) throw new Error(`虎扑数据变量 ${variable} 格式异常`);

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = valueStart; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === opener) depth += 1;
    if (char === closer) {
      depth -= 1;
      if (depth === 0) {
        const raw = source.slice(valueStart, index + 1);
        try {
          return JSON.parse(raw.replaceAll("\\'", "'")) as T;
        } catch (error) {
          throw new Error(
            `虎扑数据变量 ${variable} 无法解析：${
              error instanceof Error ? error.message : "未知格式错误"
            }`,
          );
        }
      }
    }
  }
  throw new Error(`虎扑数据变量 ${variable} 未闭合`);
}

function seededRandom(seedValue: number) {
  let seed = seedValue;
  return () => {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

function dateSeed(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function shuffled<T>(values: T[], random: () => number) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function teamCategory(team: Team): Category {
  return {
    id: team.abbrev.toLowerCase(),
    label: teamNames[team.abbrev] || team.fullName,
    shortLabel: team.abbrev,
    type: "team",
    teamId: team.teamId,
    teamAbbrev: team.abbrev,
  };
}

function playerMatches(
  player: PlayerRow,
  category: Category,
  playerBits: Record<string, number>,
) {
  if (category.type === "team") {
    if (player[0] === 1503 && category.teamId === 1610612759) return true;
    if (player[0] === 202684 && category.teamId === 1610612747) return true;
    return Boolean(category.teamId && player[3].includes(category.teamId));
  }
  const bit = playerBits[category.id];
  return bit !== undefined && (player[5] & (1 << bit)) !== 0;
}

function buildPuzzle(
  date: string,
  teams: Team[],
  otherCategories: Category[],
  players: PlayerRow[],
  playerBits: Record<string, number>,
) {
  const teamPlayers = new Map<number, Set<number>>();
  for (const player of players) {
    for (const teamId of player[3]) {
      if (!teamPlayers.has(teamId)) teamPlayers.set(teamId, new Set());
      teamPlayers.get(teamId)?.add(player[0]);
    }
  }

  const teamPairHasAnswer = (first: number, second: number) => {
    const firstSet = teamPlayers.get(first) || new Set<number>();
    const secondSet = teamPlayers.get(second) || new Set<number>();
    const [small, large] =
      firstSet.size <= secondSet.size
        ? [firstSet, secondSet]
        : [secondSet, firstSet];
    for (const playerId of small) if (large.has(playerId)) return true;
    return false;
  };

  const hasAnswer = (row: Category, column: Category) =>
    players.some(
      (player) =>
        playerMatches(player, row, playerBits) &&
        playerMatches(player, column, playerBits),
    );

  const eligibleCategories = otherCategories.filter(
    (category) =>
      category.type === "award" || category.type === "stat_career",
  );

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const random = seededRandom(dateSeed(date + attempt));
    const allTeams = shuffled(teams, random);
    const rows = allTeams.slice(0, 3).map(teamCategory);
    const columns = allTeams.slice(3, 6).map(teamCategory);
    const useOther = random() < 0.5;

    if (useOther && eligibleCategories.length) {
      const category =
        eligibleCategories[
          Math.floor(random() * eligibleCategories.length)
        ];
      const slot = Math.floor(random() * 3);
      const configured: Category = {
        id: category.id,
        label: category.label,
        shortLabel: category.shortLabel,
        type: category.type,
        awardType: category.awardType,
        statConfig: category.statConfig,
      };
      if (random() < 0.5) rows[slot] = configured;
      else columns[slot] = configured;
    }

    let valid = true;
    for (let row = 0; row < 3 && valid; row += 1) {
      for (let column = 0; column < 3 && valid; column += 1) {
        const rowCategory = rows[row];
        const columnCategory = columns[column];
        if (
          rowCategory.type === "team" &&
          columnCategory.type === "team"
        ) {
          valid = teamPairHasAnswer(
            rowCategory.teamId as number,
            columnCategory.teamId as number,
          );
        } else {
          valid = hasAnswer(rowCategory, columnCategory);
        }
      }
    }
    if (valid) return { rows, columns };
  }

  const fallback = shuffled(teams, seededRandom(dateSeed(date)));
  return {
    rows: fallback.slice(0, 3).map(teamCategory),
    columns: fallback.slice(3, 6).map(teamCategory),
  };
}

function displayName(
  player: PlayerRow,
  chineseNames: Record<string, string>,
) {
  const chinese = chineseNames[String(player[0])] || "";
  return {
    name: chinese || player[1],
    englishName: chinese && chinese !== player[1] ? player[1] : "",
  };
}

function fameScore(player: PlayerRow) {
  const milestones = [0, 1, 2, 3, 4].reduce(
    (score, bit) => score + ((player[5] & (1 << bit)) !== 0 ? 10 : 0),
    0,
  );
  const seasonBits = player[4].reduce((score, value) => {
    let bits = value;
    let count = 0;
    while (bits) {
      count += bits & 1;
      bits >>>= 1;
    }
    return score + count;
  }, 0);
  return milestones + Math.min(40, seasonBits * 2) - Math.min(15, player[3].length);
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/json",
      "User-Agent": "NBA-Grid-Player-Finder/1.0",
    },
  });
  if (!response.ok) throw new Error(`上游请求失败（${response.status}）`);
  return response.text();
}

export async function GET() {
  const updatedAt = new Date().toISOString();
  const date = updatedAt.slice(0, 10);

  try {
    const source = await fetchText(HUPU_APP_URL);
    const players = extractJson<PlayerRow[]>(source, "PD");
    const teams = extractJson<Team[]>(source, "TD");
    const categories = extractJson<Category[]>(source, "OC");
    const playerBits = extractJson<Record<string, number>>(source, "PB");
    const chineseNames = extractJson<Record<string, string>>(source, "CN");
    const puzzle = buildPuzzle(
      date,
      teams,
      categories,
      players,
      playerBits,
    );

    const probeCells = Array.from({ length: 9 }, (_, index) => ({
      row: Math.floor(index / 3),
      col: index % 3,
      pid: 0,
    }));
    const [statsResponse, rarityResponse] = await Promise.all([
      fetch(`${HUPU_API_BASE}/api/puzzle-stats?gid=${date}`, {
        cache: "no-store",
      }),
      fetch(`${HUPU_API_BASE}/api/cell-rarity`, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gid: date, cells: probeCells }),
      }),
    ]);
    if (!statsResponse.ok || !rarityResponse.ok) {
      throw new Error("虎扑稀有度接口暂时不可用");
    }
    const stats = (await statsResponse.json()) as PuzzleStats;
    const rarity = (await rarityResponse.json()) as RarityResponse;

    const cells: Record<string, unknown> = {};
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        const key = `${row}_${column}`;
        const rowCategory = puzzle.rows[row];
        const columnCategory = puzzle.columns[column];
        const bucket = rarity.cells?.[key] || {};
        const total = Object.values(bucket).reduce(
          (sum, count) => sum + Number(count || 0),
          0,
        );
        const candidates = players
          .filter(
            (player) =>
              playerMatches(player, rowCategory, playerBits) &&
              playerMatches(player, columnCategory, playerBits),
          )
          .map((player) => {
            const count = Number(bucket[String(player[0])] || 0);
            const names = displayName(player, chineseNames);
            return {
              playerId: player[0],
              ...names,
              currentCount: count,
              currentPct: total ? (count / total) * 100 : 0,
              projectedPct: ((count + 1) / (total + 1)) * 100,
              fame: fameScore(player),
            };
          })
          .sort(
            (first, second) =>
              first.currentCount - second.currentCount ||
              first.fame - second.fame ||
              first.name.localeCompare(second.name, "zh-CN"),
          )
          .slice(0, 16);

        cells[key] = {
          key,
          row: rowCategory,
          column: columnCategory,
          total,
          candidates,
        };
      }
    }

    return NextResponse.json(
      {
        ok: true,
        date,
        updatedAt,
        sourceUrl: HUPU_APP_URL,
        totalPlayers: stats.total_players || 0,
        cellSums: stats.cell_sums || {},
        rows: puzzle.rows,
        columns: puzzle.columns,
        cells,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=20, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        date,
        updatedAt,
        error:
          error instanceof Error ? error.message : "实时数据暂时不可用",
      },
      {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
