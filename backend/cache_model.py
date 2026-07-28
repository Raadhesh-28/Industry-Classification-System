from transformers import DistilBertTokenizer, DistilBertForSequenceClassification
print("Downloading tokenizer...")
DistilBertTokenizer.from_pretrained('distilbert-base-uncased')
print("Downloading model...")
DistilBertForSequenceClassification.from_pretrained('distilbert-base-uncased', num_labels=15)
print("Done!")
