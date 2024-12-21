from pathlib import Path

from data.database import Database
from data.mentions import MentionRepository
from data.publisher import SentimentPublisher


def main():
    db = Database(db_path="data/processed/sentiments.sqlite")
    repository = MentionRepository(db)
    publisher = SentimentPublisher(output_dir=Path("website/data"))

    # Process and publish both sentiment types
    for sentiment in ["optimistic", "pessimistic"]:
        results = repository.get_mentions_by_sentiment(sentiment)
        mentions = publisher.process_mentions(results, sentiment)
        publisher.save_mentions(mentions, sentiment)
        print(f"Published {len(mentions)} {sentiment} mentions")


if __name__ == "__main__":
    main()
