import glob
import os
from typing import Dict, List

from src.analysis import SentimentAnalyzer
from src.services import LLM, Database

llm = LLM(api_key=os.getenv("OPENAI_API_KEY"))
db = Database(db_path="data/processed/sentiments.sqlite")


def create_table():
    db.execute("""
    CREATE TABLE IF NOT EXISTS country_mentions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        country_code TEXT NOT NULL,
        mentioned_country TEXT NOT NULL,
        mentioned_country_code TEXT NOT NULL,
        sentiment TEXT NOT NULL,
        explanation TEXT NOT NULL
    );
    """)


def get_txt_files(glob_pathname) -> Dict[str, List[str]]:
    files = glob.glob(glob_pathname)
    country_files = {}
    for file in files:
        filename = os.path.basename(file)
        parts = filename.split("_")
        if len(parts) >= 2:
            country_code = parts[0]
            lang_code = parts[1].split(".")[0]
            if country_code not in country_files:
                country_files[country_code] = []
            country_files[country_code].append((lang_code, file))
    return country_files


def read_speech_content(file_path):
    with open(file_path, "r") as file:
        return file.read()


def store_country_mentions(country_code, country_mentions):
    for mention in country_mentions:
        db.execute(
            "INSERT INTO country_mentions (country_code, mentioned_country, mentioned_country_code, sentiment, explanation) VALUES (?, ?, ?, ?, ?)",
            (
                country_code,
                mention.country,
                mention.country_code,
                mention.sentiment,
                mention.explanation,
            ),
        )


def analysis_exists(country_code):
    db.execute(
        "SELECT 1 FROM country_mentions WHERE country_code = ? LIMIT 1", (country_code,)
    )
    return db.fetchone() is not None


create_table()
country_files_dict = get_txt_files(glob_pathname="data/processed/text/*.txt")

sentiment = SentimentAnalyzer(llm)

for country_code, files in country_files_dict.items():
    if analysis_exists(country_code):
        print(f"Analysis for country {country_code} already exists. Skipping.")
        continue

    # Prioritize English files
    files_sorted = sorted(files, key=lambda x: 0 if x[0] == "en" else 1)
    for lang_code, file_path in files_sorted:
        speech_content = read_speech_content(file_path)
        if speech_content.strip():  # Check if content is not empty
            response = sentiment.analyze_speech(
                text=speech_content, country_code=lang_code
            )
            print(
                f"Generated country mentions for country {country_code} ({lang_code})"
            )
            store_country_mentions(country_code, response)
            print(f"Stored country mentions for country {country_code}")
            break  # Analysis done for this country
    else:
        print(f"No valid speech content found for country {country_code}")

print("Analysis complete.")
