import os

import pytesseract
from pdf2image import convert_from_path

from src.config import PDF_DIR, TEXT_DIR


class PDFConverter:
    """Converts PDF speeches to text using OCR."""

    def __init__(self, input_dir: str, output_dir: str):
        self.input_dir = input_dir
        self.output_dir = output_dir
        self.lang_codes = {"en": "eng", "fr": "fra", "es": "spa", "ru": "rus"}

    def convert_all(self) -> None:
        """Convert all PDFs in the input directory to text. Save text files in the output directory."""
        os.makedirs(self.output_dir, exist_ok=True)

        for pdf_file in self._get_pdf_files():
            self._convert_file(pdf_file)

    def _get_pdf_files(self) -> list:
        return [f for f in os.listdir(self.input_dir) if f.endswith(".pdf")]

    def _convert_file(self, pdf_name: str) -> None:
        pdf_path = os.path.join(self.input_dir, pdf_name)
        txt_path = os.path.join(self.output_dir, pdf_name.replace(".pdf", ".txt"))

        if os.path.exists(txt_path):
            print(f"{txt_path} already exists. Skipping.")
            return

        # Get language code from filename (e.g., "us_en.pdf" -> "en")
        lang_code = pdf_name.split("_")[-1].split(".")[0]
        tesseract_lang = self.lang_codes.get(lang_code, "eng")

        try:
            # Convert PDF to images
            images = convert_from_path(pdf_path)

            # Extract text from each page
            text = ""
            for image in images:
                text += pytesseract.image_to_string(image, lang=tesseract_lang)

            # Save extracted text
            with open(txt_path, "w", encoding="utf-8") as f:
                f.write(text)

            print(f"Converted {pdf_name} to text")

        except Exception as e:
            print(f"Error converting {pdf_name}: {e}")


def main():
    converter = PDFConverter(input_dir=PDF_DIR, output_dir=TEXT_DIR)

    print("Starting PDF to text conversion...")
    converter.convert_all()
    print("Conversion complete.")


if __name__ == "__main__":
    main()
