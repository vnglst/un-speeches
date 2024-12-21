import json
from src.config import COUNTRIES_JSON, PDF_DIR, SPEECH_URL_TEMPLATE
from src.io.downloader import SpeechDownloader


def main():
    with open(COUNTRIES_JSON, "r") as file:
        country_lookup = json.load(file)

    downloader = SpeechDownloader(output_dir=PDF_DIR, url_template=SPEECH_URL_TEMPLATE)

    print(f"Starting download for {len(country_lookup)} countries...")
    downloader.download_speeches(country_lookup)
    print("Download complete.")


if __name__ == "__main__":
    main()
