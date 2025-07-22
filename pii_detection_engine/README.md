# Local PII Detection Engine

This project is a Python-based PII (Personally Identifiable Information) detection engine that allows you to scan structured data for sensitive information. It is designed to work entirely offline, ensuring data privacy and security.

## Features

- **Multiple Detection Backends**: Choose from a variety of NER models:
  - spaCy (`en_core_web_sm`)
  - Stanza (`en` pipeline)
  - Flair (`ner`)
  - BERT (`dslim/bert-base-NER`)
  - Spark NLP (`ner_dl` with `glove_100d` embeddings)
- **Regex-Based Detection**: Built-in regex patterns for common PII like emails, phone numbers, and credit cards.
- **On-Demand Model Loading**: Models are loaded only when selected, minimizing memory usage.
- **Configurable Detection**:
  - Toggle regex detection on or off.
  - Use context injection to improve accuracy by providing column/table names.
- **Offline and Private**: No data is sent to external APIs. Everything runs locally.
- **Modular Design**: Easily extend the engine with new models or recognizers.

## Setup

1.  **Create a virtual environment** (recommended):
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    ```

2.  **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
    *Note: The first run might take some time as the script will download the necessary models.*

3.  **Java Development Kit (JDK)**: If you plan to use the Spark NLP backend, make sure you have a JDK (version 8 or newer) installed and the `JAVA_HOME` environment variable is set.

## Usage

You can run the PII detection engine directly from the command line using the `main.py` script. The script includes an example of how to use the `PiiDetector` class.

```python
from main import PiiDetector

# 1. Define the data to scan
data_value = "My name is Jane Smith and my email is j.smith@university.edu."
column = "user_profile"
table = "users"

# 2. Choose a detection model
# Options: "spacy", "stanza", "flair", "bert", "spark"
chosen_model = "bert"

# 3. Configure detection options
use_regex_detection = True
use_context_injection = False

# 4. Initialize the detector and scan for PII
detector = PiiDetector(
    model_name=chosen_model,
    use_regex=use_regex_detection,
    use_context=use_context_injection
)

detected_pii = detector.detect(data_value, column_name=column, table_name=table)

# 5. Print the results
print(detected_pii)
```

To run the main script with its example:
```bash
python main.py
```

This will output the detected PII entities based on the default configuration in the script. You can modify the `if __name__ == "__main__":` block in `main.py` to experiment with different models and settings.
