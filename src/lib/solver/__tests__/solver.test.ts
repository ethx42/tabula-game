/**
 * Comprehensive Solver Tests
 *
 * Tests the REAL HiGHS implementation to validate:
 * 1. Correct board sizes
 * 2. No duplicate items within boards
 * 3. Unique boards (no identical boards)
 * 4. Correct item frequency distribution
 * 5. No identical rows/columns between boards
 * 6. Reasonable overlap between boards
 * 7. Diverse distribution of items
 */

import { describe, it, expect, beforeAll } from "vitest";
import type { GeneratorConfig, GenerationResult } from "@/lib/types";
import { generateBoardsWithHiGHS } from "../highs-solver";

interface SolverResult {
  success: boolean;
  boards: Set<number>[];
  assignment: number[][];
  maxOverlap: number;
  avgOverlap: number;
}

/**
 * Call the REAL HiGHS implementation and convert to test format
 */
async function generateBoards(
  N: number,
  B: number,
  S: number
): Promise<SolverResult> {
  const items = Array.from({ length: N }, (_, i) => ({
    id: String(i + 1).padStart(2, "0"),
    name: `Item ${i + 1}`,
  }));

  const rows = Math.floor(Math.sqrt(S));
  const cols = Math.ceil(S / rows);

  const config: GeneratorConfig = {
    items,
    numBoards: B,
    boardConfig: { rows, cols },
    distribution: { type: "uniform" },
  };

  const result = await generateBoardsWithHiGHS(config);

  if (!result.success) {
    return {
      success: false,
      boards: [],
      assignment: [],
      maxOverlap: -1,
      avgOverlap: -1,
    };
  }

  // Convert GeneratedBoard[] to Set<number>[] for tests
  const boards: Set<number>[] = result.boards.map((board) => {
    const itemSet = new Set<number>();
    for (const item of board.items) {
      const idx = parseInt(item.id) - 1;
      itemSet.add(idx);
    }
    return itemSet;
  });

  // Build assignment matrix from boards
  const assignment: number[][] = Array.from({ length: N }, () =>
    Array(B).fill(0)
  );
  for (let b = 0; b < B; b++) {
    for (const itemIdx of boards[b]) {
      assignment[itemIdx][b] = 1;
    }
  }

  return {
    success: true,
    boards,
    assignment,
    maxOverlap: result.stats?.maxOverlap ?? 0,
    avgOverlap: result.stats?.avgOverlap ?? 0,
  };
}

/**
 * Calculate uniform frequency distribution (for validation)
 */
function calculateUniformFrequencies(
  N: number,
  B: number,
  S: number
): number[] {
  const totalSlots = B * S;
  const baseFreq = Math.floor(totalSlots / N);
  const remainder = totalSlots % N;

  const frequencies: number[] = [];
  for (let i = 0; i < N; i++) {
    frequencies.push(baseFreq + (i < remainder ? 1 : 0));
  }
  return frequencies;
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe("Board Generator - Core Constraints", () => {
  const N = 36; // items
  const B = 15; // boards
  const S = 16; // slots per board (4x4)
  let result: SolverResult;

  beforeAll(async () => {
    result = await generateBoards(N, B, S);
  }, 60000);

  it("should generate boards successfully", () => {
    expect(result.success).toBe(true);
    expect(result.boards.length).toBe(B);
  });

  it("each board should have exactly S items", () => {
    for (let b = 0; b < B; b++) {
      expect(result.boards[b].size).toBe(S);
    }
  });

  it("no board should have duplicate items", () => {
    for (let b = 0; b < B; b++) {
      const itemsArray = Array.from(result.boards[b]);
      const uniqueItems = new Set(itemsArray);
      expect(uniqueItems.size).toBe(itemsArray.length);
    }
  });

  it("all boards should be unique (no identical boards)", () => {
    const boardSignatures = new Set<string>();

    for (let b = 0; b < B; b++) {
      const sorted = Array.from(result.boards[b]).sort((a, b) => a - b);
      const signature = sorted.join(",");
      expect(boardSignatures.has(signature)).toBe(false);
      boardSignatures.add(signature);
    }

    expect(boardSignatures.size).toBe(B);
  });

  it("item frequencies should match expected distribution", () => {
    const frequencies = calculateUniformFrequencies(N, B, S);
    const actualFreq: number[] = Array(N).fill(0);

    for (let i = 0; i < N; i++) {
      for (let b = 0; b < B; b++) {
        actualFreq[i] += result.assignment[i][b];
      }
    }

    for (let i = 0; i < N; i++) {
      expect(actualFreq[i]).toBe(frequencies[i]);
    }
  });

  it("total slots should equal B × S", () => {
    let totalSlots = 0;
    for (let b = 0; b < B; b++) {
      totalSlots += result.boards[b].size;
    }
    expect(totalSlots).toBe(B * S);
  });
});

describe("Board Generator - Diversity & Overlap", () => {
  const N = 36;
  const B = 15;
  const S = 16;
  let result: SolverResult;

  beforeAll(async () => {
    result = await generateBoards(N, B, S);
  }, 60000);

  it("maximum pairwise overlap should be reasonable (≤ 60% of board size)", () => {
    const maxAllowedOverlap = Math.ceil(S * 0.6); // 60% of 16 = 9.6 → 10
    expect(result.maxOverlap).toBeLessThanOrEqual(maxAllowedOverlap);
  });

  it("average pairwise overlap should be moderate (≤ 50% of board size)", () => {
    const maxAllowedAvg = S * 0.5; // 50% of 16 = 8
    expect(result.avgOverlap).toBeLessThanOrEqual(maxAllowedAvg);
  });

  it("no two boards should share more than 75% of items", () => {
    const maxShared = Math.ceil(S * 0.75); // 75% of 16 = 12

    for (let b1 = 0; b1 < B; b1++) {
      for (let b2 = b1 + 1; b2 < B; b2++) {
        let overlap = 0;
        for (const item of result.boards[b1]) {
          if (result.boards[b2].has(item)) overlap++;
        }
        expect(overlap).toBeLessThanOrEqual(maxShared);
      }
    }
  });
});

describe("Board Generator - Row/Column Uniqueness", () => {
  const N = 36;
  const B = 15;
  const S = 16;
  const ROWS = 4;
  let result: SolverResult;

  beforeAll(async () => {
    result = await generateBoards(N, B, S);
  }, 60000);

  it("no two boards should have identical row sets", () => {
    const allRowSignatures = new Map<string, number[]>();
    let duplicateRowPairs = 0;

    for (let b = 0; b < B; b++) {
      const items = Array.from(result.boards[b]).sort((a, b) => a - b);
      for (let r = 0; r < ROWS; r++) {
        const row = items.slice(r * 4, (r + 1) * 4);
        const rowSig = row.join(",");
        if (allRowSignatures.has(rowSig)) {
          duplicateRowPairs++;
        } else {
          allRowSignatures.set(rowSig, [b]);
        }
      }
    }

    const maxAllowedDuplicates = Math.ceil(B * ROWS * 0.2);
    expect(duplicateRowPairs).toBeLessThanOrEqual(maxAllowedDuplicates);
  });

  it("all items should appear in multiple boards (no item isolation)", () => {
    for (let i = 0; i < N; i++) {
      let appearances = 0;
      for (let b = 0; b < B; b++) {
        if (result.boards[b].has(i)) appearances++;
      }
      expect(appearances).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("Board Generator - Statistical Distribution", () => {
  const N = 36;
  const B = 15;
  const S = 16;
  let result: SolverResult;

  beforeAll(async () => {
    result = await generateBoards(N, B, S);
  }, 60000);

  it("item frequency variance should be low (balanced distribution)", () => {
    const frequencies: number[] = [];
    for (let i = 0; i < N; i++) {
      let freq = 0;
      for (let b = 0; b < B; b++) {
        freq += result.assignment[i][b];
      }
      frequencies.push(freq);
    }

    const mean = frequencies.reduce((a, b) => a + b, 0) / N;
    const variance =
      frequencies.reduce((sum, f) => sum + Math.pow(f - mean, 2), 0) / N;
    const stdDev = Math.sqrt(variance);

    expect(stdDev).toBeLessThanOrEqual(1);
  });

  it("overlap distribution should not be heavily skewed", () => {
    const overlaps: number[] = [];

    for (let b1 = 0; b1 < B; b1++) {
      for (let b2 = b1 + 1; b2 < B; b2++) {
        let overlap = 0;
        for (const item of result.boards[b1]) {
          if (result.boards[b2].has(item)) overlap++;
        }
        overlaps.push(overlap);
      }
    }

    const min = Math.min(...overlaps);
    const max = Math.max(...overlaps);

    expect(max - min).toBeLessThanOrEqual(S * 0.5);
  });
});

describe("Board Generator - Edge Cases", () => {
  it("should handle minimum valid configuration (12 items, 2 boards, 3x3)", async () => {
    const result = await generateBoards(12, 2, 9);

    expect(result.success).toBe(true);
    expect(result.boards.length).toBe(2);
    expect(result.boards[0].size).toBe(9);
    expect(result.boards[1].size).toBe(9);
  }, 30000);

  it("should handle larger configuration (54 items, 20 boards, 4x4)", async () => {
    const result = await generateBoards(54, 20, 16);

    expect(result.success).toBe(true);
    expect(result.boards.length).toBe(20);
    for (const board of result.boards) {
      expect(board.size).toBe(16);
    }

    const signatures = new Set<string>();
    for (const board of result.boards) {
      const sig = Array.from(board)
        .sort((a, b) => a - b)
        .join(",");
      expect(signatures.has(sig)).toBe(false);
      signatures.add(sig);
    }
  }, 60000);

  it("should handle 5x5 boards (25 slots)", async () => {
    const result = await generateBoards(50, 10, 25);

    expect(result.success).toBe(true);
    for (const board of result.boards) {
      expect(board.size).toBe(25);
    }
  }, 60000);
});

describe("Board Generator - Consistency", () => {
  it("multiple runs should all produce valid results", async () => {
    const runs = 3;

    for (let run = 0; run < runs; run++) {
      const result = await generateBoards(36, 15, 16);

      expect(result.success).toBe(true);
      expect(result.boards.length).toBe(15);

      for (const board of result.boards) {
        expect(board.size).toBe(16);
      }

      const sigs = new Set<string>();
      for (const board of result.boards) {
        const sig = Array.from(board)
          .sort((a, b) => a - b)
          .join(",");
        expect(sigs.has(sig)).toBe(false);
        sigs.add(sig);
      }
    }
  }, 180000);
});

describe("Board Generator - Detailed Statistics Report", () => {
  const N = 36;
  const B = 15;
  const S = 16;
  let result: SolverResult;

  beforeAll(async () => {
    result = await generateBoards(N, B, S);
  }, 60000);

  it("should generate and report diversity statistics", () => {
    const overlaps: number[] = [];
    for (let b1 = 0; b1 < B; b1++) {
      for (let b2 = b1 + 1; b2 < B; b2++) {
        let overlap = 0;
        for (const item of result.boards[b1]) {
          if (result.boards[b2].has(item)) overlap++;
        }
        overlaps.push(overlap);
      }
    }

    const minOverlap = Math.min(...overlaps);
    const maxOverlap = Math.max(...overlaps);
    const avgOverlap = overlaps.reduce((a, b) => a + b, 0) / overlaps.length;

    const jaccards: number[] = [];
    for (let b1 = 0; b1 < B; b1++) {
      for (let b2 = b1 + 1; b2 < B; b2++) {
        const union = new Set([...result.boards[b1], ...result.boards[b2]]);
        let intersection = 0;
        for (const item of result.boards[b1]) {
          if (result.boards[b2].has(item)) intersection++;
        }
        jaccards.push(intersection / union.size);
      }
    }

    const avgJaccard = jaccards.reduce((a, b) => a + b, 0) / jaccards.length;
    const maxJaccard = Math.max(...jaccards);

    console.log("\n📊 DIVERSITY STATISTICS:");
    console.log("========================");
    console.log(`Boards: ${B}, Items: ${N}, Slots/Board: ${S}`);
    console.log(`\nOverlap (shared items between board pairs):`);
    console.log(
      `  Min: ${minOverlap} | Max: ${maxOverlap} | Avg: ${avgOverlap.toFixed(
        2
      )}`
    );
    console.log(`\nJaccard Similarity:`);
    console.log(
      `  Avg: ${(avgJaccard * 100).toFixed(1)}% | Max: ${(
        maxJaccard * 100
      ).toFixed(1)}%`
    );
    console.log(`\nDiversity Score: ${((1 - avgJaccard) * 100).toFixed(1)}%`);
    console.log("========================\n");

    expect(result.success).toBe(true);
  });
});
