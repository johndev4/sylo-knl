import unittest
from unittest.mock import MagicMock, patch

import requests

import re_embed_documents


class ReEmbedDocumentsOllamaTests(unittest.TestCase):
    def test_normalize_ollama_base_url_strips_api_suffix(self) -> None:
        self.assertEqual(
            re_embed_documents._normalize_ollama_base_url("http://localhost:11434/api"),
            "http://localhost:11434",
        )
    def test_ollama_provider_falls_back_to_embeddings_endpoint(self) -> None:
        first_response = MagicMock()
        first_response.status_code = 404
        first_response.raise_for_status.side_effect = requests.HTTPError(response=first_response)

        second_response = MagicMock()
        second_response.status_code = 200
        second_response.json.return_value = {"embeddings": [[0.1, 0.2, 0.3]]}
        second_response.raise_for_status.return_value = None

        with patch("re_embed_documents.requests.post", side_effect=[first_response, second_response]) as post_mock:
            vector_dim = re_embed_documents.test_embedding_provider(
                "ollama",
                base_url="http://localhost:11434",
            )

        self.assertEqual(vector_dim, 3)
        self.assertEqual(post_mock.call_count, 2)
        self.assertEqual(post_mock.call_args_list[1].args[0], "http://localhost:11434/api/embeddings")


if __name__ == "__main__":
    unittest.main()
