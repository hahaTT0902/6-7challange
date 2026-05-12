'use strict';

require('dotenv').config();

const prisma = require('../src/db');
const { MAX_ALLOWED_SCORE } = require('../src/utils/validation');

function parseArgNumber(name, defaultValue) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return defaultValue;
  const raw = process.argv[idx + 1];
  const n = Number.parseInt(raw, 10);
  return Number.isInteger(n) ? n : defaultValue;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const limit = parseArgNumber('--limit', 100);

  const where = {
    OR: [
      { userId: null },
      { score: { gt: MAX_ALLOWED_SCORE } },
    ],
  };

  const total = await prisma.score.count({ where });
  console.log(`[cleanup] MAX_ALLOWED_SCORE=${MAX_ALLOWED_SCORE}`);
  console.log(`[cleanup] Matched rows: ${total}`);

  if (total === 0) {
    console.log('[cleanup] Nothing to clean.');
    return;
  }

  const sample = await prisma.score.findMany({
    where,
    orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
    take: Math.max(1, limit),
    select: {
      id: true,
      nickname: true,
      score: true,
      userId: true,
      createdAt: true,
    },
  });

  console.log(`[cleanup] Previewing up to ${sample.length} rows:`);
  console.table(
    sample.map((r) => ({
      id: r.id,
      nickname: r.nickname,
      score: r.score,
      userId: r.userId,
      createdAt: r.createdAt,
      reason: r.userId == null ? 'anonymous' : `score>${MAX_ALLOWED_SCORE}`,
    }))
  );

  if (!apply) {
    console.log('[cleanup] Dry-run only. Re-run with --apply to delete these rows.');
    return;
  }

  const deleted = await prisma.score.deleteMany({ where });
  console.log(`[cleanup] Deleted rows: ${deleted.count}`);
}

main()
  .catch((err) => {
    console.error('[cleanup] Failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
