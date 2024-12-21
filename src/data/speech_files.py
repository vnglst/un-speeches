import os
import glob
from typing import Dict, List, Tuple


class SpeechFiles:
    def __init__(self, base_path: str):
        self.base_path = base_path

    def get_txt_files(self) -> Dict[str, List[Tuple[str, str]]]:
        """Get dictionary of country codes mapped to list of (language, filepath) tuples"""
        files = glob.glob(os.path.join(self.base_path, "*.txt"))
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

    @staticmethod
    def read_speech_content(file_path: str) -> str:
        with open(file_path, "r") as file:
            return file.read()
