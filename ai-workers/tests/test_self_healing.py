import unittest
from unittest.mock import AsyncMock, patch
from ai_engine import AIEngine


class TestSelfHealingLoop(unittest.IsolatedAsyncioTestCase):

    @patch('ai_engine.AsyncOpenAI')
    async def test_self_healing_recovers_from_malformed_json(self, mock_openai_class):
        # Setup mocks
        mock_client = AsyncMock()
        mock_openai_class.return_value = mock_client

        # Call 1: Returns broken JSON
        # Call 2: Returns valid corrected JSON
        mock_client.chat.completions.create.side_effect = [
            AsyncMock(choices=[AsyncMock(message=AsyncMock(content="{ malformed_json: 'missing quotes' }"))]),
            AsyncMock(choices=[AsyncMock(message=AsyncMock(content='{"status": "success", "result": "recovered"}'))]),
        ]

        # Also mock the semantic cache to miss
        with patch.object(AIEngine, '_extract_json', side_effect=lambda x: x):
            engine = AIEngine()
            # Mock the cache lookup to return None
            with patch.object(engine.semantic_cache, 'lookup', return_value=None):
                with patch.object(engine.semantic_cache, 'store'):  # Don't actually store
                    result = await engine.generate(
                        system_prompt="Return valid JSON structure",
                        user_prompt="Generate user profile as JSON",
                        model="gpt-4o",
                        temperature=0.7
                    )

        # Assertions
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["result"], "recovered")
        self.assertEqual(mock_client.chat.completions.create.call_count, 2)  # Proves it failed, self-healed, resolved


if __name__ == '__main__':
    unittest.main()
