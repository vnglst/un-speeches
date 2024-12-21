import os
import time

import requests


class SpeechDownloader:
    """Downloads UN General Assembly speeches in PDF format."""

    def __init__(self, output_dir: str, url_template: str):
        self.output_dir = output_dir
        self.url_template = url_template
        self.languages = ["en", "fr", "es", "ru"]

    def download_speeches(self, country_lookup: dict) -> None:
        """
        Download speeches for all countries in supported languages.

        Args:
            country_lookup: Dictionary mapping country codes to names
        """
        os.makedirs(self.output_dir, exist_ok=True)

        for code in country_lookup.keys():
            self._download_country_speeches(code)

    def _download_country_speeches(self, country_code: str) -> None:
        for lang in self.languages:
            url = self.url_template.format(code=country_code.lower(), lang=lang)
            try:
                response = requests.get(url)
                response.raise_for_status()

                filename = os.path.join(
                    self.output_dir, f"{country_code.lower()}_{lang}.pdf"
                )

                with open(filename, "wb") as f:
                    f.write(response.content)

                print(f"Downloaded: {filename}")
                time.sleep(0.2)  # Rate limiting
                break  # Exit language loop if successful

            except requests.exceptions.RequestException as e:
                print(f"Failed to download {url}: {e}")
        else:
            print(
                f"Could not download speech for country {country_code} in any language."
            )
