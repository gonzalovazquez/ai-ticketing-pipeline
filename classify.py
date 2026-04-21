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
"""

import sys
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
    # Reads ANTHROPIC_API_KEY automatically from the environment
    client = anthropic.Anthropic()

    prompt = f"""You are a senior engineering analyst at a software company.
Classify the following GitHub issue and return ONLY a valid JSON object with no extra text, no markdown, no explanation.

The JSON must have exactly these fields:
{{
  "severity": "critical|high|medium|low",
  "component": "a short string naming the affected system component",
  "type": "bug|feature|task|question",
  "priority": "urgent|high|medium|low",
  "summary": "a single sentence describing the issue"
}}

GitHub Issue:
{issue_body}"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}]
    )

    return json.loads(message.content[0].text)


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 classify.py <issue_body>", file=sys.stderr)
        sys.exit(1)

    result = classify_issue(sys.argv[1])
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
