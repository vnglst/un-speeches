import json
from pathlib import Path
from typing import Dict, List, Tuple


class SentimentPublisher:
    def __init__(self, output_dir: Path):
        self.output_dir = output_dir

    def process_mentions(self, results: List[Tuple], sentiment: str) -> Dict:
        return {
            row[0]: [
                {"mentioning_country_code": r[2].upper(), "explanation": r[3]}
                for r in results
                if r[0] == row[0]
            ]
            for row in results
        }

    def save_mentions(self, mentions: Dict, sentiment: str) -> None:
        output_file = self.output_dir / f"{sentiment}_received.json"
        with open(output_file, "w") as f:
            json.dump(mentions, f, indent=4)
