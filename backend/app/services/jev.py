"""Ask Jev (TypeSafe System One model, via OpenRouter) to triage a dorm request."""

import time
from dataclasses import dataclass

from typesafe_sdk import Choice, Noul, Score, TypeSafeClient
from typesafe_sdk._core.response_types import SystemOneResponse, Usage

from app.config import OPENROUTER_BASE_URL, get_settings

PRIORITY_LEVELS = [
    "Low: cosmetic or minor inconvenience, can wait a week",
    "Medium: affects daily comfort, fix within a few days",
    "High: major disruption or property damage, fix within 24 hours",
    "Emergency: immediate danger to safety or health, fix right now",
]


# OpenRouter adds `id`, `provider` and `usage.cost`, which the SDK's own models drop.
class OpenRouterUsage(Usage):
    cost: float | None = None


class OpenRouterResponse(SystemOneResponse):
    id: str | None = None
    provider: str | None = None
    usage: OpenRouterUsage


@dataclass
class Triage:
    model: str
    category: str
    category_confidence: float
    category_probs: dict[str, float]
    priority_score: float  # probability-weighted, 0..3
    priority_confidence: float
    priority_probs: dict[str, float]
    safety_hazard_prob: float
    cost_usd: float | None
    latency_ms: int
    raw: dict

    @property
    def priority(self) -> int:
        return round(self.priority_score)


_client: TypeSafeClient | None = None


def get_client() -> TypeSafeClient:
    global _client
    if _client is None:
        settings = get_settings()
        _client = TypeSafeClient(
            api_key=settings.openrouter_api_key,
            base_url=OPENROUTER_BASE_URL,
            model=settings.jev_model,
            timeout=15,
        )
    return _client


def triage_request(state: str | dict, categories: dict[str, str]) -> Triage:
    """Classify a request. `categories` maps slug -> description (from the categories table)."""
    started = time.perf_counter()
    response = get_client().system_one(
        state=state,
        questions={
            "category": Choice(
                instructions="Which kind of dormitory maintenance or residence issue is this report about",
                criteria=categories,
            ),
            "priority": Score(
                instructions="How urgently this dormitory issue needs to be fixed",
                criteria=PRIORITY_LEVELS,
            ),
            "safety_hazard": Noul(
                instructions="The issue poses a risk of injury, fire, electrocution, flooding, or a security threat to residents",
            ),
        },
        response_model=OpenRouterResponse,
    )
    latency_ms = int((time.perf_counter() - started) * 1000)

    category = response.answers["category"]
    priority = response.answers["priority"]
    safety = response.answers["safety_hazard"]
    return Triage(
        model=response.model,
        category=category.choice,
        category_confidence=category.confidence,
        category_probs={str(k): v for k, v in category.probabilities.items()},
        priority_score=priority.score,
        priority_confidence=priority.confidence,
        priority_probs={str(k): v for k, v in priority.probabilities.items()},  # keys are levels 0..3
        safety_hazard_prob=safety.noul,
        cost_usd=response.usage.cost,
        latency_ms=latency_ms,
        raw=response.model_dump(mode="json"),
    )
