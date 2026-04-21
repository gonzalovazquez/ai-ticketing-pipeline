#!/usr/bin/env python3
"""
enrich.py — LLM-based Jira ticket enricher

Takes the original GitHub issue body and the classification JSON,
then generates a fully structured Jira ticket using the Anthropic API.

Usage:
    python3 enrich.py "<issue_body>" "<classification_json>"

Output (JSON):
    {
      "summary": "...",
      "description": "...",
      "steps_to_reproduce": ["step 1", "step 2"],
      "acceptance_criteria": ["criterion 1", "criterion 2"],
      "labels": ["bug", "mobile", "auth"]
    }
"""

import sys
import json
import anthropic


def enrich_issue(issue_body: str, classification: dict) -> dict:
    """
    Send the issue body and classification to Claude and return
    a fully enriched Jira ticket structure.

    Args:
        issue_body: The raw text of the GitHub issue
        classification: The structured classification dict from classify.py

    Returns:
        A dictionary ready to be sent to the Jira API
    """
    client = anthropic.Anthropic()

    prompt = f"""You are a senior engineering analyst writing a Jira ticket.
Given a GitHub issue and its classification, generate a well-structured Jira ticket.
Return ONLY a valid JSON object with no extra text, no markdown, no explanation.

The JSON must have exactly these fields:
{{
  "summary": "a concise, action-oriented ticket title (max 80 chars)",
  "description": "a full markdown description of the problem and context (2-4 paragraphs)",
  "steps_to_reproduce": ["step 1", "step 2", "step 3"],
  "acceptance_criteria": ["criterion 1", "criterion 2", "criterion 3"],
  "labels": ["label1", "label2"]
}}

GitHub Issue:
{issue_body}

Classification:
{json.dumps(classification, indent=2)}"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}]
    )

    return json.loads(message.content[0].text)


def main():
    if len(sys.argv) < 3:
        print("Usage: python3 enrich.py <issue_body> <classification_json>", file=sys.stderr)
        sys.exit(1)

    result = enrich_issue(sys.argv[1], json.loads(sys.argv[2]))
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
