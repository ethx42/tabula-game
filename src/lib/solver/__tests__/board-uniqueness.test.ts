/**
 * Board Uniqueness Test Suite
 *
 * Tests the ACTUAL HiGHS implementation to validate that every generated board is unique.
 * Two boards are considered IDENTICAL if they contain the exact same set of items,
 * regardless of visual order/shuffle.
 */

import { describe, it, expect } from "vitest";
import type { GeneratorConfig, GenerationResult } from "@/lib/types";
import { generateBoardsWithHiGHS } from "../highs-solver";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get board signature (sorted item IDs) for uniqueness comparison
 */
function getBoardSignature(board: { items: Array<{ id: string }> }): string {
  return board.items
    .map((item) => item.id)
    .sort()
    .join(",");
}

/**
 * Find duplicate boards by comparing signatures - O(n) optimized version
 * Uses a Map to count signature frequencies instead of O(n²) pairwise comparison
 */
function findDuplicates(
  result: GenerationResult
): Array<{ board1: number; board2: number; signature: string }> {
  if (!result.success || !result.boards) return [];

  // O(n) - Build signature map with board indices
  const signatureMap = new Map<string, number[]>();

  for (let i = 0; i < result.boards.length; i++) {
    const sig = getBoardSignature(result.boards[i]);
    if (!signatureMap.has(sig)) {
      signatureMap.set(sig, []);
    }
    signatureMap.get(sig)!.push(i);
  }

  // Collect duplicates from map entries with more than 1 board
  const duplicates: Array<{
    board1: number;
    board2: number;
    signature: string;
  }> = [];

  for (const [signature, boardIndices] of signatureMap) {
    if (boardIndices.length > 1) {
      // Report all pairs of duplicates
      for (let i = 0; i < boardIndices.length; i++) {
        for (let j = i + 1; j < boardIndices.length; j++) {
          duplicates.push({
            board1: boardIndices[i] + 1,
            board2: boardIndices[j] + 1,
            signature,
          });
        }
      }
    }
  }

  return duplicates;
}

/**
 * Call the REAL HiGHS solver implementation
 */
async function callRealGenerator(
  itemCount: number,
  boardCount: number,
  rows: number,
  cols: number
): Promise<GenerationResult> {
  const items = Array.from({ length: itemCount }, (_, i) => ({
    id: String(i + 1).padStart(2, "0"),
    name: `Item ${i + 1}`,
  }));

  const config: GeneratorConfig = {
    items,
    numBoards: boardCount,
    boardConfig: { rows, cols },
    distribution: { type: "uniform" },
  };

  return generateBoardsWithHiGHS(config);
}

/**
 * Helper: Assert all boards are unique (reduces code repetition)
 */
function assertAllBoardsUnique(result: GenerationResult): void {
  expect(result.success).toBe(true);

  const duplicates = findDuplicates(result);
  if (duplicates.length > 0) {
    console.error("❌ DUPLICATE BOARDS FOUND:");
    duplicates.forEach((dup) => {
      console.error(
        `  Boards ${dup.board1} and ${dup.board2}: [${dup.signature}]`
      );
    });
  }
  expect(duplicates.length).toBe(0);

  // Double-check with Set
  const signatures = new Set(result.boards.map(getBoardSignature));
  expect(signatures.size).toBe(result.boards.length);
}

// ============================================================================
// UNIT TESTS FOR HELPER FUNCTIONS (Prueba Negativa / False Positive Test)
// ============================================================================

describe("Helper Functions - Unit Tests", () => {
  it("getBoardSignature should produce identical signatures for same items in different order", () => {
    const board1 = { items: [{ id: "01" }, { id: "02" }, { id: "03" }] };
    const board2 = { items: [{ id: "03" }, { id: "01" }, { id: "02" }] };
    const board3 = { items: [{ id: "02" }, { id: "03" }, { id: "01" }] };

    expect(getBoardSignature(board1)).toBe(getBoardSignature(board2));
    expect(getBoardSignature(board2)).toBe(getBoardSignature(board3));
  });

  it("getBoardSignature should produce different signatures for different items", () => {
    const board1 = { items: [{ id: "01" }, { id: "02" }, { id: "03" }] };
    const board2 = { items: [{ id: "01" }, { id: "02" }, { id: "04" }] };

    expect(getBoardSignature(board1)).not.toBe(getBoardSignature(board2));
  });

  it("findDuplicates should correctly identify identical boards", () => {
    const mockResult = {
      success: true,
      boards: [
        { items: [{ id: "01" }, { id: "02" }] },
        { items: [{ id: "02" }, { id: "01" }] }, // Identical after sort
      ],
    } as unknown as GenerationResult;

    const duplicates = findDuplicates(mockResult);
    expect(duplicates.length).toBe(1);
    expect(duplicates[0].board1).toBe(1);
    expect(duplicates[0].board2).toBe(2);
  });

  it("findDuplicates should return empty for unique boards", () => {
    const mockResult = {
      success: true,
      boards: [
        { items: [{ id: "01" }, { id: "02" }] },
        { items: [{ id: "03" }, { id: "04" }] },
        { items: [{ id: "05" }, { id: "06" }] },
      ],
    } as unknown as GenerationResult;

    expect(findDuplicates(mockResult).length).toBe(0);
  });

  it("findDuplicates should handle multiple duplicate groups", () => {
    const mockResult = {
      success: true,
      boards: [
        { items: [{ id: "01" }, { id: "02" }] }, // Group A - board 1
        { items: [{ id: "03" }, { id: "04" }] }, // Group B - board 2
        { items: [{ id: "02" }, { id: "01" }] }, // Group A - board 3 (dup of 1)
        { items: [{ id: "04" }, { id: "03" }] }, // Group B - board 4 (dup of 2)
      ],
    } as unknown as GenerationResult;

    const duplicates = findDuplicates(mockResult);
    expect(duplicates.length).toBe(2); // Two duplicate pairs
  });
});

// ============================================================================
// INTEGRATION TESTS - Testing REAL Implementation
// ============================================================================

describe("Board Uniqueness - Standard Configuration (36 items, 15 boards, 4×4)", () => {
  it("should generate all unique boards", async () => {
    const result = await callRealGenerator(36, 15, 4, 4);
    assertAllBoardsUnique(result);
    expect(result.boards.length).toBe(15);
  }, 60000);

  it("each board should have exactly 16 items", async () => {
    const result = await callRealGenerator(36, 15, 4, 4);
    expect(result.success).toBe(true);
    for (const board of result.boards) {
      expect(board.items.length).toBe(16);
    }
  }, 60000);
});

describe("Board Uniqueness - Multiple Configurations", () => {
  const configs = [
    { items: 12, boards: 2, rows: 3, cols: 3, name: "Minimal 3×3" },
    { items: 16, boards: 4, rows: 3, cols: 3, name: "Small 3×3" },
    { items: 25, boards: 8, rows: 4, cols: 4, name: "Medium 4×4" },
    { items: 36, boards: 15, rows: 4, cols: 4, name: "Standard 4×4" },
    { items: 54, boards: 20, rows: 4, cols: 4, name: "Large 4×4" },
    { items: 50, boards: 10, rows: 5, cols: 5, name: "5×5 boards" },
  ];

  for (const cfg of configs) {
    it(`${cfg.name}: ${cfg.items} items, ${cfg.boards} boards - all unique`, async () => {
      const result = await callRealGenerator(
        cfg.items,
        cfg.boards,
        cfg.rows,
        cfg.cols
      );
      assertAllBoardsUnique(result);
      expect(result.boards.length).toBe(cfg.boards);
    }, 60000);
  }
});

describe("Board Uniqueness - Stress Tests", () => {
  it("should maintain uniqueness across 3 consecutive generations", async () => {
    for (let run = 1; run <= 3; run++) {
      const result = await callRealGenerator(36, 15, 4, 4);
      assertAllBoardsUnique(result);
    }
  }, 180000);

  it("should generate 30 unique boards", async () => {
    const result = await callRealGenerator(54, 30, 4, 4);
    assertAllBoardsUnique(result);
    console.log(`✅ Generated ${result.boards.length} unique boards`);
  }, 120000);
});

describe("Board Uniqueness - Detailed Verification", () => {
  it("each board pair should differ by at least 2 items", async () => {
    const result = await callRealGenerator(36, 15, 4, 4);
    expect(result.success).toBe(true);

    for (let i = 0; i < result.boards.length; i++) {
      for (let j = i + 1; j < result.boards.length; j++) {
        const items1 = new Set(result.boards[i].items.map((item) => item.id));
        const items2 = new Set(result.boards[j].items.map((item) => item.id));

        let onlyIn1 = 0;
        let onlyIn2 = 0;

        for (const id of items1) {
          if (!items2.has(id)) onlyIn1++;
        }
        for (const id of items2) {
          if (!items1.has(id)) onlyIn2++;
        }

        const totalDiff = onlyIn1 + onlyIn2;
        expect(totalDiff).toBeGreaterThanOrEqual(2);
      }
    }
  }, 60000);

  it("should report uniqueness statistics", async () => {
    const result = await callRealGenerator(36, 15, 4, 4);
    expect(result.success).toBe(true);

    const signatures = result.boards.map(getBoardSignature);
    const uniqueCount = new Set(signatures).size;
    const duplicateCount = result.boards.length - uniqueCount;

    console.log("\n📊 UNIQUENESS REPORT:");
    console.log("=====================");
    console.log(`Total boards: ${result.boards.length}`);
    console.log(`Unique boards: ${uniqueCount}`);
    console.log(`Duplicate boards: ${duplicateCount}`);
    console.log(
      `Uniqueness rate: ${((uniqueCount / result.boards.length) * 100).toFixed(1)}%`
    );
    console.log(`Solver used: ${result.stats?.solverUsed}`);
    console.log(`Max overlap: ${result.stats?.maxOverlap}`);
    console.log("=====================\n");

    expect(uniqueCount).toBe(result.boards.length);
  }, 60000);
});

// ============================================================================
// OVERLAP MATRIX TEST - Visualize similarity between boards
// ============================================================================

describe("Board Overlap Matrix - Similarity Analysis", () => {
  it("no board pair should share more than 70% of items", async () => {
    const result = await callRealGenerator(36, 15, 4, 4);
    expect(result.success).toBe(true);

    const boardSize = result.boards[0].items.length;
    const maxAllowedOverlap = Math.floor(boardSize * 0.7); // 70% of 16 = 11

    for (let i = 0; i < result.boards.length; i++) {
      const items1 = new Set(result.boards[i].items.map((item) => item.id));
      for (let j = i + 1; j < result.boards.length; j++) {
        let overlap = 0;
        for (const item of result.boards[j].items) {
          if (items1.has(item.id)) overlap++;
        }

        expect(overlap).toBeLessThanOrEqual(maxAllowedOverlap);
      }
    }
  }, 60000);

  it("should generate and display overlap matrix", async () => {
    const result = await callRealGenerator(36, 15, 4, 4);
    expect(result.success).toBe(true);

    const B = result.boards.length;
    const boardSize = result.boards[0].items.length;

    // Build overlap matrix
    const overlapMatrix: number[][] = Array.from({ length: B }, () =>
      Array(B).fill(0)
    );
    const overlaps: number[] = [];

    for (let i = 0; i < B; i++) {
      const items1 = new Set(result.boards[i].items.map((item) => item.id));
      overlapMatrix[i][i] = boardSize; // Diagonal = self-overlap

      for (let j = i + 1; j < B; j++) {
        let overlap = 0;
        for (const item of result.boards[j].items) {
          if (items1.has(item.id)) overlap++;
        }
        overlapMatrix[i][j] = overlap;
        overlapMatrix[j][i] = overlap;
        overlaps.push(overlap);
      }
    }

    // Statistics
    const minOverlap = Math.min(...overlaps);
    const maxOverlap = Math.max(...overlaps);
    const avgOverlap = overlaps.reduce((a, b) => a + b, 0) / overlaps.length;
    const similarity = (avgOverlap / boardSize) * 100;

    console.log("\n🔢 OVERLAP MATRIX (first 5 boards):");
    console.log("=====================================");
    console.log("     " + [1, 2, 3, 4, 5].map((n) => String(n).padStart(3)).join(""));
    for (let i = 0; i < Math.min(5, B); i++) {
      const row = overlapMatrix[i]
        .slice(0, 5)
        .map((v) => String(v).padStart(3))
        .join("");
      console.log(`  ${i + 1}: ${row}`);
    }
    console.log("=====================================");
    console.log(`Min overlap: ${minOverlap} | Max: ${maxOverlap} | Avg: ${avgOverlap.toFixed(1)}`);
    console.log(`Average similarity: ${similarity.toFixed(1)}%`);
    console.log(`Diversity score: ${(100 - similarity).toFixed(1)}%`);
    console.log("=====================================\n");

    // Assertions
    expect(maxOverlap).toBeLessThanOrEqual(Math.floor(boardSize * 0.7));
    expect(avgOverlap).toBeLessThan(boardSize * 0.5);
  }, 60000);

  it("should have balanced overlap distribution (no outliers)", async () => {
    const result = await callRealGenerator(36, 15, 4, 4);
    expect(result.success).toBe(true);

    const overlaps: number[] = [];
    for (let i = 0; i < result.boards.length; i++) {
      const items1 = new Set(result.boards[i].items.map((item) => item.id));
      for (let j = i + 1; j < result.boards.length; j++) {
        let overlap = 0;
        for (const item of result.boards[j].items) {
          if (items1.has(item.id)) overlap++;
        }
        overlaps.push(overlap);
      }
    }

    const mean = overlaps.reduce((a, b) => a + b, 0) / overlaps.length;
    const variance =
      overlaps.reduce((sum, o) => sum + Math.pow(o - mean, 2), 0) /
      overlaps.length;
    const stdDev = Math.sqrt(variance);

    // Standard deviation should be reasonable (not too spread out)
    expect(stdDev).toBeLessThan(3);

    // Range should be reasonable
    const range = Math.max(...overlaps) - Math.min(...overlaps);
    expect(range).toBeLessThanOrEqual(8);
  }, 60000);
});
