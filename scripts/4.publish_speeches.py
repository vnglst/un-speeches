import json
from pathlib import Path
from typing import Dict, List, Tuple

from src.config import DB_PATH, WEBSITE_DATA_DIR
from src.database import Database


def main():
    db = Database(db_path=DB_PATH)
    publisher = SentimentPublisher(db, output_dir=WEBSITE_DATA_DIR)

    # Process and publish both sentiment types
    for sentiment in ["optimistic", "pessimistic"]:
        results = publisher.get_mentions_by_sentiment(sentiment)
        mentions = publisher.process_mentions(results, sentiment)
        publisher.save_mentions(mentions, sentiment)
        print(f"Published {len(mentions)} {sentiment} mentions")


if __name__ == "__main__":
    main()


class SentimentPublisher:
    def __init__(self, db: Database, output_dir: Path):
        self.output_dir = output_dir
        self.db = db

    def get_mentions_by_sentiment(self, sentiment: str) -> List[Tuple]:
        query = """
        SELECT 
            mentioned_country_code,
            mentioned_country,
            country_code,
            explanation 
        FROM 
            country_mentions 
        WHERE 
            sentiment = ?;
        """
        return self.db.execute(query, (sentiment,)).fetchall()

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
