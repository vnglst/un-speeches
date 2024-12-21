"""
This script enriches geographical topology data by adding ISO country codes.
It loads topology.json to extract country names and country-codes.json to obtain
country codes, creates a mapping from names to codes, adds the corresponding ISO
code to each country's properties in the topology data, and saves the updated
data to website/data/topology_with_iso_code.json.
"""

import json

from src.config import COUNTRY_CODES_JSON, TOPOLOGY_JSON, WEBSITE_DATA_DIR


def load_topology(topology_path):
    """Load topology data from JSON file"""
    with open(topology_path) as f:
        return json.load(f)


def load_country_codes(codes_path):
    """Create mapping of country names to ISO codes"""
    with open(codes_path) as f:
        country_codes = json.load(f)
    return {country["name"]: country["code"] for country in country_codes}


def enrich_topology_with_codes(topology_data, name_to_code):
    """Add ISO codes to each country in topology data"""
    for country in topology_data["objects"]["countries"]["geometries"]:
        country_name = country["properties"]["name"]
        country["properties"]["code"] = name_to_code.get(country_name, None)
    return topology_data


def save_enriched_topology(data, output_dir):
    """Save enriched topology data to JSON file"""
    output_file = output_dir / "topology_with_iso_code.json"
    output_dir.mkdir(parents=True, exist_ok=True)
    with open(output_file, "w") as f:
        json.dump(data, f)


def main():
    """Main execution flow"""
    try:
        # Load source data
        topology_data = load_topology(TOPOLOGY_JSON)
        name_to_code = load_country_codes(COUNTRY_CODES_JSON)

        # Enrich topology with ISO codes
        enriched_data = enrich_topology_with_codes(topology_data, name_to_code)

        # Save enriched data
        save_enriched_topology(enriched_data, WEBSITE_DATA_DIR)
        print("Successfully enriched topology data with ISO codes")
    except Exception as e:
        print(f"Error: {e}")
        raise


if __name__ == "__main__":
    main()
