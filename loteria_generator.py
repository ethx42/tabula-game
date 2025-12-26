#!/usr/bin/env python3
"""
Lotería Game Board Generator
Generates 15 unique 4x4 game boards from 36 items with balanced distribution.
"""

import json
import random
from typing import List
from collections import Counter


# The 36 items for the Lotería game
ITEMS = [
    "01 PATACÓN DE GUINEO VERDE", "02 ALEGRÍA DE COCO Y ANÍS", "03 BOLLO DE MAÍZ",
    "04 CABALLITO DE PAPAYA", "05 SANCOCHO DE PESCADO", "06 MAZAMORRA DE GUINEO",
    "07 COCADA DE PANELA Y COCO", "08 MOJARRA FRITA", "09 TINAJERO",
    "10 PIEDRA DE FILTRAR", "11 TINAJA DE BARRO", "12 PONCHERA",
    "13 MECEDORA DE MIMBRE", "14 FOGÓN DE LEÑA", "15 TOTUMA Y CUCHARA DE PALO",
    "16 MANTEL DE HULE", "17 ESTACIÓN DEL FERROCARRIL", "18 TRANVÍA DE BARRANQUILLA",
    "19 EL VAPOR DAVID ARANGO", "20 ROBLE MORADO EN FLOR", "21 MANGLARES DE LA CIÉNAGA",
    "22 BOSQUE SECO TROPICAL", "23 BOCAS DE CENIZA", "24 CALLES DE BARRIO ABAJO",
    "25 LA MARIMONDA", "26 LA PALENQUERA", "27 VENDEDOR DE AGUACATES",
    "28 LA NOVIA DE BARRANQUILLA", "29 ALEJANDRO OBREGÓN", "30 ENRIQUE GRAU",
    "31 PESCADOR DE ATARRAYA", "32 AZAFATE", "33 AJIACO SANTAFEREÑO",
    "34 TRANVÍA DE BOGOTÁ", "35 OLLETA Y MOLINILLO", "36 TAMAL SANTAFEREÑO"
]

# Constants
NUM_BOARDS = 15
BOARD_SIZE = 16  # 4x4 grid
FIRST_24_FREQUENCY = 7  # Items 0-23 appear 7 times
LAST_12_FREQUENCY = 6   # Items 24-35 appear 6 times


def create_master_pool() -> List[str]:
    """
    Create the master pool of items based on frequency requirements.
    - First 24 items: 7 occurrences each
    - Last 12 items: 6 occurrences each
    Total: (24 * 7) + (12 * 6) = 168 + 72 = 240 items
    """
    master_pool = []
    
    # Items 0-23: appear 7 times
    for item in ITEMS[:24]:
        master_pool.extend([item] * FIRST_24_FREQUENCY)
    
    # Items 24-35: appear 6 times
    for item in ITEMS[24:]:
        master_pool.extend([item] * LAST_12_FREQUENCY)
    
    return master_pool


def generate_boards(master_pool: List[str], max_attempts: int = 100) -> List[List[str]]:
    """
    Generate boards ensuring no duplicates within each board.
    Uses a greedy approach: build one board at a time, selecting items randomly
    from available pool while ensuring no duplicates.
    """
    for attempt in range(max_attempts):
        # Create a frequency counter for available items
        available = Counter(master_pool)
        boards = []
        
        try:
            # Build each board
            for board_num in range(NUM_BOARDS):
                board = []
                board_items = set()
                
                # Get list of available items
                available_items = list(available.elements())
                random.shuffle(available_items)
                
                # Try to fill the board
                for item in available_items:
                    if item not in board_items and len(board) < BOARD_SIZE:
                        board.append(item)
                        board_items.add(item)
                        available[item] -= 1
                        
                        if available[item] == 0:
                            del available[item]
                
                # Check if we filled the board
                if len(board) != BOARD_SIZE:
                    # Failed to fill this board, retry
                    break
                
                boards.append(board)
            
            # Check if we successfully created all boards
            if len(boards) == NUM_BOARDS:
                return boards
                
        except Exception:
            # Something went wrong, try again
            continue
    
    raise RuntimeError(f"Failed to generate valid boards after {max_attempts} attempts")


def print_boards(boards: List[List[str]]) -> None:
    """
    Print all boards in a readable format.
    """
    for i, board in enumerate(boards, 1):
        print(f"\n{'='*60}")
        print(f"BOARD {i}")
        print('='*60)
        
        # Print as 4x4 grid
        for row in range(4):
            start_idx = row * 4
            end_idx = start_idx + 4
            row_items = board[start_idx:end_idx]
            
            for item in row_items:
                print(f"  {item}")
            if row < 3:
                print()


def export_to_json(boards: List[List[str]], filename: str = "loteria_boards.json") -> None:
    """
    Export boards to a JSON file.
    """
    output = {
        "game": "Lotería Barranquilla",
        "total_boards": len(boards),
        "board_size": "4x4",
        "items_per_board": BOARD_SIZE,
        "boards": []
    }
    
    for i, board in enumerate(boards, 1):
        board_data = {
            "board_number": i,
            "items": board,
            "grid": [
                board[0:4],
                board[4:8],
                board[8:12],
                board[12:16]
            ]
        }
        output["boards"].append(board_data)
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"\n✓ Boards exported to {filename}")


def run_tests(boards: List[List[str]]) -> None:
    """
    Run validation tests on the generated boards.
    """
    print("\n" + "="*60)
    print("RUNNING VALIDATION TESTS")
    print("="*60)
    
    # Flatten all boards
    all_items = [item for board in boards for item in board]
    item_counts = Counter(all_items)
    
    # TEST 1: Frequency validation
    print("\nTEST 1: Frequency Validation")
    print("-" * 40)
    
    errors = []
    
    # Check items 0-23 (should appear 7 times)
    for i, item in enumerate(ITEMS[:24]):
        count = item_counts[item]
        if count != FIRST_24_FREQUENCY:
            errors.append(f"  ✗ {item}: expected {FIRST_24_FREQUENCY}, got {count}")
        else:
            print(f"  ✓ {item}: {count} occurrences")
    
    # Check items 24-35 (should appear 6 times)
    for i, item in enumerate(ITEMS[24:], 24):
        count = item_counts[item]
        if count != LAST_12_FREQUENCY:
            errors.append(f"  ✗ {item}: expected {LAST_12_FREQUENCY}, got {count}")
        else:
            print(f"  ✓ {item}: {count} occurrences")
    
    if errors:
        print("\nFREQUENCY ERRORS FOUND:")
        for error in errors:
            print(error)
        raise AssertionError("TEST 1 FAILED: Frequency requirements not met")
    
    print("\n✓ TEST 1 PASSED: All items have correct frequency")
    
    # TEST 2: No duplicates within boards
    print("\nTEST 2: No Duplicates Within Boards")
    print("-" * 40)
    
    duplicate_errors = []
    for i, board in enumerate(boards, 1):
        if len(board) != len(set(board)):
            duplicates = [item for item in board if board.count(item) > 1]
            duplicate_errors.append(f"  ✗ Board {i} has duplicates: {set(duplicates)}")
        else:
            print(f"  ✓ Board {i}: No duplicates")
    
    if duplicate_errors:
        print("\nDUPLICATE ERRORS FOUND:")
        for error in duplicate_errors:
            print(error)
        raise AssertionError("TEST 2 FAILED: Some boards contain duplicates")
    
    print("\n✓ TEST 2 PASSED: No board contains duplicate items")
    
    # TEST 3: No identical boards
    print("\nTEST 3: No Identical Boards")
    print("-" * 40)
    
    board_sets = [frozenset(board) for board in boards]
    if len(board_sets) != len(set(board_sets)):
        raise AssertionError("TEST 3 FAILED: Some boards are identical")
    
    print("  ✓ All 15 boards are unique")
    print("\n✓ TEST 3 PASSED: All boards are distinct")
    
    # Summary
    print("\n" + "="*60)
    print("ALL TESTS PASSED ✓")
    print("="*60)
    print(f"Total items distributed: {len(all_items)}")
    print(f"Total unique items: {len(ITEMS)}")
    print(f"Boards generated: {len(boards)}")


def main():
    """
    Main execution function.
    """
    print("="*60)
    print("LOTERÍA GAME BOARD GENERATOR")
    print("="*60)
    print(f"Total items: {len(ITEMS)}")
    print(f"Boards to generate: {NUM_BOARDS}")
    print(f"Items per board: {BOARD_SIZE}")
    print(f"Total slots: {NUM_BOARDS * BOARD_SIZE}")
    
    # Create master pool
    master_pool = create_master_pool()
    
    # Verify master pool size
    assert len(master_pool) == 240, f"Master pool should have 240 items, got {len(master_pool)}"
    
    # Generate boards
    print("\nGenerating boards...")
    boards = generate_boards(master_pool, max_attempts=1000)
    print(f"✓ Successfully generated {len(boards)} boards")
    
    # Print boards
    print_boards(boards)
    
    # Export to JSON
    export_to_json(boards)
    
    # Run validation tests
    run_tests(boards)


if __name__ == "__main__":
    main()
