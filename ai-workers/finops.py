from typing import Dict, Any


# Token Pricing Database (Rates per 1,000,000 tokens
MODEL_PRICING = {
    "gpt-4o": {
        "input_rate": 2.50 / 1_000_000,
        "output_rate": 10.00 / 1_000_000
    },
    "claude-3-5-sonnet": {
        "input_rate": 3.00 / 1_000_000,
        "output_rate": 15.00 / 1_000_000
    },
    "llama-3-70b": {
        "input_rate": 0.59 / 1_000_000,
        "output_rate": 0.79 / 1_000_000
    }
}


def calculate_inference_cost(model_name: str, prompt_tokens: int, completion_tokens: int) -> Dict[str, Any]:
    """
    Computes exact USD transaction cost and total tokens for a given model run.
    """
    normalized_name = model_name.lower().strip()
    pricing = MODEL_PRICING.get(normalized_name, {
        "input_rate": 0.15 / 1_000_000,  # Generic fallback rate
        "output_rate": 0.60 / 1_000_000
    })

    total_tokens = prompt_tokens + completion_tokens
    total_cost = (prompt_tokens * pricing["input_rate"]) + (completion_tokens * pricing["output_rate"])

    return {
        "tokens_used": total_tokens,
        "cost": round(total_cost, 6)
    }
