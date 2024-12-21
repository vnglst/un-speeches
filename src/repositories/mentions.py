from typing import List, Tuple

from src.services.database import Database


class MentionRepository:
    def __init__(self, db: Database):
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
