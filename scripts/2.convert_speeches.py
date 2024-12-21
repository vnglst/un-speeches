from src.config import PDF_DIR, TEXT_DIR
from src.io.converter import PDFConverter


def main():
    converter = PDFConverter(input_dir=PDF_DIR, output_dir=TEXT_DIR)

    print("Starting PDF to text conversion...")
    converter.convert_all()
    print("Conversion complete.")


if __name__ == "__main__":
    main()
