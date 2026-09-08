"""
utils/text_cleaning.py
-----------------------
Small, dependency-free text cleaning helpers. Kept deliberately simple
(no NLTK/spaCy download) so the service stays lightweight and easy to
run for a hackathon demo.
"""

import re

# A short list of common English "filler" words that don't carry meaning
# for skill-matching or similarity purposes. Intentionally small — we
# don't want to accidentally strip out real skill words.
_STOPWORDS = {
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "and", "or", "but", "if", "of", "at", "by", "for", "with", "about",
    "to", "from", "in", "on", "this", "that", "it", "as", "we", "our",
    "i", "you", "they", "will", "would", "should", "can", "could",
}


def clean_text(text: str) -> str:
    """
    Lowercases, strips punctuation/extra whitespace. Used before we
    hand text to the embedding model or do keyword matching.
    NOTE: we deliberately do NOT remove stopwords here — transformer
    embeddings use sentence context, so stripping words can hurt quality.
    """
    if not text:
        return ""
    text = text.lower().strip()
    # Collapse multiple whitespace/newlines into a single space
    text = re.sub(r"\s+", " ", text)
    # Keep letters, numbers, spaces and a few useful symbols (./+#)
    # since skill names like "C++", "Node.js", "C#" use them.
    text = re.sub(r"[^a-z0-9\s\.\+\#\-]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def word_count(text: str) -> int:
    """Simple whitespace-based word count, used for the min-length check
    in routes/validate_solution.py."""
    if not text:
        return 0
    return len(text.strip().split())


def tokenize_keywords(text: str) -> set:
    """
    Cleans text and returns a set of significant words (stopwords removed).
    Used for cheap keyword-overlap checks that complement embedding
    similarity (e.g. in validate_solution.py).
    """
    cleaned = clean_text(text)
    words = cleaned.split()
    return {w for w in words if w not in _STOPWORDS and len(w) > 1}