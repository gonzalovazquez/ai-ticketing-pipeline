#!/usr/bin/env python3
"""
classify.py — LLM-based GitHub issue classifier

Takes a GitHub issue body as a command-line argument and returns
a structured JSON classification using the Anthropic API.

Usage:
    python3 classify.py "The login button is broken on mobile"

Output (JSON):
    {
      "severity": "high",
      "component": "authentication",
      "type": "bug",
      "priority": "high",
      "summary": "Login button non-functional on mobile devices"
    }

Fixes applied:
    - System prompt forces JSON-only response
    - Defensive code block stripping in case model wraps in markdown
    - Error handling with debug output
    - stdout flush to ensure tee captures output in Argo Workflows
"""

import sys
import os
import json
import anthropic


def classify_issue(issue_body: str) -> dict:
    """
    Send the issue body to Claude and return a structured classification.

    Args:
        issue_body: The raw text of the GitHub issue

    Returns:
        A dictionary with severity, component, type, priority, and summary
    """
    client = anthropic.Anthropic()

    # System prompt forces JSON-only output mode
    system_prompt = (
        "You are a JSON-only API. You must respond with a single valid JSON object "
        "and absolutely nothing else. No markdown, no explanation, no code blocks, "
        "no preamble. Only raw JSON."
    )

    prompt = f"""Classify this GitHub issue. Return ONLY a JSON object with these exact fields:
{{
  "severity": "critical|high|medium|low",
  "component": "a short string naming the affected system component",
  "type": "bug|feature|task|question",
  "priority": "urgent|high|medium|low",
  "summary": "a single sentence describing the issue"
}}

Issue: {issue_body}"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        system=system_prompt,
        messages=[{"role": "user", "content": prompt}]
    )

    response_text = message.content[0].text.strip()

    # Defensive: strip markdown code blocks if model wraps response despite instructions
    if response_text.startswith("```"):
        response_text = response_text.split("```")[1]
        if response_text.startswith("json"):
            response_text = response_text[4:]
        response_text = response_text.strip()

    return json.loads(response_text)


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 classify.py <issue_body>", file=sys.stderr)
        sys.exit(1)

    issue_body = sys.argv[1]

    # Validate input
    if not issue_body.strip():
        print("Error: empty issue body received", file=sys.stderr)
        sys.exit(1)

    try:
        result = classify_issue(issue_body)
        print(json.dumps(result, indent=2))
        sys.stdout.flush()
    except Exception as e:
        print(f"Error classifying issue: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()