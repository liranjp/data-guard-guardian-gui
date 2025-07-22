import re
import os
from typing import List, Dict, Optional

# On-demand imports for models
spacy = None
stanza = None
flair = None
transformers = None
pyspark = None
sparknlp = None

class PiiDetector:
    def __init__(self, model_name: str, use_regex: bool = False, use_context: bool = False):
        self.model_name = model_name
        self.use_regex = use_regex
        self.use_context = use_context
        self.model = self._load_model()

    def _load_model(self):
        # On-demand model loading
        if self.model_name == "spacy":
            global spacy
            if spacy is None:
                import spacy
            try:
                return spacy.load("en_core_web_sm")
            except OSError:
                print("Downloading spaCy model 'en_core_web_sm'...")
                os.system("python -m spacy download en_core_web_sm")
                return spacy.load("en_core_web_sm")
        
        elif self.model_name == "stanza":
            global stanza
            if stanza is None:
                import stanza
            # Stanza downloads models automatically if not found
            return stanza.Pipeline('en', processors='tokenize,ner')

        elif self.model_name == "flair":
            global flair
            if flair is None:
                import flair
            # Flair downloads models automatically if not found
            return flair.models.SequenceTagger.load('ner')

        elif self.model_name == "bert":
            global transformers
            if transformers is None:
                import transformers
            return transformers.pipeline("ner", model="dslim/bert-base-NER")

        elif self.model_name == "spark":
            global pyspark, sparknlp
            if pyspark is None:
                import pyspark
                import sparknlp
                from sparknlp.base import DocumentAssembler
                from sparknlp.annotator import Tokenizer, NerDLModel, WordEmbeddingsModel
                from pyspark.ml import Pipeline

                self.spark = sparknlp.start()
                document_assembler = DocumentAssembler().setInputCol("text").setOutputCol("document")
                tokenizer = Tokenizer().setInputCols(["document"]).setOutputCol("token")
                glove_embeddings = WordEmbeddingsModel.pretrained("glove_100d").setInputCols(["document", "token"]).setOutputCol("embeddings")
                ner_model = NerDLModel.pretrained("ner_dl").setInputCols(["document", "token", "embeddings"]).setOutputCol("ner")
                pipeline = Pipeline(stages=[document_assembler, tokenizer, glove_embeddings, ner_model])
                # Create a dummy dataframe to warm up the pipeline
                self.model = pipeline.fit(self.spark.createDataFrame([[""]], ["text"]))
            return self.model

        else:
            raise ValueError(f"Unsupported model: {self.model_name}")

    def detect(self, value: str, column_name: Optional[str] = None, table_name: Optional[str] = None) -> List[Dict[str, str]]:
        text_to_scan = self._prepare_input(value, column_name, table_name)
        
        pii_entities = []

        if self.use_regex:
            pii_entities.extend(self._detect_with_regex(value))

        if self.model_name == "spark":
            # Spark NLP expects a list of strings
            spark_df = self.spark.createDataFrame([[text_to_scan]], ["text"])
            result = self.model.transform(spark_df)
            # Process Spark results
            for row in result.collect():
                for annotation in row.ner:
                    if annotation.result != "O": # Filter out non-entities
                        pii_entities.append({"entity": annotation.result, "value": annotation.metadata["text"]})
        else:
            # For other models, process single text
            entities = self._predict(text_to_scan)
            pii_entities.extend(entities)

        return pii_entities

    def _prepare_input(self, value: str, column_name: Optional[str], table_name: Optional[str]) -> str:
        if self.use_context:
            if table_name and column_name:
                return f"In table {table_name}, the column {column_name} has the value {value}"
            elif column_name:
                return f"The {column_name} is {value}"
        return value

    def _detect_with_regex(self, value: str) -> List[Dict[str, str]]:
        regex_patterns = {
            "EMAIL": r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+",
            "PHONE": r"\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}",
            "CREDIT_CARD": r"\b(?:\d[ -]*?){13,16}\b",
        }
        found_pii = []
        for pii_type, pattern in regex_patterns.items():
            matches = re.findall(pattern, value)
            for match in matches:
                found_pii.append({"entity": pii_type, "value": match})
        return found_pii

    def _predict(self, text: str) -> List[Dict[str, str]]:
        if self.model_name == "spacy":
            doc = self.model(text)
            return [{"entity": ent.label_, "value": ent.text} for ent in doc.ents]
        
        elif self.model_name == "stanza":
            doc = self.model(text)
            return [{"entity": ent.type, "value": ent.text} for ent in doc.ents]

        elif self.model_name == "flair":
            from flair.data import Sentence
            sentence = Sentence(text)
            self.model.predict(sentence)
            return [{"entity": span.tag, "value": span.text} for span in sentence.get_spans('ner')]

        elif self.model_name == "bert":
            entities = self.model(text)
            # Combine sub-word tokens
            return self._group_bert_entities(entities)
        
        return []

    def _group_bert_entities(self, entities: List[Dict]) -> List[Dict[str, str]]:
        if not entities:
            return []

        grouped_entities = []
        current_entity = None

        for ent in entities:
            # BERT NER models often use B- and I- prefixes for entity types
            entity_type = ent['entity_group'].replace("B-", "").replace("I-", "")
            
            if ent['entity_group'].startswith("B-") or current_entity is None:
                if current_entity:
                    grouped_entities.append(current_entity)
                current_entity = {"entity": entity_type, "value": ent['word']}
            
            elif ent['entity_group'].startswith("I-") and current_entity and current_entity["entity"] == entity_type:
                # Check for word splitting with '##'
                if ent['word'].startswith("##"):
                    current_entity["value"] += ent['word'][2:]
                else:
                    current_entity["value"] += " " + ent['word']
            else:
                if current_entity:
                    grouped_entities.append(current_entity)
                current_entity = None # Reset
        
        if current_entity:
            grouped_entities.append(current_entity)
            
        return grouped_entities

if __name__ == "__main__":
    # --- Example Usage ---
    
    # 1. Define the data to scan
    data_value = "My name is Jane Smith and my email is j.smith@university.edu. My phone is 123-456-7890."
    column = "user_profile"
    table = "users"

    # 2. Choose a detection model
    # Options: "spacy", "stanza", "flair", "bert", "spark"
    chosen_model = "bert"

    # 3. Configure detection options
    use_regex_detection = True
    use_context_injection = False # Context can sometimes confuse NER models

    # 4. Initialize the detector and scan for PII
    print(f"Loading model '{chosen_model}'...")
    detector = PiiDetector(
        model_name=chosen_model,
        use_regex=use_regex_detection,
        use_context=use_context_injection
    )
    
    print("Detecting PII...")
    detected_pii = detector.detect(data_value, column_name=column, table_name=table)

    # 5. Print the results
    print(f"\n--- PII Detection Report ---")
    print(f"Model: {chosen_model.upper()}")
    print(f"Regex Detection: {'Enabled' if use_regex_detection else 'Disabled'}")
    print(f"Context Injection: {'Enabled' if use_context_injection else 'Disabled'}")
    if not use_context_injection:
        print(f"Scanned Text: \"{data_value}\"")
    else:
        print(f"Scanned Text: \"{detector._prepare_input(data_value, column, table)}\"")

    print("\n--- Detected PII ---")
    
    if detected_pii:
        for pii in detected_pii:
            print(f"  - Entity: {pii['entity']}, Value: '{pii['value']}'")
    else:
        print("No PII detected.")

    # --- Spark NLP Example ---
    run_spark_example = False # Set to True to run the Spark example
    if run_spark_example:
        print("\n--- Another Example (Spark NLP) ---")
        try:
            spark_detector = PiiDetector(model_name="spark", use_regex=False, use_context=False)
            spark_results = spark_detector.detect("James Bond lives in London and works for MI6.")
            print("Detected entities in 'James Bond lives in London and works for MI6.':")
            if spark_results:
                for pii in spark_results:
                    print(f"  - Entity: {pii['entity']}, Value: '{pii['value']}'")
            else:
                print("No PII detected.")
        except Exception as e:
            print(f"Could not run Spark NLP example: {e}")
            print("Please ensure you have a valid Spark and Spark NLP setup, including JAVA_HOME.")
