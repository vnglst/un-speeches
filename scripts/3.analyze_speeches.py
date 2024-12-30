import glob
import os

from pydantic import BaseModel, Field

from src.config import DB_PATH, TEXT_DIR
from src.database import Database
from src.llm import LLM

# Models


class CountryMention(BaseModel):
    country: str = Field(..., description="Country name")
    country_code: str = Field(
        ..., description="two letter ISO code, e.g. US, ZA, AF, etc."
    )
    sentiment: str = Field(..., description="optimistic/pessimistic")
    explanation: str = Field(..., description="Analysis explanation")


class CountryMentions(BaseModel):
    mentions: list[CountryMention] = Field(
        ...,
        description="An array of objects representing the country mentions and their sentiments.",
    )


# Classes


class SentimentAnalyzer:
    """Analyzes UN speeches for country mentions and sentiment."""

    def __init__(self, llm: LLM):
        self.llm = llm

        self._system_prompt = (
            "You are an expert in analyzing speeches for mentions of other countries."
        )

        self._user_prompt_template = """
        Read the provided speech text carefully. Your task is to determine whether the speech is 
        optimistic or pessimistic about the country's future. Optimistic means that the speech 
        is expressing confidence that things are improving or are good. Pessimistic means that 
        the speech is expressing worry that things are getting worse or are pretty bad.

        Make sure to only include real countries' iso codes (the United Nations, continents 
        like Africa or NATO are NOT considered countries). Make sure to use 2 letter ISO codes. Some
        examples of valid codes are: AF for Afghanistan, ZA for South Africa, US for United States.
        
        Present your findings as a JSON object with the fields 'sentiment' (either 'optimistic'
        or 'pessimistic') and 'explanation' using markdown.

        Include in the explanation quotations in English from the speech to support the 
        sentiment. Make sure to ALWAYS translate the quotations to English.

        Speech content:
        {speech_content}
        """

    def analyze_speech(self, text: str, country_code: str) -> CountryMentions:
        """
        Analyze a speech for mentions of other countries and sentiment.

        Args:
            text: The speech text to analyze
            country_code: ISO code of the speaking country

        Returns:
            List of CountryMention objects containing the analysis results
        """
        messages = [
            {"role": "system", "content": self._system_prompt},
            {
                "role": "user",
                "content": self._user_prompt_template.format(speech_content=text),
            },
        ]

        response = self.llm.generate(
            messages=messages,
            response_format=CountryMentions,
            temperature=0,
        )

        # print country, country_code, sentiment and first 100 characters of explanation
        for mention in response.mentions:
            print(
                f"[{mention.country_code}]",
                mention.country,
                mention.sentiment,
                mention.explanation[:20],
            )

            if len(mention.country_code) != 2:
                print(f"Invalid country code: {mention.country_code}")
                response.mentions.remove(mention)

        return response.mentions


class SpeechFiles:
    def __init__(self, base_path: str):
        self.base_path = base_path

    def get_txt_files(self) -> dict[str, list[tuple[str, str]]]:
        """Get dictionary of country codes mapped to list of (language, filepath) tuples"""
        files = glob.glob(os.path.join(self.base_path, "*.txt"))
        country_files: dict[str, list[tuple[str, str]]] = {}

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

    @staticmethod
    def read_speech_content(file_path: str) -> str:
        with open(file_path, "r") as file:
            return file.read()


class SpeechRepository:
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

    def save_mentions(self, country_code: str, mentions: list[CountryMention]):
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


# Main function


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
