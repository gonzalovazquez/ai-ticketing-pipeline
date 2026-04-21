#!/usr/bin/env python3
"""
create_jira.py — Creates a Jira issue from enriched ticket data

Takes the enriched JSON output from enrich.py and creates
a real Jira issue via the Jira Cloud REST API v3.

Usage:
    python3 create_jira.py "<enriched_json>"

Output:
    The created Jira issue key and URL, e.g.: DEMO-42
"""

import sys
import os
import json
import requests
from requests.auth import HTTPBasicAuth


def create_jira_ticket(enriched: dict) -> dict:
    """
    Create a Jira issue using the Jira Cloud REST API v3.

    Args:
        enriched: The enriched ticket data from enrich.py

    Returns:
        A dict with the issue key, URL, and ID
    """
    auth = HTTPBasicAuth(os.environ["JIRA_EMAIL"], os.environ["JIRA_API_TOKEN"])
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    base_url = os.environ["JIRA_BASE_URL"]

    # Jira descriptions use Atlassian Document Format (ADF), not plain text
    payload = {
        "fields": {
            "project": {"key": os.environ["JIRA_PROJECT_KEY"]},
            "summary": enriched["summary"],
            "description": {
                "type": "doc", "version": 1,
                "content": [
                    {"type": "paragraph", "content": [
                        {"type": "text", "text": enriched["description"]}
                    ]},
                    {"type": "paragraph", "content": [
                        {"type": "text", "text": "Steps to Reproduce:",
                         "marks": [{"type": "strong"}]}
                    ]},
                    {"type": "bulletList", "content": [
                        {"type": "listItem", "content": [
                            {"type": "paragraph", "content": [{"type": "text", "text": s}]}
                        ]} for s in enriched.get("steps_to_reproduce", [])
                    ]},
                    {"type": "paragraph", "content": [
                        {"type": "text", "text": "Acceptance Criteria:",
                         "marks": [{"type": "strong"}]}
                    ]},
                    {"type": "bulletList", "content": [
                        {"type": "listItem", "content": [
                            {"type": "paragraph", "content": [{"type": "text", "text": c}]}
                        ]} for c in enriched.get("acceptance_criteria", [])
                    ]}
                ]
            },
            "issuetype": {"name": "Bug"},
            "labels": enriched.get("labels", [])
        }
    }

    response = requests.post(
        f"{base_url}/rest/api/3/issue",
        json=payload, auth=auth, headers=headers
    )

    if response.status_code not in (200, 201):
        print(f"Error {response.status_code}: {response.text}", file=sys.stderr)
        sys.exit(1)

    data = response.json()
    return {"key": data["key"], "url": f"{base_url}/browse/{data['key']}", "id": data["id"]}


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 create_jira.py <enriched_json>", file=sys.stderr)
        sys.exit(1)

    result = create_jira_ticket(json.loads(sys.argv[1]))
    print(json.dumps(result, indent=2))
    print(f"\n✅ Jira ticket created: {result['url']}")


if __name__ == "__main__":
    main()
