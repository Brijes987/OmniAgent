import pytest
from unittest.mock import AsyncMock, patch
from pydantic import BaseModel
from ai_engine import AIEngine


class TestResponse(BaseModel):
    status: str
    result: str


@pytest.mark.asyncio
@patch('ai_engine.AsyncOpenAI')
async def test_self_healing_recovers_from_malformed_json(mock_openai_class):
    # Setup mocks
    mock_client = AsyncMock()
    mock_openai_class.return_value = mock_client

    # Mock OpenAI responses: first broken, then valid
    mock_client.chat.completions.create.side_effect = [
        AsyncMock(
            choices=[AsyncMock(message=AsyncMock(content="{ malformed_json: 'missing quotes' }"))],
            usage=AsyncMock(prompt_tokens=100, completion_tokens=50)
        ),
        AsyncMock(
            choices=[AsyncMock(message=AsyncMock(content='{"status": "success", "result": "recovered"}'))],
            usage=AsyncMock(prompt_tokens=100, completion_tokens=50)
        ),
    ]

    # Initialize engine
    engine = AIEngine()

    # Mock semantic cache
    with patch.object(engine.semantic_cache, 'lookup', return_value=None):
        with patch.object(engine.semantic_cache, 'store'):
            result, tokens_used, cost = await engine.generate(
                system_prompt="Return valid JSON structure",
                user_prompt="Generate user profile as JSON",
                model="gpt-4o",
                temperature=0.7,
                response_schema=TestResponse
            )

    # Assertions
    assert isinstance(result, TestResponse)
    assert result.status == "success"
    assert result.result == "recovered"
    assert mock_client.chat.completions.create.call_count == 2  # Should retry once (self-heal)


@pytest.mark.asyncio
@patch('ai_engine.AsyncOpenAI')
async def test_semantic_cache_hit_skips_openai(mock_openai_class):
    # Setup mock cached response
    cached_data = TestResponse(status="cached", result="from_cache")

    # Initialize engine
    engine = AIEngine()

    # Mock cache hit
    with patch.object(engine.semantic_cache, 'lookup', return_value=cached_data.model_dump()):
        with patch.object(engine.semantic_cache, 'store') as mock_store:
            result, tokens_used, cost = await engine.generate(
                system_prompt="Test",
                user_prompt="Test",
                model="gpt-4o",
                response_schema=TestResponse
            )

    # Assertions
    assert isinstance(result, dict)
    assert result["status"] == "cached"
    assert tokens_used == 0
    assert cost == 0.0
    mock_openai_class.assert_not_called()  # OpenAI should not be called
    mock_store.assert_not_called()  # No need to store if already cached
