from typing import List

from src.models.mention import CountryMention
from src.services.database import Database


class SpeechAnalyzer:
    def __init__(self, db: Database):
        self.db = db

    def create_mentions_table(self):
        self.db.execute("""
        CREATE TABLE IF NOT EXISTS country_mentions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            country_code TEXT NOT NULL,
            mentioned_country TEXT NOT NULL,
            mentioned_country_code TEXT NOT NULL, 
            sentiment TEXT NOT NULL,
            explanation TEXT NOT NULL
        );
        """)

    def analysis_exists(self, country_code: str) -> bool:
        self.db.execute(
            "SELECT 1 FROM country_mentions WHERE country_code = ? LIMIT 1",
            (country_code,),
        )
        return self.db.fetchone() is not None

    def store_country_mentions(self, country_code: str, mentions: List[CountryMention]):
        for mention in mentions:
            self.db.execute(
                """INSERT INTO country_mentions 
                   (country_code, mentioned_country, mentioned_country_code, 
                    sentiment, explanation) 
                   VALUES (?, ?, ?, ?, ?)""",
                (
                    country_code,
                    mention.country,
                    mention.country_code,
                    mention.sentiment,
                    mention.explanation,
                ),
            )
