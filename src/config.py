from pathlib import Path

# Base directories
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
WEBSITE_DIR = BASE_DIR / "website"

# Data directories
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
RESOURCES_DIR = DATA_DIR / "resources"

# Specific paths
PDF_DIR = RAW_DIR / "pdfs"
TEXT_DIR = PROCESSED_DIR / "text"
DB_PATH = PROCESSED_DIR / "sentiments.sqlite"
COUNTRIES_JSON = RESOURCES_DIR / "countries.json"
COUNTRY_CODES_JSON = RESOURCES_DIR / "country-codes.json"
TOPOLOGY_JSON = RESOURCES_DIR / "topology.json"
WEBSITE_DATA_DIR = WEBSITE_DIR / "data"

# URL configurations
SPEECH_URL_TEMPLATE = (
    "https://gadebate.un.org/sites/default/files/gastatements/79/{code}_{lang}.pdf"
)
