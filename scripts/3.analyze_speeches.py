import os

from src.analysis.sentiment import SentimentAnalyzer
from src.config import DB_PATH, TEXT_DIR
from src.io.database import Database
from src.io.llm import LLM
from src.io.speech_files import SpeechFiles
from src.io.speech_repository import SpeechRepository


def main():
    llm = LLM(api_key=os.getenv("OPENAI_API_KEY"))
    db = Database(db_path=DB_PATH)

    sentiment_analyzer = SentimentAnalyzer(llm)
    repository = SpeechRepository(db)
    speech_files = SpeechFiles(base_path=TEXT_DIR)

    # Create database table
    repository.create_mentions_table()

    # Get speech files
    country_files_dict = speech_files.get_txt_files()

    # Keep only the first x countries for testing
    # country_files_dict = dict(list(country_files_dict.items())[:20])

    # Process each country's speeches
    for country_code, files in country_files_dict.items():
        if repository.analysis_exists(country_code):
            print(f"Analysis for country {country_code} already exists. Skipping.")
            continue

        # Prioritize English files
        files_sorted = sorted(files, key=lambda x: 0 if x[0] == "en" else 1)

        for lang_code, file_path in files_sorted:
            speech_content = speech_files.read_speech_content(file_path)

            if speech_content.strip():
                response = sentiment_analyzer.analyze_speech(
                    text=speech_content, country_code=lang_code
                )
                print(
                    f"Generated country mentions for country {country_code} ({lang_code})"
                )

                repository.save_mentions(country_code, response)
                print(f"Stored country mentions for country {country_code}")
                break

        else:
            print(f"No valid speech content found for country {country_code}")

    print("Analysis complete.")


if __name__ == "__main__":
    main()
