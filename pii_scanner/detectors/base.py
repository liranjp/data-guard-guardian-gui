from abc import ABC, abstractmethod
from typing import List
from pii_scanner.core.models import PIIResult

class PiiDetector(ABC):
    def __init__(self, use_regex: bool = False, context_injection: bool = False):
        self.use_regex = use_regex
        self.context_injection = context_injection

    @abstractmethod
    def scan(self, text: str, source: str) -> List[PIIResult]:
        raise NotImplementedError

