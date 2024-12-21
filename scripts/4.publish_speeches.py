from src.config import DB_PATH, WEBSITE_DATA_DIR
from src.io.database import Database
from src.io.publisher import SentimentPublisher


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
