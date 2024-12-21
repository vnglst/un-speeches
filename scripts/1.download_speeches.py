import json

from src.data.speech_files import SpeechDownloader


def main():
    with open("data/resources/countries.json", "r") as file:
        country_lookup = json.load(file)

    url_template = (
        "https://gadebate.un.org/sites/default/files/gastatements/79/{code}_{lang}.pdf"
    )
    output_dir = "data/raw/pdfs"

    downloader = SpeechDownloader(output_dir=output_dir, url_template=url_template)

    print(f"Starting download for {len(country_lookup)} countries...")
    downloader.download_speeches(country_lookup)
    print("Download complete.")


if __name__ == "__main__":
    main()
