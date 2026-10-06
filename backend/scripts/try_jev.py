"""Quick check that your OpenRouter key works with Jev.

Usage (from backend/):  .venv/bin/python -m scripts.try_jev "Water leaking from the ceiling in room 214"
"""

import sys

from app.services.jev import triage_request

CATEGORIES = {
    "plumbing": "Leaks, toilets, sinks, showers, water pressure, no hot water",
    "electrical": "Power outages, sockets, lights, sparks, burning smell",
    "hvac": "Heating, air conditioning, ventilation",
    "furniture": "Beds, desks, wardrobes, doors, windows",
    "internet": "Wi-Fi and network",
    "pest": "Insects, rodents",
    "security": "Locks, keys, access cards, strangers, theft",
    "other": "Anything else",
}


def main() -> None:
    text = " ".join(sys.argv[1:]) or (
        "Water has been leaking from the ceiling in room 214 since last night. "
        "It's dripping onto my bed and near the power socket."
    )
    t = triage_request(text, CATEGORIES)
    print(f"Request:       {text}")
    print(f"Category:      {t.category}  (confidence {t.category_confidence:.2f})")
    print(f"Priority:      {t.priority} / 3  (score {t.priority_score:.2f}, confidence {t.priority_confidence:.2f})")
    print(f"Safety hazard: {t.safety_hazard_prob:.2f}")
    print(f"Latency:       {t.latency_ms} ms   Cost: ${t.cost_usd}")


if __name__ == "__main__":
    main()
