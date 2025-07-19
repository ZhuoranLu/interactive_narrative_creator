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


class TextCleaner:
    """Tools for cleaning and normalizing text."""
    
    @staticmethod
    def remove_extra_whitespace(text: str) -> str:
        """Remove extra whitespace, tabs, and normalize line breaks."""
        # Replace multiple whitespace with single space
        text = re.sub(r'\s+', ' ', text)
        # Normalize line breaks
        text = re.sub(r'\r\n|\r', '\n', text)
        # Remove trailing/leading whitespace
        return text.strip()
    
    @staticmethod
    def remove_html_tags(text: str) -> str:
        """Remove HTML tags from text."""
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        # Decode HTML entities
        text = html.unescape(text)
        return text
    
    @staticmethod
    def remove_special_characters(text: str, keep_punctuation: bool = True) -> str:
        """Remove special characters, optionally keeping punctuation."""
        if keep_punctuation:
            # Keep letters, numbers, whitespace, and basic punctuation
            text = re.sub(r'[^\w\s\.\,\!\?\;\:\-\'\"]', '', text)
        else:
            # Keep only letters, numbers, and whitespace
            text = re.sub(r'[^\w\s]', '', text)
        return text
    
    @staticmethod
    def normalize_unicode(text: str) -> str:
        """Normalize unicode characters to their closest ASCII equivalents."""
        # Normalize to NFD form and remove accents
        text = unicodedata.normalize('NFD', text)
        text = ''.join(char for char in text if unicodedata.category(char) != 'Mn')
        return text
    
    @staticmethod
    def clean_text(text: str, 
                   remove_html: bool = True,
                   normalize_whitespace: bool = True,
                   remove_special_chars: bool = False,
                   keep_punctuation: bool = True,
                   normalize_unicode_chars: bool = False) -> str:
        """Comprehensive text cleaning with configurable options."""
        if remove_html:
            text = TextCleaner.remove_html_tags(text)
        
        if normalize_whitespace:
            text = TextCleaner.remove_extra_whitespace(text)
        
        if remove_special_chars:
            text = TextCleaner.remove_special_characters(text, keep_punctuation)
        
        if normalize_unicode_chars:
            text = TextCleaner.normalize_unicode(text)
        
        return text


class TextAnalyzer:
    """Tools for analyzing text properties and statistics."""
    
    @staticmethod
    def word_count(text: str) -> int:
        """Count words in text."""
        words = re.findall(r'\b\w+\b', text.lower())
        return len(words)
    
    @staticmethod
    def character_count(text: str, include_spaces: bool = True) -> int:
        """Count characters in text."""
        if include_spaces:
            return len(text)
        return len(re.sub(r'\s', '', text))
    
    @staticmethod
    def sentence_count(text: str) -> int:
        """Count sentences in text."""
        sentences = re.split(r'[.!?]+', text)
        # Filter out empty strings
        sentences = [s.strip() for s in sentences if s.strip()]
        return len(sentences)
    
    @staticmethod
    def paragraph_count(text: str) -> int:
        """Count paragraphs in text."""
        paragraphs = re.split(r'\n\s*\n', text.strip())
        return len([p for p in paragraphs if p.strip()])
    
    @staticmethod
    def average_sentence_length(text: str) -> float:
        """Calculate average sentence length in words."""
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if not sentences:
            return 0.0
        
        total_words = sum(len(re.findall(r'\b\w+\b', sentence)) for sentence in sentences)
        return total_words / len(sentences)
    
    @staticmethod
    def reading_time(text: str, words_per_minute: int = 200) -> float:
        """Estimate reading time in minutes."""
        word_count = TextAnalyzer.word_count(text)
        return word_count / words_per_minute
    
    @staticmethod
    def word_frequency(text: str, top_n: Optional[int] = None) -> Dict[str, int]:
        """Get word frequency count."""
        words = re.findall(r'\b\w+\b', text.lower())
        frequency = Counter(words)
        
        if top_n:
            return dict(frequency.most_common(top_n))
        return dict(frequency)
    
    @staticmethod
    def text_stats(text: str) -> Dict[str, Union[int, float]]:
        """Get comprehensive text statistics."""
        return {
            'word_count': TextAnalyzer.word_count(text),
            'character_count': TextAnalyzer.character_count(text),
            'character_count_no_spaces': TextAnalyzer.character_count(text, False),
            'sentence_count': TextAnalyzer.sentence_count(text),
            'paragraph_count': TextAnalyzer.paragraph_count(text),
            'average_sentence_length': TextAnalyzer.average_sentence_length(text),
            'reading_time_minutes': TextAnalyzer.reading_time(text)
        }


class TextFormatter:
    """Tools for formatting and transforming text."""
    
    @staticmethod
    def to_title_case(text: str) -> str:
        """Convert text to title case with proper handling."""
        # Simple title case
        return string.capwords(text)
    
    @staticmethod
    def to_sentence_case(text: str) -> str:
        """Convert text to sentence case."""
        if not text:
            return text
        return text[0].upper() + text[1:].lower()
    
    @staticmethod
    def wrap_text(text: str, width: int = 80, indent: str = '') -> str:
        """Wrap text to specified width with optional indentation."""
        words = text.split()
        lines = []
        current_line = indent
        
        for word in words:
            # Check if adding the word would exceed width
            if len(current_line + word) + 1 <= width:
                if current_line == indent:
                    current_line += word
                else:
                    current_line += ' ' + word
            else:
                lines.append(current_line)
                current_line = indent + word
        
        if current_line:
            lines.append(current_line)
        
        return '\n'.join(lines)
    
    @staticmethod
    def add_line_numbers(text: str, start: int = 1) -> str:
        """Add line numbers to text."""
        lines = text.split('\n')
        numbered_lines = []
        
        for i, line in enumerate(lines, start):
            numbered_lines.append(f"{i:4d}: {line}")
        
        return '\n'.join(numbered_lines)
    
    @staticmethod
    def remove_line_numbers(text: str) -> str:
        """Remove line numbers from text."""
        lines = text.split('\n')
        clean_lines = []
        
        for line in lines:
            # Remove line numbers (assumes format "####: content")
            clean_line = re.sub(r'^\s*\d+:\s*', '', line)
            clean_lines.append(clean_line)
        
        return '\n'.join(clean_lines)
    
    @staticmethod
    def indent_text(text: str, indent: str = '    ') -> str:
        """Add indentation to each line of text."""
        lines = text.split('\n')
        return '\n'.join(indent + line for line in lines)
    
    @staticmethod
    def remove_indent(text: str) -> str:
        """Remove common indentation from text."""
        lines = text.split('\n')
        if not lines:
            return text
        
        # Find minimum indentation
        min_indent = float('inf')
        for line in lines:
            if line.strip():  # Skip empty lines
                indent = len(line) - len(line.lstrip())
                min_indent = min(min_indent, indent)
        
        if min_indent == float('inf'):
            return text
        
        # Remove common indentation
        clean_lines = []
        for line in lines:
            if line.strip():
                clean_lines.append(line[min_indent:])
            else:
                clean_lines.append('')
        
        return '\n'.join(clean_lines)


class TextTransformer:
    """Tools for transforming and manipulating text content."""
    
    @staticmethod
    def reverse_text(text: str) -> str:
        """Reverse the entire text."""
        return text[::-1]
    
    @staticmethod
    def reverse_words(text: str) -> str:
        """Reverse the order of words."""
        words = text.split()
        return ' '.join(reversed(words))
    
    @staticmethod
    def shuffle_sentences(text: str) -> str:
        """Shuffle the order of sentences."""
        import random
        sentences = re.split(r'([.!?]+)', text)
        # Group sentences with their punctuation
        sentence_pairs = []
        for i in range(0, len(sentences) - 1, 2):
            if i + 1 < len(sentences):
                sentence_pairs.append(sentences[i] + sentences[i + 1])
            else:
                sentence_pairs.append(sentences[i])
        
        random.shuffle(sentence_pairs)
        return ''.join(sentence_pairs)
    
    @staticmethod
    def extract_sentences(text: str) -> List[str]:
        """Extract individual sentences from text."""
        sentences = re.split(r'[.!?]+', text)
        return [s.strip() for s in sentences if s.strip()]
    
    @staticmethod
    def extract_words(text: str) -> List[str]:
        """Extract individual words from text."""
        return re.findall(r'\b\w+\b', text)
    
    @staticmethod
    def extract_paragraphs(text: str) -> List[str]:
        """Extract individual paragraphs from text."""
        paragraphs = re.split(r'\n\s*\n', text.strip())
        return [p.strip() for p in paragraphs if p.strip()]
    
    @staticmethod
    def replace_patterns(text: str, replacements: Dict[str, str], use_regex: bool = False) -> str:
        """Replace multiple patterns in text."""
        result = text
        for pattern, replacement in replacements.items():
            if use_regex:
                result = re.sub(pattern, replacement, result)
            else:
                result = result.replace(pattern, replacement)
        return result
    
    @staticmethod
    def extract_between_markers(text: str, start_marker: str, end_marker: str) -> List[str]:
        """Extract text between specified markers."""
        pattern = re.escape(start_marker) + r'(.*?)' + re.escape(end_marker)
        matches = re.findall(pattern, text, re.DOTALL)
        return matches
    
    @staticmethod
    def split_by_delimiter(text: str, delimiter: str, max_splits: Optional[int] = None) -> List[str]:
        """Split text by delimiter with optional max splits."""
        if max_splits is None:
            return text.split(delimiter)
        return text.split(delimiter, max_splits)


class NarrativeTools:
    """Specialized tools for narrative and story text processing."""
    
    @staticmethod
    def extract_dialogue(text: str) -> List[str]:
        """Extract dialogue from text (text between quotes)."""
        # Match text between various quote types
        dialogue = re.findall(r'["""]([^"""]*)["""]', text)
        dialogue.extend(re.findall(r"'([^']*)'", text))
        return [d.strip() for d in dialogue if d.strip()]
    
    @staticmethod
    def extract_names(text: str) -> List[str]:
        """Extract potential character names (capitalized words)."""
        # Find words that start with capital letters (potential names)
        names = re.findall(r'\b[A-Z][a-z]+\b', text)
        # Remove common words that might be capitalized
        common_words = {'The', 'A', 'An', 'This', 'That', 'These', 'Those', 'I', 'We', 'You', 'He', 'She', 'It', 'They'}
        names = [name for name in names if name not in common_words]
        return list(set(names))  # Remove duplicates
    
    @staticmethod
    def count_chapters_sections(text: str) -> Dict[str, int]:
        """Count chapters and sections in text."""
        chapters = len(re.findall(r'\bchapter\s+\d+\b', text, re.IGNORECASE))
        chapters += len(re.findall(r'\bch\.\s*\d+\b', text, re.IGNORECASE))
        
        sections = len(re.findall(r'\bsection\s+\d+\b', text, re.IGNORECASE))
        sections += len(re.findall(r'\bpart\s+\d+\b', text, re.IGNORECASE))
        
        return {'chapters': chapters, 'sections': sections}
    
    @staticmethod
    def extract_scene_breaks(text: str) -> List[str]:
        """Extract text segments separated by scene breaks."""
        # Common scene break patterns
        scene_break_patterns = [
            r'\*\s*\*\s*\*',  # ***
            r'-{3,}',         # ---
            r'#{3,}',         # ###
            r'=+',            # ===
        ]
        
        # Try each pattern
        for pattern in scene_break_patterns:
            if re.search(pattern, text):
                scenes = re.split(pattern, text)
                return [scene.strip() for scene in scenes if scene.strip()]
        
        # If no scene breaks found, return the whole text
        return [text.strip()] if text.strip() else []
    
    @staticmethod
    def format_dialogue(text: str, indent: str = '    ') -> str:
        """Format dialogue with proper indentation."""
        lines = text.split('\n')
        formatted_lines = []
        
        for line in lines:
            line = line.strip()
            if line and (line.startswith('"') or line.startswith("'") or 
                        line.startswith('"') or line.startswith('"')):
                # This looks like dialogue, indent it
                formatted_lines.append(indent + line)
            else:
                formatted_lines.append(line)
        
        return '\n'.join(formatted_lines)
    
    @staticmethod
    def add_scene_breaks(text: str, scenes: List[str], break_style: str = '***') -> str:
        """Join scenes with specified break style."""
        return f'\n\n{break_style}\n\n'.join(scenes)


class TextValidator:
    """Tools for validating text content."""
    
    @staticmethod
    def has_balanced_quotes(text: str) -> bool:
        """Check if quotes are balanced in the text."""
        double_quotes = text.count('"')
        single_quotes = text.count("'")
        smart_quotes_open = text.count('"')
        smart_quotes_close = text.count('"')
        
        return (double_quotes % 2 == 0 and 
                single_quotes % 2 == 0 and
                smart_quotes_open == smart_quotes_close)
    
    @staticmethod
    def has_balanced_parentheses(text: str) -> bool:
        """Check if parentheses, brackets, and braces are balanced."""
        stack = []
        pairs = {'(': ')', '[': ']', '{': '}'}
        
        for char in text:
            if char in pairs.keys():
                stack.append(char)
            elif char in pairs.values():
                if not stack:
                    return False
                if pairs[stack.pop()] != char:
                    return False
        
        return len(stack) == 0
    
    @staticmethod
    def find_repeated_words(text: str) -> List[Tuple[str, List[int]]]:
        """Find words that appear consecutively (like 'the the')."""
        words = re.findall(r'\b\w+\b', text.lower())
        repeated = []
        
        for i in range(len(words) - 1):
            if words[i] == words[i + 1]:
                repeated.append((words[i], [i, i + 1]))
        
        return repeated
    
    @staticmethod
    def check_spelling_patterns(text: str) -> Dict[str, List[str]]:
        """Find potential spelling issues using common patterns."""
        issues = {
            'double_letters': [],
            'unusual_patterns': [],
            'mixed_case': []
        }
        
        words = re.findall(r'\b\w+\b', text)
        
        for word in words:
            # Check for unusual double letters
            if re.search(r'(.)\1{2,}', word):
                issues['double_letters'].append(word)
            
            # Check for mixed case in middle of word
            if re.search(r'[a-z][A-Z]', word):
                issues['mixed_case'].append(word)
            
            # Check for unusual letter patterns
            if re.search(r'[qxz]{2,}|[bcdfghjklmnpqrstvwxyz]{4,}', word.lower()):
                issues['unusual_patterns'].append(word)
        
        return {k: list(set(v)) for k, v in issues.items()}


# Convenience function to access all tools
def get_text_processor():
    """Get a dictionary of all text processing tools."""
    return {
        'cleaner': TextCleaner(),
        'analyzer': TextAnalyzer(),
        'formatter': TextFormatter(),
        'transformer': TextTransformer(),
        'narrative': NarrativeTools(),
        'validator': TextValidator()
    }


# Quick access functions for common operations
def clean_text(text: str, **kwargs) -> str:
    """Quick access to text cleaning."""
    return TextCleaner.clean_text(text, **kwargs)


def analyze_text(text: str) -> Dict[str, Union[int, float]]:
    """Quick access to text analysis."""
    return TextAnalyzer.text_stats(text)


def format_text(text: str, width: int = 80, indent: str = '') -> str:
    """Quick access to text formatting."""
    return TextFormatter.wrap_text(text, width, indent)


# Example usage and testing
if __name__ == "__main__":
    sample_text = """
    This is a sample text for testing our text processing tools.
    
    "Hello," said the character. "How are you today?"
    
    The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet.
    
    Chapter 1: The Beginning
    
    It was the best of times, it was the worst of times...
    """
    
    print("=== Text Processing Tools Demo ===\n")
    
    # Text Analysis
    stats = analyze_text(sample_text)
    print("Text Statistics:")
    for key, value in stats.items():
        print(f"  {key}: {value}")
    
    # Text Cleaning
    cleaned = clean_text(sample_text, normalize_whitespace=True)
    print(f"\nCleaned text length: {len(cleaned)} characters")
    
    # Narrative Tools
    dialogue = NarrativeTools.extract_dialogue(sample_text)
    print(f"\nExtracted dialogue: {dialogue}")
    
    names = NarrativeTools.extract_names(sample_text)
    print(f"Potential character names: {names}")
