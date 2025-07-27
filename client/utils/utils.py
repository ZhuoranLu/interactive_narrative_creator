"""
Text Processing Utilities for Interactive Narrative Creator

This module provides a comprehensive set of text processing tools for
cleaning, analyzing, transforming, and formatting text content.
"""

import re
import string
import unicodedata
from typing import List, Dict, Tuple, Optional, Union
from collections import Counter
import html
import json


def json_load_helper(json_file):
    with open(json_file, 'r') as f:
        return json.load(f)


class TextCleaner:
    """Text cleaning utilities"""
    
    @staticmethod
    def clean_html(text: str) -> str:
        """Remove HTML tags and decode HTML entities"""
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        # Decode HTML entities
        text = html.unescape(text)
        return text
    
    @staticmethod
    def normalize_whitespace(text: str) -> str:
        """Normalize whitespace characters"""
        # Replace multiple whitespace with single space
        text = re.sub(r'\s+', ' ', text)
        return text.strip()
    
    @staticmethod
    def remove_special_chars(text: str, keep_chars: str = '') -> str:
        """Remove special characters except those specified in keep_chars"""
        pattern = f'[^a-zA-Z0-9\s{re.escape(keep_chars)}]'
        return re.sub(pattern, '', text)


class TextAnalyzer:
    """Text analysis utilities"""
    
    @staticmethod
    def word_count(text: str) -> int:
        """Count words in text"""
        return len(text.split())
    
    @staticmethod
    def character_count(text: str, include_spaces: bool = True) -> int:
        """Count characters in text"""
        if include_spaces:
            return len(text)
        return len(re.sub(r'\s', '', text))
    
    @staticmethod
    def get_word_frequency(text: str) -> Dict[str, int]:
        """Get word frequency distribution"""
        words = text.lower().split()
        return dict(Counter(words))


class TextFormatter:
    """Text formatting utilities"""
    
    @staticmethod
    def to_title_case(text: str) -> str:
        """Convert text to title case"""
        return text.title()
    
    @staticmethod
    def capitalize_sentences(text: str) -> str:
        """Capitalize the first letter of each sentence"""
        sentences = re.split(r'([.!?]+)', text)
        result = []
        for i, sentence in enumerate(sentences):
            if i % 2 == 0 and sentence.strip():  # Every other element is actual sentence
                sentence = sentence.strip()
                if sentence:
                    sentence = sentence[0].upper() + sentence[1:]
                result.append(sentence)
            else:
                result.append(sentence)
        return ''.join(result)


class TextTransformer:
    """Text transformation utilities"""
    
    @staticmethod
    def extract_keywords(text: str, max_keywords: int = 10) -> List[str]:
        """Extract keywords from text"""
        # Simple keyword extraction based on word frequency
        words = text.lower().split()
        # Filter out common stop words
        stop_words = {'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
                     'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
                     'to', 'was', 'will', 'with'}
        keywords = [word for word in words if word not in stop_words and len(word) > 2]
        word_freq = Counter(keywords)
        return [word for word, _ in word_freq.most_common(max_keywords)]
    
    @staticmethod
    def summarize_text(text: str, max_length: int = 100) -> str:
        """Create a simple summary of text"""
        if len(text) <= max_length:
            return text
        # Simple truncation with word boundary
        truncated = text[:max_length]
        last_space = truncated.rfind(' ')
        if last_space > 0:
            truncated = truncated[:last_space]
        return truncated + '...'


class NarrativeTools:
    """Narrative-specific text processing tools"""
    
    @staticmethod
    def extract_dialogue(text: str) -> List[str]:
        """Extract dialogue from text"""
        # Simple pattern for quoted text
        dialogue_pattern = r'"([^"]*)"'
        return re.findall(dialogue_pattern, text)
    
    @staticmethod
    def identify_characters(text: str) -> List[str]:
        """Identify potential character names (capitalized words)"""
        # Simple pattern for capitalized words that might be names
        name_pattern = r'\b[A-Z][a-z]+\b'
        potential_names = re.findall(name_pattern, text)
        # Filter out common words
        common_words = {'The', 'This', 'That', 'And', 'But', 'Or', 'So', 'Then'}
        return [name for name in set(potential_names) if name not in common_words]


class TextValidator:
    """Text validation utilities"""
    
    @staticmethod
    def is_valid_json(text: str) -> bool:
        """Check if text is valid JSON"""
        try:
            json.loads(text)
            return True
        except (json.JSONDecodeError, TypeError):
            return False
    
    @staticmethod
    def has_minimum_length(text: str, min_length: int) -> bool:
        """Check if text meets minimum length requirement"""
        return len(text.strip()) >= min_length
    
    @staticmethod
    def contains_profanity(text: str) -> bool:
        """Simple profanity check (can be extended)"""
        # Basic implementation - can be extended with proper profanity lists
        basic_profanity = ['damn', 'hell']  # Very basic list for demo
        text_lower = text.lower()
        return any(word in text_lower for word in basic_profanity)


# Convenience functions
def clean_text(text: str) -> str:
    """Clean text using default TextCleaner methods"""
    text = TextCleaner.clean_html(text)
    text = TextCleaner.normalize_whitespace(text)
    return text


def analyze_text(text: str) -> Dict[str, Union[int, List[str]]]:
    """Analyze text and return basic statistics"""
    return {
        'word_count': TextAnalyzer.word_count(text),
        'character_count': TextAnalyzer.character_count(text),
        'keywords': TextTransformer.extract_keywords(text),
        'potential_characters': NarrativeTools.identify_characters(text)
    }


def format_text(text: str) -> str:
    """Format text using default formatting"""
    text = TextFormatter.capitalize_sentences(text)
    return text 