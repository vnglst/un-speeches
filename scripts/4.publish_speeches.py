import json
from typing import Dict, List, Tuple

from src.services import Database


def get_mentions_by_target(db: Database, sentiment: str) -> List[Tuple]:
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
    return db.execute(query, (sentiment,)).fetchall()


def process_mentions_by_target(results: List[Tuple]) -> Dict:
    return {
        row[0]: [
            {"mentioning_country_code": r[2].upper(), "explanation": r[3]}
            for r in results
            if r[0] == row[0]
        ]
        for row in results
    }


db = Database(db_path="data/processed/sentiments.sqlite")

optimistic_received = process_mentions_by_target(
    get_mentions_by_target(db, "optimistic")
)

pessimistic_received = process_mentions_by_target(
    get_mentions_by_target(db, "pessimistic")
)


for filename, data in [
    ("website/data/optimistic_received.json", optimistic_received),
    ("website/data/pessimistic_received.json", pessimistic_received),
]:
    with open(filename, "w") as file:
        json.dump(data, file, indent=4)

print("Data published successfully.")
