#!/usr/bin/env python3
"""
enrich.py — LLM-based Jira ticket enricher

Takes the original GitHub issue body and the classification JSON (as a
file path or raw JSON string), then generates a fully structured Jira
ticket using the Anthropic API.

Usage:
    python3 enrich.py "<issue_body>" /tmp/classification.json
    python3 enrich.py "<issue_body>" '{"severity": "high", ...}'

Output (JSON):
    {
      "summary": "...",
      "description": "...",
      "steps_to_reproduce": ["step 1", "step 2"],
      "acceptance_criteria": ["criterion 1", "criterion 2"],
      "labels": ["bug", "mobile", "auth"]
    }

Fixes applied:
    - System prompt forces JSON-only response
    - Defensive code block stripping in case model wraps in markdown
    - Accepts file path OR raw JSON for classification input
    - .strip() on file reads to remove heredoc-injected leading newlines
    - Error handling with stderr output
    - stdout flush to ensure tee captures output in Argo Workflows
"""

import sys
import os
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

    # System prompt forces JSON-only output mode
    system_prompt = (
        "You are a JSON-only API. You must respond with a single valid JSON object "
        "and absolutely nothing else. No markdown, no explanation, no code blocks, "
        "no preamble. Only raw JSON."
    )

    prompt = f"""Generate a structured Jira ticket from this GitHub issue and its classification.
Return ONLY a JSON object with these exact fields:
{{
  "summary": "a concise, action-oriented ticket title (max 80 chars)",
  "description": "a full description of the problem and context (2-4 paragraphs)",
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
    if len(sys.argv) < 3:
        print("Usage: python3 enrich.py <issue_body> <classification_file_or_json>",
              file=sys.stderr)
        sys.exit(1)

    issue_body = sys.argv[1]
    arg = sys.argv[2]

    if not issue_body.strip():
        print("Error: empty issue body received", file=sys.stderr)
        sys.exit(1)

    # Accept either a file path or raw JSON string
    if os.path.isfile(arg):
        with open(arg, 'r') as f:
            content = f.read().strip()  # strip heredoc-injected leading newline
        if not content:
            print("Error: classification file is empty", file=sys.stderr)
            sys.exit(1)
        classification = json.loads(content)
    else:
        classification = json.loads(arg)

    try:
        result = enrich_issue(issue_body, classification)
        print(json.dumps(result, indent=2))
        sys.stdout.flush()
    except Exception as e:
        print(f"Error enriching issue: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()