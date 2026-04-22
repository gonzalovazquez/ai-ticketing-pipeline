# ai-ticketing-pipeline

An event-driven pipeline that turns GitHub issues into structured Jira tickets using Claude.

## How it works

1. A GitHub webhook hits an Argo Events `EventSource` when an issue is opened or edited.
2. A `Sensor` triggers an Argo Workflow with the issue body.
3. The workflow runs a 3-step DAG:
   - **classify** — Claude tags the issue with severity, component, type, priority, and a summary.
   - **enrich** — Claude expands it into a Jira ticket (description, steps to reproduce, acceptance criteria, labels).
   - **create-ticket** — Posts the result to the Jira Cloud REST API.

## Components

| File | Purpose |
| --- | --- |
| `classify.py` | LLM-based issue classifier |
| `enrich.py` | LLM-based Jira ticket enricher |
| `create_jira.py` | Creates the Jira issue via REST API |
| `pipeline-template.yaml` | Argo `WorkflowTemplate` that wires the three steps together |
| `eventsource.yaml` | Argo Events webhook endpoint for GitHub |
| `sensor.yaml` | Triggers the workflow on `opened` / `edited` issue events |
| `sensor-rbac.yaml` | ServiceAccount + ClusterRoleBinding for the sensor |
| `kind-config.yaml` | Local `kind` cluster config |
| `Dockerfile.*` | Images for each pipeline step |

## Requirements

- A Kubernetes cluster (a local `kind` cluster works — see `kind-config.yaml`)
- Argo Workflows and Argo Events installed
- A `pipeline-secrets` Kubernetes secret containing:
  - `ANTHROPIC_API_KEY`
  - `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_BASE_URL`, `JIRA_PROJECT_KEY`

## Quick start

```sh
# Build images
docker build -t ai-classifier:v3 -f Dockerfile.classify .
docker build -t ai-enricher:v3  -f Dockerfile.enrich   .
docker build -t ai-jira:v2      -f Dockerfile.jira     .

# Apply manifests
kubectl apply -f pipeline-template.yaml
kubectl apply -f sensor-rbac.yaml
kubectl apply -f eventsource.yaml
kubectl apply -f sensor.yaml
```

Point a GitHub webhook at the `EventSource` endpoint (`/github` on port `12000`) and open an issue to trigger the pipeline.
