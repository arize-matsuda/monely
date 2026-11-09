/**
 * デモ用のダミーデータを入れる / 消す。
 *
 *   node scripts/seed-demo.mjs            # 何を入れるか表示するだけ（既定）
 *   node scripts/seed-demo.mjs --apply    # 実際に入れる
 *   node scripts/seed-demo.mjs --undo     # このスクリプトが入れたものだけ消す
 *
 * **本番の DB に書き込む。** そのため次の安全策を入れてある。
 *
 *   1. 既定は dry-run。`--apply` を付けないと 1 行も書かない
 *   2. 入れた行の ID を `.seed-demo-ids.json` に残し、`--undo` で**それだけ**消す
 *      （日付やカテゴリで消すと、手で入れた本物の記録を巻き込む）
 *   3. 世帯が 2 つ以上ある場合は `--household=<id>` を要求する
 *
 * 入れるのは `transactions` と `budgets` だけ。
 * 世帯・メンバー・カテゴリ・認証のテーブルには触らない。
 */
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { config } from "dotenv";

config({ path: ".env.local" });
const pg = (await import("pg")).default;

const ID_FILE = new URL("../.seed-demo-ids.json", import.meta.url);

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const undo = args.includes("--undo");
const householdArg = args
  .find((a) => a.startsWith("--household="))
  ?.slice("--household=".length);

/** 乱数。実行ごとに結果が変わらないよう種を固定する（LCG） */
let seed = 20261109;
function random() {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}
function pick(list) {
  return list[Math.floor(random() * list.length)];
}
/** 下限と上限の整数（百円単位に丸める。家計の金額として自然にする） */
function amount(min, max) {
  const value = min + random() * (max - min);
  return Math.max(1, Math.round(value / 100) * 100);
}

/**
 * 月ごとの支出の型。
 * `fixed` は毎月ほぼ同額のもの（定期支出の印を付ける）。
 */
const EXPENSE_PLAN = [
  {
    name: "住居",
    fixed: true,
    day: 27,
    count: 1,
    min: 85000,
    max: 85000,
    memos: ["家賃"],
  },
  {
    name: "通信",
    fixed: true,
    day: 15,
    count: 1,
    min: 4980,
    max: 4980,
    memos: ["携帯・光回線"],
  },
  {
    name: "水道・光熱",
    fixed: true,
    day: 20,
    count: 1,
    min: 8000,
    max: 15000,
    memos: ["電気・ガス・水道"],
  },
  {
    name: "食費",
    count: [12, 18],
    min: 400,
    max: 4500,
    memos: ["スーパー", "コンビニ", "ドラッグストア", "八百屋", "パン屋", null],
  },
  {
    name: "日用品",
    count: [2, 5],
    min: 300,
    max: 2500,
    memos: ["洗剤・ティッシュ", "ドラッグストア", null],
  },
  {
    name: "交通",
    count: [4, 8],
    min: 200,
    max: 1500,
    memos: ["電車", "バス", null],
  },
  {
    name: "趣味・娯楽",
    count: [1, 3],
    min: 1000,
    max: 8000,
    memos: ["本", "映画", "サブスク", null],
  },
  {
    name: "衣服・美容",
    count: [0, 2],
    min: 2000,
    max: 12000,
    memos: ["美容院", "服", null],
  },
  {
    name: "医療・健康",
    count: [0, 1],
    min: 800,
    max: 5000,
    memos: ["病院", "薬", null],
  },
  {
    name: "交際費",
    count: [0, 2],
    min: 3000,
    max: 9000,
    memos: ["飲み会", "手土産", null],
  },
];

/** 収入 */
const INCOME_PLAN = [
  {
    name: "給与",
    fixed: true,
    day: 25,
    min: 320000,
    max: 320000,
    memos: ["給与"],
  },
  // 6 月と 12 月だけ
  {
    name: "賞与",
    months: [6, 12],
    day: 10,
    min: 380000,
    max: 420000,
    memos: ["賞与"],
  },
];

/** 予算（カテゴリ名 → 月の予算） */
const BUDGET_PLAN = {
  食費: 60000,
  日用品: 8000,
  交通: 8000,
  "趣味・娯楽": 15000,
  "衣服・美容": 15000,
};

/**
 * **当月は意図的に途中までにする。**
 * 「入れ忘れ？」（FR-L11）と「毎月の支出」（FR-R2）が実際に動く状態を作るため、
 * 当月は住居・通信・水道・光熱を入れない。
 */
const SKIP_IN_CURRENT_MONTH = new Set(["住居", "通信", "水道・光熱"]);

/** その月の日数 */
function lastDayOf(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** `YYYY-MM-DD` の文字列。date 型にそのまま渡す */
function dateKey(year, month, day) {
  const clamped = Math.min(day, lastDayOf(year, month));
  return `${year}-${String(month).padStart(2, "0")}-${String(clamped).padStart(2, "0")}`;
}

function countOf(plan) {
  if (plan.count === undefined) return 1;
  if (typeof plan.count === "number") return plan.count;
  const [lo, hi] = plan.count;
  return lo + Math.floor(random() * (hi - lo + 1));
}

/** 直近 6 か月ぶんの行を組み立てる（当月を含む） */
function buildRows(options) {
  const { categories, profileId, householdId, today } = options;
  const rows = [];
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  for (let back = 5; back >= 0; back -= 1) {
    const date = new Date(Date.UTC(currentYear, currentMonth - 1 - back, 1));
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const isCurrent = back === 0;
    // 当月は「今日まで」しか記録がないのが自然
    const maxDay = isCurrent ? today.getDate() : lastDayOf(year, month);

    for (const plan of EXPENSE_PLAN) {
      if (isCurrent && SKIP_IN_CURRENT_MONTH.has(plan.name)) continue;
      const categoryId = categories.get(`expense:${plan.name}`);
      if (categoryId === undefined) continue;

      for (let i = 0; i < countOf(plan); i += 1) {
        const day = plan.day ?? 1 + Math.floor(random() * maxDay);
        if (day > maxDay) continue;
        rows.push({
          id: randomUUID(),
          householdId,
          occurredOn: dateKey(year, month, day),
          kind: "expense",
          amount: amount(plan.min, plan.max),
          categoryId,
          paidById: profileId,
          memo: pick(plan.memos),
          recurring: plan.fixed === true,
          createdById: profileId,
        });
      }
    }

    for (const plan of INCOME_PLAN) {
      if (plan.months !== undefined && !plan.months.includes(month)) continue;
      if (isCurrent && plan.day > maxDay) continue;
      const categoryId = categories.get(`income:${plan.name}`);
      if (categoryId === undefined) continue;
      rows.push({
        id: randomUUID(),
        householdId,
        occurredOn: dateKey(year, month, plan.day),
        kind: "income",
        amount: amount(plan.min, plan.max),
        categoryId,
        paidById: profileId,
        memo: pick(plan.memos),
        recurring: plan.fixed === true,
        createdById: profileId,
      });
    }
  }

  return rows;
}

function readIds() {
  if (!existsSync(ID_FILE)) return null;
  return JSON.parse(readFileSync(ID_FILE, "utf8"));
}

async function main() {
  const client = new pg.Client({
    connectionString: process.env.DIRECT_URL,
    connectionTimeoutMillis: 15000,
  });
  await client.connect();

  try {
    if (undo) {
      const saved = readIds();
      if (saved === null) {
        console.log(
          "`.seed-demo-ids.json` が無いので、何を消せばよいか分かりません。\n" +
            "手で入れた記録と区別できないため、日付やカテゴリでの一括削除は行いません。",
        );
        return;
      }
      const tx = await client.query(
        "delete from transactions where id = any($1::uuid[])",
        [saved.transactionIds],
      );
      const bg = await client.query(
        "delete from budgets where id = any($1::uuid[])",
        [saved.budgetIds],
      );
      console.log(
        `記録を ${tx.rowCount} 件、予算を ${bg.rowCount} 件消しました。`,
      );
      unlinkSync(ID_FILE);
      return;
    }

    const households = await client.query(
      "select id, name from households order by created_at",
    );
    if (households.rowCount === 0) {
      console.log("世帯がありません。先にアプリで世帯を作ってください。");
      return;
    }
    let householdId = householdArg;
    if (householdId === undefined) {
      if (households.rowCount > 1) {
        console.log("世帯が複数あります。--household=<id> で指定してください:");
        for (const row of households.rows) {
          console.log(`  ${row.id}  ${row.name}`);
        }
        return;
      }
      householdId = households.rows[0].id;
    }

    const profiles = await client.query(
      "select id, display_name from profiles where household_id = $1 order by created_at",
      [householdId],
    );
    if (profiles.rowCount === 0) {
      console.log("この世帯にメンバーがいません。");
      return;
    }
    const profileId = profiles.rows[0].id;

    const categoryRows = await client.query(
      "select id, kind, name from categories where household_id = $1",
      [householdId],
    );
    const categories = new Map(
      categoryRows.rows.map((row) => [`${row.kind}:${row.name}`, row.id]),
    );

    const today = new Date();
    const rows = buildRows({ categories, profileId, householdId, today });

    const budgets = Object.entries(BUDGET_PLAN)
      .map(([name, value]) => ({
        id: randomUUID(),
        householdId,
        categoryId: categories.get(`expense:${name}`),
        amount: value,
      }))
      .filter((budget) => budget.categoryId !== undefined);

    // --- 何をするかを先に出す -------------------------------------------
    const expense = rows.filter((r) => r.kind === "expense");
    const income = rows.filter((r) => r.kind === "income");
    const months = [
      ...new Set(rows.map((r) => r.occurredOn.slice(0, 7))),
    ].sort();
    const existing = await client.query(
      "select count(*)::int n from transactions where household_id = $1",
      [householdId],
    );

    console.log(
      `世帯: ${households.rows.find((r) => r.id === householdId)?.name}`,
    );
    console.log(`既存の記録: ${existing.rows[0].n} 件（消さない）`);
    console.log(`対象の月: ${months.join(", ")}`);
    console.log(
      `入れる記録: ${rows.length} 件（支出 ${expense.length} / 収入 ${income.length}）`,
    );
    console.log(
      `  うち定期の印つき: ${rows.filter((r) => r.recurring).length} 件`,
    );
    console.log(`入れる予算: ${budgets.length} 件`);
    console.log(
      `**当月は ${[...SKIP_IN_CURRENT_MONTH].join("・")} を入れません**` +
        "（「入れ忘れ？」と「毎月の支出」が動く状態にするため）",
    );

    if (!apply) {
      console.log(
        "\n--apply を付けると実際に書き込みます（いまは何もしていません）。",
      );
      return;
    }

    // --- 書き込み -------------------------------------------------------
    await client.query("begin");
    for (const row of rows) {
      await client.query(
        // updated_at は Prisma の @updatedAt（クライアント側で埋める）なので
        // DB に既定値が無い。生 SQL では自分で入れる
        `insert into transactions
           (id, household_id, occurred_on, kind, amount, category_id, paid_by, memo, recurring, created_by, updated_at)
         values ($1, $2, $3::date, $4::kind, $5, $6, $7, $8, $9, $10, now())`,
        [
          row.id,
          row.householdId,
          row.occurredOn,
          row.kind,
          row.amount,
          row.categoryId,
          row.paidById,
          row.memo,
          row.recurring,
          row.createdById,
        ],
      );
    }
    for (const budget of budgets) {
      await client.query(
        `insert into budgets (id, household_id, category_id, amount, updated_at)
         values ($1, $2, $3, $4, now())
         on conflict (household_id, category_id) do nothing`,
        [budget.id, budget.householdId, budget.categoryId, budget.amount],
      );
    }
    await client.query("commit");

    writeFileSync(
      ID_FILE,
      `${JSON.stringify(
        {
          createdAt: new Date().toISOString(),
          householdId,
          transactionIds: rows.map((r) => r.id),
          budgetIds: budgets.map((b) => b.id),
        },
        null,
        2,
      )}\n`,
    );

    console.log(`\n入れました。消すときは node scripts/seed-demo.mjs --undo`);
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

await main();
