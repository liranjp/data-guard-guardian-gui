from abc import ABC, abstractmethod
from typing import Generator, Tuple

class DataSource(ABC):
    @abstractmethod
    def read_data(self) -> Generator[Tuple[str, str], None, None]:
        # Yields tuples of (data, source_context)
        raise NotImplementedError

