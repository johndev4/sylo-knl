import os
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import re_embed_documents


class ReEmbedDocumentsEnvTests(unittest.TestCase):
    def setUp(self) -> None:
        self.original_env = os.environ.copy()
        for key in [
            "SUPABASE_URL",
            "SUPABASE_SERVICE_ROLE_KEY",
            "SUPABASE_KEY",
            "NEXT_PUBLIC_SUPABASE_URL",
            "NEXT_PUBLIC_SUPABASE_ANON_KEY",
            "GOOGLE_API_KEY",
            "GOOGLE_GENERATIVE_AI_API_KEY",
            "GEMINI_API_KEY",
            "LLM_PROVIDER",
            "OLLAMA_BASE_URL",
        ]:
            os.environ.pop(key, None)

    def tearDown(self) -> None:
        os.environ.clear()
        os.environ.update(self.original_env)

    def test_config_accepts_project_root_env_var_names(self) -> None:
        os.environ["NEXT_PUBLIC_SUPABASE_URL"] = "https://example.supabase.co"
        os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "service-role-key"
        os.environ["GOOGLE_GENERATIVE_AI_API_KEY"] = "google-key"
        os.environ["LLM_PROVIDER"] = "google"

        config = re_embed_documents.Config()

        self.assertEqual(config.supabase_url, "https://example.supabase.co")
        self.assertEqual(config.supabase_key, "service-role-key")
        self.assertEqual(config.google_api_key, "google-key")
        self.assertEqual(config.llm_provider, "google")


if __name__ == "__main__":
    unittest.main()
