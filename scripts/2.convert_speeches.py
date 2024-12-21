from src.io.converter import PDFConverter


def main():
    input_dir = "data/raw/pdfs"
    output_dir = "data/processed/text"

    converter = PDFConverter(input_dir=input_dir, output_dir=output_dir)

    print("Starting PDF to text conversion...")
    converter.convert_all()
    print("Conversion complete.")


if __name__ == "__main__":
    main()
