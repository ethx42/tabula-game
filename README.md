# Lotería Game Board Generator

A Python script that generates 15 unique game boards for a Colombian-themed Lotería game with balanced item distribution.

## Project Description

This generator creates 15 distinct 4x4 game boards from 36 unique Colombian cultural items, ensuring:
- Balanced distribution across all boards
- No duplicate items within a single board
- Mathematical validation of distribution requirements

## Algorithm

The generator uses a **Spread Distribution algorithm** with the following strategy:

1. **Greedy Assignment**: Items are assigned to boards one at a time
2. **Overlap Minimization**: Prefers boards that minimize maximum pairwise overlap
3. **Duplicate Repair**: Detects and fixes any duplicate boards via swapping
4. **Frequency Constraints**: Maintains exact frequency requirements

If OR-Tools is available (requires Python ≤ 3.12), the generator uses a **CP-SAT constraint solver** that optimally minimizes the maximum overlap between any two boards.

## Features

- **36 Unique Items**: Colombian food, culture, landmarks, and traditions
- **15 Game Boards**: Each with a 4x4 grid (16 items)
- **Balanced Distribution**: 
  - Items 1-24: appear 7 times across all boards
  - Items 25-36: appear 6 times across all boards
- **Automatic Validation**: Four comprehensive tests ensure correctness
- **JSON Export**: Boards exported in structured format for easy integration
- **Deterministic**: Same output every time (no random shuffling)

## Requirements

- Python 3.6 or higher
- Standard library only (no external dependencies required)

### Optional (for optimal diversity)

```bash
# Requires Python <= 3.12
pip install ortools>=9.8.0
```

## Usage

Run the script:

```bash
python3 loteria_generator.py
```

Or with a virtual environment:

```bash
python3 -m venv venv
source venv/bin/activate
python loteria_generator.py
```

## Output

The script will:

1. Generate 15 unique boards
2. Print all boards to the console in a readable format
3. Export boards to `loteria_boards.json`
4. Run validation tests and display results

## Validation Tests

The script automatically runs four tests:

### Test 1: Frequency Validation
Verifies that each item appears the correct number of times:
- Items 01-24: exactly 7 occurrences
- Items 25-36: exactly 6 occurrences

### Test 2: No Duplicates Within Boards
Ensures each board contains 16 unique items (no duplicates)

### Test 3: No Identical Boards
Confirms all 15 boards are distinct from each other

### Test 4: Pairwise Overlap Analysis
Analyzes how many items are shared between pairs of boards:
- Reports min, max, and average overlap
- Shows the highest-overlap board pairs

## JSON Output Format

```json
{
  "game": "Lotería Barranquilla",
  "total_boards": 15,
  "board_size": "4x4",
  "items_per_board": 16,
  "algorithm": "Spread Distribution",
  "boards": [
    {
      "board_number": 1,
      "items": [...],
      "grid": [[...], [...], [...], [...]]
    }
  ]
}
```

## The 36 Items

Traditional Colombian foods, cultural icons, and landmarks including:
- Patacón de Guineo Verde
- La Marimonda
- La Palenquera
- Alejandro Obregón
- Bocas de Ceniza
- And 31 more unique items

## Mathematical Verification

```
(24 items × 7 occurrences) + (12 items × 6 occurrences) = 240 slots
15 boards × 16 items per board = 240 slots ✓
```

## License

This project is open source and available for personal and commercial use.
