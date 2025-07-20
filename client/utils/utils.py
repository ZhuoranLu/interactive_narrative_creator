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