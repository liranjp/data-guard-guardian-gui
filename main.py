import argparse
import logging
from datetime import datetime
import re
import pandas as pd
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, inspect
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os
import sys

# --- Suppress TensorFlow/PyTorch warnings ---
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3' 
import warnings
warnings.filterwarnings("ignore")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s', stream=sys.stdout)

# ===================================
# 1. DATABASE SETUP (SQLAlchemy)
# ===================================
Base = declarative_base()

class PiiFinding(Base):
    """SQLAlchemy model for storing PII findings."""
    __tablename__ = 'pii_findings'
    id = Column(Integer, primary_key=True)
    sample = Column(String)
    pii_type = Column(String)
    confidence_score = Column(Float)
    risk_level = Column(String)
    model_used = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    source = Column(String)

    def __repr__(self):
        return f"<PiiFinding(pii_type='{self.pii_type}', source='{self.source}')>"

class ResultsDatabase:
    """Handles database operations for PII findings."""
    def __init__(self, db_path='pii_findings.db'):
        self.db_path = db_path
        self.engine = create_engine(f'sqlite:///{db_path}')
        # Create table only if it doesn't exist
        if not inspect(self.engine).has_table('pii_findings'):
            Base.metadata.create_all(self.engine)
            logging.info(f"Created new database and table at {db_path}")
        else:
            logging.info(f"Connected to existing database at {db_path}")
        self.Session = sessionmaker(bind=self.engine)

    def log_findings(self, findings_data):
        if not findings_data: return
        session = self.Session()
        session.bulk_insert_mappings(PiiFinding, findings_data)
        session.commit()
        session.close()
        logging.info(f"Logged {len(findings_data)} new findings to '{self.db_path}'.")

# ===================================
# 2. PII DETECTORS (MODULAR)
# ===================================
class PiiDetector:
    """Abstract base class for all PII detectors."""
    def __init__(self):
        self.model = None
        self.name = "base_detector"

    def analyze(self, text, **kwargs):
        raise NotImplementedError("Each detector must implement the 'analyze' method.")

    def _get_risk_level(self, pii_type):
        """Assigns a risk level based on PII type."""
        pii_type = pii_type.upper()
        if pii_type in ["CREDIT_CARD", "SSN", "PASSPORT_NUMBER", "CRYPTO", "IBAN_CODE"]:
            return "high"
        elif pii_type in ["EMAIL_ADDRESS", "PHONE_NUMBER", "PERSON", "LOCATION", "GPE", "URL", "IP_ADDRESS", "DATE_TIME"]:
            return "medium"
        else:
            return "low"

# --- Regex Detector ---
class RegexDetector(PiiDetector):
    """Detects PII using regular expressions."""
    def __init__(self):
        super().__init__()
        self.name = "regex"
        self.patterns = {
            "EMAIL_ADDRESS": re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"),
            "PHONE_NUMBER": re.compile(r"(\+?\d{1,2}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}"),
            "CREDIT_CARD": re.compile(r"\b((4\d{3})|((5[1-5])\d{2})|6011)[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b"),
            "IP_ADDRESS": re.compile(r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b"),
        }

    def analyze(self, text, **kwargs):
        findings = []
        for pii_type, pattern in self.patterns.items():
            for match in pattern.finditer(text):
                findings.append({
                    "sample": match.group(0), "pii_type": pii_type,
                    "confidence_score": 0.99, "risk_level": self._get_risk_level(pii_type),
                    "model_used": self.name, "source": "text_input"
                })
        return findings

# --- spaCy Detector ---
class SpacyDetector(PiiDetector):
    """Detects PII using spaCy's NER."""
    def __init__(self, model_name="en_core_web_sm"):
        super().__init__()
        import spacy
        self.name = f"spacy_{model_name}"
        try:
            self.model = spacy.load(model_name)
        except OSError:
            logging.warning(f"spaCy model '{model_name}' not found. Downloading...")
            spacy.cli.download(model_name)
            self.model = spacy.load(model_name)

    def analyze(self, text, **kwargs):
        doc = self.model(text)
        return [{
            "sample": ent.text, "pii_type": ent.label_, "confidence_score": 0.85, # Default score
            "risk_level": self._get_risk_level(ent.label_), "model_used": self.name, "source": "text_input"
        } for ent in doc.ents]

# --- Stanza Detector ---
class StanzaDetector(PiiDetector):
    """Detects PII using Stanza's NER."""
    def __init__(self, lang="en"):
        super().__init__()
        import stanza
        self.name = f"stanza_{lang}"
        try:
            self.model = stanza.Pipeline(lang, processors='tokenize,ner', verbose=False)
        except Exception:
            logging.warning(f"Stanza models for '{lang}' not found. Downloading...")
            stanza.download(lang, verbose=False)
            self.model = stanza.Pipeline(lang, processors='tokenize,ner', verbose=False)
            
    def analyze(self, text, **kwargs):
        doc = self.model(text)
        return [{
            "sample": ent.text, "pii_type": ent.type, "confidence_score": 0.88, # Default score
            "risk_level": self._get_risk_level(ent.type), "model_used": self.name, "source": "text_input"
        } for ent in doc.ents]

# --- Flair Detector ---
class FlairDetector(PiiDetector):
    """Detects PII using Flair's NER."""
    def __init__(self, model_tag="ner-english"):
        super().__init__()
        from flair.models import SequenceTagger
        self.name = f"flair_{model_tag}"
        self.model = SequenceTagger.load(model_tag)

    def analyze(self, text, **kwargs):
        from flair.data import Sentence
        sentence = Sentence(text)
        self.model.predict(sentence)
        return [{
            "sample": entity.text, "pii_type": entity.tag, "confidence_score": round(entity.score, 2),
            "risk_level": self._get_risk_level(entity.tag), "model_used": self.name, "source": "text_input"
        } for entity in sentence.get_spans('ner')]

# --- BERT (HuggingFace) Detector ---
class BertDetector(PiiDetector):
    """Detects PII using a BERT model from HuggingFace."""
    def __init__(self, model_name="dslim/bert-base-NER"):
        super().__init__()
        from transformers import pipeline, AutoTokenizer, AutoModelForTokenClassification
        self.name = f"bert_{model_name}"
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForTokenClassification.from_pretrained(model_name)
        self.pipeline = pipeline("ner", model=model, tokenizer=tokenizer, aggregation_strategy="simple")

    def analyze(self, text, **kwargs):
        ner_results = self.pipeline(text)
        return [{
            "sample": entity['word'], "pii_type": entity['entity_group'], "confidence_score": round(entity['score'], 2),
            "risk_level": self._get_risk_level(entity['entity_group']), "model_used": self.name, "source": "text_input"
        } for entity in ner_results]

# --- Spark NLP Detector (Requires separate setup) ---
class SparkNLPDetector(PiiDetector):
    """Detects PII using Spark NLP."""
    def __init__(self):
        super().__init__()
        self.name = "spark_nlp"
        logging.warning("Initializing Spark NLP. This may take a moment...")
        from sparknlp.base import DocumentAssembler, Finisher
        from sparknlp.annotator import Tokenizer, WordEmbeddingsModel, NerDLModel
        from pyspark.ml import Pipeline
        import sparknlp
        
        # This requires a running Spark session
        self.spark = sparknlp.start()
        
        # Define Spark NLP pipeline
        document_assembler = DocumentAssembler().setInputCol("text").setOutputCol("document")
        tokenizer = Tokenizer().setInputCols(["document"]).setOutputCol("token")
        glove_embeddings = WordEmbeddingsModel.pretrained("glove_100d", "xx")             .setInputCols(["document", "token"]).setOutputCol("embeddings")
        ner_model = NerDLModel.pretrained("ner_dl", "en")             .setInputCols(["document", "token", "embeddings"]).setOutputCol("ner")
        finisher = Finisher().setInputCols(["ner"])

        self.pipeline = Pipeline(stages=[
            document_assembler,
            tokenizer,
            glove_embeddings,
            ner_model,
            finisher
        ])

    def analyze(self, text, **kwargs):
        df = self.spark.createDataFrame([[text]]).toDF("text")
        result = self.pipeline.fit(df).transform(df)
        ner_tags = result.select("finished_ner").first()['finished_ner']
        # Spark NLP output requires more complex parsing, this is a simplified example
        return [{
            "sample": tag, "pii_type": "SPARK_ENTITY", "confidence_score": 0.9,
            "risk_level": self._get_risk_level("SPARK_ENTITY"), "model_used": self.name, "source": "text_input"
        } for tag in ner_tags]


# ===================================
# 3. SCANNERS (FILE/DATABASE)
# ===================================
class Scanner:
    """Orchestrates the scanning process."""
    def __init__(self, args):
        self.args = args
        self.db = ResultsDatabase()
        self.detector = self._load_detector(args.model)
        self.regex_detector = RegexDetector() if args.enable_regex else None

    def _load_detector(self, model_name):
        logging.info(f"Loading PII detection model: {model_name}...")
        try:
            if model_name == "spacy": return SpacyDetector()
            if model_name == "stanza": return StanzaDetector()
            if model_name == "flair": return FlairDetector()
            if model_name == "bert": return BertDetector()
            if model_name == "sparknlp": return SparkNLPDetector()
            if model_name == "regex": return RegexDetector()
            raise ValueError(f"Model '{model_name}' is not supported.")
        except Exception as e:
            logging.error(f"Failed to load model '{model_name}'. Error: {e}")
            logging.error("Please ensure you have run 'pip install -r requirements.txt' and have internet for first-time model downloads.")
            sys.exit(1)

    def scan(self):
        if self.args.scan_mode == "file": self._scan_file()
        elif self.args.scan_mode == "db": self._scan_database()

    def _scan_file(self):
        f_path = self.args.file_path
        logging.info(f"Starting file scan on: {f_path}")
        try:
            if f_path.endswith('.csv'): df = pd.read_csv(f_path, on_bad_lines='skip')
            elif f_path.endswith(('.xls', '.xlsx')): df = pd.read_excel(f_path)
            elif f_path.endswith('.json'): df = pd.read_json(f_path, lines=True)
            else: logging.error(f"Unsupported file type: {f_path}"); return

            for index, row in df.iterrows():
                for col_name, value in row.items():
                    if isinstance(value, str) and value.strip():
                        source_id = f"{os.path.basename(f_path)}::row:{index+1}::col:{col_name}"
                        text_to_scan = str(value)
                        
                        # Context injection
                        if self.args.enable_context:
                            text_to_scan = f"In column '{col_name}', the value is '{value}'"
                            
                        self._process_text(text_to_scan, value, source_id)
        except FileNotFoundError:
            logging.error(f"Error: File not found at '{f_path}'")
        except Exception as e:
            logging.error(f"Failed to read or process file '{f_path}'. Error: {e}")

    def _scan_database(self):
        logging.warning("Database scanning is a complex feature and is not fully implemented.")
        logging.info(f"Simulating scan for DB type: {self.args.db_type} on host: {self.args.db_host}")
        # In a real implementation:
        # 1. Use psycopg2, mysql-connector-python, or pymongo to connect.
        # 2. Query schema to get all tables/collections and their columns.
        # 3. For each table, SELECT and stream rows with a cursor.
        # 4. For each row, iterate through columns, check for text-like data.
        # 5. Call self._process_text with context: f"db:{db_name}::table:{tbl}::col:{col}::row_id:{row_id}"

    def _process_text(self, processed_text, original_sample, source):
        all_findings = []
        
        # Main detector
        if self.args.model != 'regex':
            findings = self.detector.analyze(processed_text)
            for f in findings:
                f["source"] = source
                # Ensure original sample is logged, not the context-injected one
                f["sample"] = self._find_original_sample(f['sample'], original_sample)
            all_findings.extend(findings)

        # Optional Regex detector
        if self.regex_detector:
            regex_findings = self.regex_detector.analyze(original_sample) # Regex runs on original text
            for f in regex_findings:
                f["source"] = source
            all_findings.extend(regex_findings)
        
        if all_findings:
            self.db.log_findings(all_findings)

    def _find_original_sample(self, found_pii, original_text):
        # A simple check to see if the found PII is a substring of the original
        return found_pii if found_pii in original_text else original_text


# ===================================
# 4. MAIN EXECUTION
# ===================================
def main():
    parser = argparse.ArgumentParser(
        description="A local, offline-first PII detection engine.",
        formatter_class=argparse.RawTextHelpFormatter,
        epilog="""
Usage Examples:
-----------------
# 1. Scan a CSV file using spaCy and also run regex checks:
   python main.py file --file_path data.csv --model spacy --enable_regex

# 2. Scan an Excel file using BERT with context injection for better accuracy:
   python main.py file --file_path financial_records.xlsx --model bert --enable_context

# 3. Scan a JSON file using only regex for speed:
   python main.py file --file_path logs.json --model regex

# 4. Simulate a database scan (feature in development):
   python main.py db --db_type postgresql --db_host localhost --model flair
""")
    
    # Scan Mode
    parser.add_argument("scan_mode", choices=["file", "db"], help="The mode of scanning: 'file' or 'db'.")
    
    # File Scan Options
    parser.add_argument("--file_path", help="Path to the data file to scan (CSV, XLSX, JSON).")
    
    # DB Scan Options
    parser.add_argument("--db_type", choices=["postgresql", "mysql", "mongodb"], help="Database type for scanning.")
    parser.add_argument("--db_host", default="localhost", help="Database host.")
    
    # Model Selection
    models = ["spacy", "stanza", "flair", "bert", "regex", "sparknlp"]
    parser.add_argument("--model", required=True, choices=models, help="PII detection model to use.")
    
    # Feature Toggles
    parser.add_argument("--enable_regex", action="store_true", help="Additionally run regex-based scanning.")
    parser.add_argument("--enable_context", action="store_true", help="Wrap text in descriptive context to improve model accuracy.")

    args = parser.parse_args()

    # --- Create a dummy CSV for easy demonstration ---
    if args.scan_mode == 'file' and not args.file_path:
        dummy_file = "sample_data.csv"
        logging.info(f"No file path provided. Creating a dummy '{dummy_file}' for demonstration.")
        dummy_data = {
            "name": ["John Doe", "Jane Smith", "Robert Johnson", "Alice Williams"],
            "email": ["john.d@email.com", "jane.s@work.net", "bob@university.edu", "alice.w@web.com"],
            "contact": ["Home: 555-123-4567", "Cell: (987) 654-3210", "Work: 123.456.7890", "Fax: 555 888 9999"],
            "notes": ["Met in New York City.", "Card: 4111-2222-3333-4444.", "From Berlin.", "IP is 192.168.1.1"]
        }
        pd.DataFrame(dummy_data).to_csv(dummy_file, index=False)
        args.file_path = dummy_file

    try:
        scanner = Scanner(args)
        scanner.scan()
        logging.info("PII scan finished. Results are stored in 'pii_findings.db'.")
    except Exception as e:
        logging.error(f"A critical error occurred during the scan: {e}", exc_info=True)

if __name__ == "__main__":
    main()
