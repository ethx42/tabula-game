# Lotería Game Board Generator

A Python script that generates 15 unique game boards for a Colombian-themed Lotería game with balanced item distribution.

## Project Description

This generator creates 15 distinct 4x4 game boards from 36 unique Colombian cultural items, ensuring:
- Balanced distribution across all boards
- No duplicate items within a single board
- Mathematical validation of distribution requirements

## Features

- **36 Unique Items**: Colombian food, culture, landmarks, and traditions
- **15 Game Boards**: Each with a 4x4 grid (16 items)
- **Balanced Distribution**: 
  - Items 1-24: appear 7 times across all boards
  - Items 25-36: appear 6 times across all boards
- **Automatic Validation**: Three comprehensive tests ensure correctness
- **JSON Export**: Boards exported in structured format for easy integration

## Requirements

- Python 3.6 or higher
- Standard library only (no external dependencies)

## Usage

Run the script:

```bash
python3 loteria_generator.py
```

Or make it executable:

```bash
chmod +x loteria_generator.py
./loteria_generator.py
```

## Output

The script will:

1. Generate 15 unique boards
2. Print all boards to the console in a readable format
3. Export boards to `loteria_boards.json`
4. Run validation tests and display results

## Validation Tests

The script automatically runs three tests:

### Test 1: Frequency Validation
Verifies that each item appears the correct number of times:
- Items 01-24: exactly 7 occurrences
- Items 25-36: exactly 6 occurrences

### Test 2: No Duplicates Within Boards
Ensures each board contains 16 unique items (no duplicates)

### Test 3: No Identical Boards
Confirms all 15 boards are distinct from each other

## Algorithm

1. **Master Pool Creation**: Creates a pool of 240 items with correct frequencies
2. **Board Generation**: Uses backtracking to ensure no duplicates within boards
3. **Fallback Strategy**: If backtracking fails, uses swapping algorithm
4. **Validation**: Runs comprehensive tests to verify correctness

## JSON Output Format

```json
{
  "game": "Lotería Barranquilla",
  "total_boards": 15,
  "board_size": "4x4",
  "items_per_board": 16,
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

## License

This project is open source and available for personal and commercial use.
