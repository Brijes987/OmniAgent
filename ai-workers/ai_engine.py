import os
import json
from typing import Optional, Type, Any, Dict, Tuple
from dotenv import load_dotenv
from openai import AsyncOpenAI
from pydantic import BaseModel, ValidationError
from semantic_cache import SemanticCache
from finops import calculate_inference_cost

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


class AIEngine:
    def __init__(self):
        self.openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)
        self.semantic_cache = SemanticCache()

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str = "gpt-4o",
        temperature: float = 0.7,
        response_schema: Optional[Type[BaseModel]] = None,
        max_retries: int = 3,
    ) -> Tuple[Any, int, float]:
        full_prompt = f"System: {system_prompt}\nUser: {user_prompt}"

        # Check semantic cache first
        cached_response = await self.semantic_cache.lookup(full_prompt)
        if cached_response is not None:
            # For cached responses, we don't have token counts; return 0
            return cached_response, 0, 0.0

        # Build messages
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        # If response schema is provided, add formatting instructions
        if response_schema:
            schema_str = json.dumps(response_schema.model_json_schema(), indent=2)
            messages[0]["content"] += f"\n\nYou must output strictly valid JSON that conforms to this JSON schema:\n{schema_str}"

        # Self-healing loop
        last_error = None
        total_prompt_tokens = 0
        total_completion_tokens = 0
        for attempt in range(max_retries):
            try:
                response = await self.openai_client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                )
                response_text = response.choices[0].message.content.strip()

                # Get token counts from OpenAI response
                prompt_tokens = response.usage.prompt_tokens
                completion_tokens = response.usage.completion_tokens
                total_prompt_tokens += prompt_tokens
                total_completion_tokens += completion_tokens

                # Calculate cost
                finops_data = calculate_inference_cost(model, total_prompt_tokens, total_completion_tokens)

                # Parse JSON if schema is provided
                if response_schema:
                    # Try to extract JSON from response (in case of markdown code blocks)
                    json_str = self._extract_json(response_text)
                    parsed_response = response_schema.model_validate_json(json_str)
                    # Store in semantic cache
                    await self.semantic_cache.store(full_prompt, parsed_response.model_dump())
                    return parsed_response, finops_data["tokens_used"], finops_data["cost"]
                else:
                    # Store raw text in cache
                    await self.semantic_cache.store(full_prompt, response_text)
                    return response_text, finops_data["tokens_used"], finops_data["cost"]

            except ValidationError as e:
                last_error = str(e)
                print(f"[AIEngine] Validation error on attempt {attempt + 1}: {last_error}")
                # Add self-healing message
                messages.append({
                    "role": "assistant",
                    "content": response_text
                })
                messages.append({
                    "role": "user",
                    "content": f"Your previous output failed validation. Error: {last_error}. Please correct your output and strictly follow the JSON schema."
                })

            except Exception as e:
                last_error = str(e)
                print(f"[AIEngine] Error on attempt {attempt + 1}: {last_error}")
                if attempt == max_retries -1:
                    raise

        raise Exception(f"[AIEngine] Failed after {max_retries} attempts. Last error: {last_error}")

    def _extract_json(self, text: str) -> str:
        # Try to find JSON between triple backticks
        if "```json" in text and "```" in text.split("```json")[-1]:
            return text.split("```json")[1].split("```")[0].strip()
        if "```" in text and len(text.split("```")) >=3:
            return text.split("```")[1].strip()
        # Otherwise, try to parse directly
        return text.strip()
