# AI Ticketing Pipeline

Turn a raw GitHub issue into a fully written Jira ticket in under a minute, using Claude, running on Kubernetes.

When someone opens or edits a GitHub issue, this pipeline:

1. **Classifies** it (severity, component, type, priority, one-line summary)
2. **Enriches** it into a ticket (description, steps to reproduce, acceptance criteria, labels)
3. **Creates** the ticket in Jira

It's built with [Argo Events](https://argoproj.github.io/argo-events/) and [Argo Workflows](https://argoproj.github.io/argo-workflows/), and it backs the KCD Toronto 2026 talk *"Reducing Cycle Time 10x: Building an Intelligent Ticket Pipeline on Kubernetes"*.

> **Giving the talk?** Use [DEMO.md](DEMO.md), the day-of runbook with health checks, the live demo script, and troubleshooting.
> **Want the slides?** See https://gonzalovazquez.github.io/ai-ticketing-pipeline/ (source in [`ui/`](ui/)).

---

## Architecture

```
GitHub issue (opened / edited)
        │  webhook
        ▼
┌──────────────────────┐     ┌───────────────────────┐
│ EventSource          │ ──▶ │ Sensor                │   namespace: argo-events
│ github-issues :12000 │     │ github-issue-sensor   │
└──────────────────────┘     └──────────┬────────────┘
                                        │ submits Workflow
                                        ▼
        ┌──────────────── WorkflowTemplate: ticket-pipeline-template ────────────────┐
        │                                                                            │   namespace: argo
        │   classify ──────────▶ enrich ──────────▶ create-ticket ──────▶ Jira       │
        │   (classify.py)        (enrich.py)        (create_jira.py)                 │
        │   Claude               Claude             Jira REST API v3                 │
        └────────────────────────────────────────────────────────────────────────────┘
```

Each step is a small Python script packaged as its own container image. Each step's JSON output becomes the next step's input.

## Repository layout

| Path | What it is |
| --- | --- |
| `classify.py` | Step 1: asks Claude to classify the issue and returns JSON |
| `enrich.py` | Step 2: asks Claude to expand the issue + classification into a Jira ticket body |
| `create_jira.py` | Step 3: posts the ticket to Jira Cloud |
| `Dockerfile.classify` / `.enrich` / `.jira` | One image per step |
| `pipeline-template.yaml` | Argo `WorkflowTemplate` that wires the three steps into a DAG |
| `eventsource.yaml` | Argo Events webhook that receives GitHub events on `:12000/github` |
| `sensor.yaml` | Filters for `opened` / `edited` issues and submits the workflow |
| `sensor-rbac.yaml` | ServiceAccount + ClusterRoleBinding so the sensor can create workflows |
| `kind-config.yaml` | Local single-node `kind` cluster |
| `ui/` | React/Vite slide deck for the talk, deployed to GitHub Pages |
| `DEMO.md` | Live-demo runbook |

---

## Prerequisites

**Tools:** Docker, [kind](https://kind.sigs.k8s.io/), `kubectl`, and [ngrok](https://ngrok.com/) (or any other way to expose a local port to GitHub).

---

## Configure your credentials

The pipeline needs five values. Put them in one `.env` file. Both the local scripts and the Kubernetes secret read from that file, so you only fill it in once.

**1. Copy the example file:**

```sh
cp .env.example .env
```

**2. Open `.env` and fill in each value:**

```sh
ANTHROPIC_API_KEY=sk-ant-...
JIRA_BASE_URL=https://your-org.atlassian.net
JIRA_EMAIL=you@example.com
JIRA_API_TOKEN=ATATT3x...
JIRA_PROJECT_KEY=KAN
```

| Variable | Where to get it |
| --- | --- |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com → **API Keys** → **Create Key** |
| `JIRA_BASE_URL` | The address of your Jira Cloud site, with no trailing slash, e.g. `https://your-org.atlassian.net` |
| `JIRA_EMAIL` | The email you sign in to Jira with |
| `JIRA_API_TOKEN` | https://id.atlassian.com/manage-profile/security/api-tokens → **Create API token** |
| `JIRA_PROJECT_KEY` | The prefix on your ticket numbers (`KAN` in `KAN-12`). The project needs a `Bug` issue type. |

Use plain `KEY=value` lines, with no quotes, spaces or `export`, and **no trailing spaces**. Your shell ignores trailing spaces, but `kubectl --from-env-file` keeps them as part of the value. A key like `"SCRUM  "` then fails in the cluster even though it worked locally. To strip them: `sed -i '' -E 's/[[:space:]]+$//' .env` (macOS) or `sed -i -E 's/[[:space:]]+$//' .env` (Linux). `.env` is already in `.gitignore`, so it won't be committed.

**3. Use the file:**

| Where | Command |
| --- | --- |
| Your shell (local scripts) | `set -a; source .env; set +a` |
| Kubernetes (the pipeline) | `kubectl create secret generic pipeline-secrets -n argo --from-env-file=.env` (setup step 4) |

---

## Setup

### 1. Try the scripts locally (optional, but the quickest sanity check)

```sh
python3 -m venv venv && source venv/bin/activate
pip install anthropic requests

set -a; source .env; set +a     # load the variables into this shell

python3 classify.py "The login button does nothing on mobile Safari" > /tmp/classification.json
python3 enrich.py   "The login button does nothing on mobile Safari" /tmp/classification.json > /tmp/enriched.json

# This creates a real ticket in your Jira project
python3 create_jira.py /tmp/enriched.json
```

### 2. Create the cluster and install Argo

```sh
kind create cluster --name ai-ticketing --config kind-config.yaml

# Argo Workflows (--server-side is required: some of its resource definitions are too large for a normal apply)
kubectl create namespace argo
kubectl apply --server-side -n argo -f https://github.com/argoproj/argo-workflows/releases/latest/download/quick-start-minimal.yaml

# Argo Events + the default EventBus
kubectl create namespace argo-events
kubectl apply -f https://raw.githubusercontent.com/argoproj/argo-events/stable/manifests/install.yaml
kubectl apply -n argo-events -f https://raw.githubusercontent.com/argoproj/argo-events/stable/examples/eventbus/native.yaml
```

Check that everything installed before moving on:

```sh
kubectl get crd workflows.argoproj.io workflowtemplates.argoproj.io sensors.argoproj.io eventsources.argoproj.io
kubectl wait -n argo        --for=condition=Available deployment --all --timeout=180s
kubectl wait -n argo-events --for=condition=Available deployment --all --timeout=180s
```

All four resource types should be listed and every deployment should report `condition met`. If `workflows.argoproj.io` is missing or `workflow-controller` is in `CrashLoopBackOff`, rerun the Argo Workflows `kubectl apply --server-side ...` line above.

### 3. Build the images and load them into kind

The workflow uses `imagePullPolicy: Never`, so the images have to be loaded into the cluster directly. The tags must match `pipeline-template.yaml`.

```sh
docker build -t ai-classifier:v3 -f Dockerfile.classify .
docker build -t ai-enricher:v3   -f Dockerfile.enrich   .
docker build -t ai-jira:v2       -f Dockerfile.jira     .

kind load docker-image ai-classifier:v3 ai-enricher:v3 ai-jira:v2 --name ai-ticketing
```

### 4. Create the secrets

The workflow pods get their credentials from a Kubernetes secret called `pipeline-secrets` in the `argo` namespace. They don't see your shell's variables. Create the secret from the `.env` file you filled in under [Configure your credentials](#configure-your-credentials):

```sh
kubectl create secret generic pipeline-secrets -n argo --from-env-file=.env

# Check it: you should see all 5 keys
kubectl describe secret pipeline-secrets -n argo
```

If you change `.env` later, delete the secret and create it again:

```sh
kubectl delete secret pipeline-secrets -n argo
kubectl create secret generic pipeline-secrets -n argo --from-env-file=.env
```

### 5. Deploy the pipeline

`sensor-rbac.yaml` binds to a ClusterRole named `argo-role-for-argo-events`, which isn't defined in this repo. Create it first:

```sh
kubectl create clusterrole argo-role-for-argo-events \
  --verb=create,get,list,watch \
  --resource=workflows.argoproj.io,workflowtemplates.argoproj.io

kubectl apply -f pipeline-template.yaml
kubectl apply -f sensor-rbac.yaml
kubectl apply -f eventsource.yaml
kubectl apply -f sensor.yaml
```

Check that it all came up:

```sh
kubectl get pods -n argo-events      # eventsource + sensor pods should be Running
kubectl get sensors -n argo-events   # github-issue-sensor
```

### 6. Connect GitHub

Expose the EventSource and point a GitHub webhook at it:

```sh
# Terminal 1: forward the EventSource to localhost:12000. The loop reconnects
# automatically, because a plain port-forward stops for good when the pod restarts.
while true; do kubectl port-forward -n argo-events svc/github-issues-eventsource-svc 12000:12000; sleep 2; done

# Terminal 2: expose it publicly
ngrok http 12000
```

Check the forward works before you set up the webhook. This should print `HTTP 200`:

```sh
curl -s -o /dev/null -w 'HTTP %{http_code}\n' -X POST -H 'Content-Type: application/json' -d '{}' http://localhost:12000/github
```

In your GitHub repo, go to **Settings → Webhooks → Add webhook**:

- **Payload URL:** `https://<your-ngrok-url>/github`
- **Content type:** `application/json`
- **Events:** select *Let me select individual events* and pick **Issues**

> The free ngrok URL changes every time ngrok restarts, so update the webhook each time.

### 7. Run it

```sh
kubectl get workflows -n argo --watch
```

Open an issue in the repo. Within about 40 seconds a `ticket-pipeline-auto-xxxxx` workflow should reach `Succeeded`, and the new ticket should appear in Jira.

To see the DAG in the Argo UI:

```sh
kubectl -n argo port-forward deployment/argo-server 2746:2746
# open https://localhost:2746 and accept the self-signed certificate
```

You can also trigger the pipeline without GitHub:

```sh
argo submit -n argo --from workflowtemplate/ticket-pipeline-template \
  -p issue-body="Checkout returns 500 for Amex cards since v4.2.1" --watch
```

---

## Stop and clean up

Pick the level you need. Each level includes the ones above it.

### Pause (keep everything, free up the laptop)

Stops the tunnels and the cluster without deleting anything. Your images, secrets and workflow history stay.

```sh
# Press Ctrl+C in the ngrok terminal and in the port-forward loop terminal, then stop any other port-forwards
pkill -f "kubectl.*port-forward"

# Stop the kind cluster's container
docker stop ai-ticketing-control-plane
```

To resume later, run `docker start ai-ticketing-control-plane`, wait about 30 seconds, then follow [step 6](#6-connect-github) again. The ngrok URL will be different, so update the GitHub webhook.

### Remove only the pipeline (keep the cluster and Argo)

```sh
kubectl delete -f sensor.yaml -f eventsource.yaml -f sensor-rbac.yaml -f pipeline-template.yaml
kubectl delete clusterrole argo-role-for-argo-events
kubectl delete secret pipeline-secrets -n argo
kubectl delete workflows -n argo --all      # past runs and their pods
```

### Destroy everything

**1. Stop local processes**

```sh
# Press Ctrl+C in the port-forward loop terminal first, otherwise the loop restarts it
pkill -f "kubectl.*port-forward"
pkill ngrok
```

**2. Delete the cluster.** This removes Argo, the pipeline, the secret and every workflow in one go:

```sh
kind delete cluster --name ai-ticketing
```

**3. Delete the Docker images**

```sh
docker rmi ai-classifier:v3 ai-enricher:v3 ai-jira:v2
docker image prune -f        # leftover layers from the builds
```

**4. Delete local files**

```sh
deactivate 2>/dev/null; rm -rf venv
rm -f /tmp/classification.json /tmp/enriched.json
rm -f .env                    # only if you no longer need your credentials file
cd ui && rm -rf node_modules dist && cd ..
```

**5. Clean up outside your machine.** These can't be scripted from here:

- **GitHub:** repo → **Settings → Webhooks** → delete the ngrok webhook. Close or delete the test issues.
- **Jira:** delete the tickets the pipeline created (they have the AI-generated labels).
- **Credentials:** if you're done with the project, revoke the Anthropic API key at https://console.anthropic.com and the Jira API token at https://id.atlassian.com/manage-profile/security/api-tokens.

Check that nothing is left:

```sh
kind get clusters                                   # ai-ticketing should be gone
docker images | grep -E 'ai-(classifier|enricher|jira)'   # no output
pgrep -fl "port-forward|ngrok"                      # no output
```

---

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `the server doesn't have a resource type "workflows"` | Argo Workflows was only partly installed. Rerun its install with `kubectl apply --server-side` (step 2) |
| GitHub webhook gets **502** with `ERR_NGROK_8012` | ngrok is up but nothing is listening on `localhost:12000`: the port-forward stopped (usually after the EventSource pod restarted). Restart the port-forward loop from step 6 |
| No workflow appears after opening an issue | `kubectl logs -n argo-events -l eventsource-name=github-issues` shows nothing → the webhook isn't arriving (check the ngrok URL, then redeliver it from GitHub's *Recent Deliveries*) |
| EventSource got the event but no workflow | `kubectl logs -n argo-events -l sensor-name=github-issue-sensor`, usually RBAC (step 5) |
| Pod stuck in `ErrImageNeverPull` | The image wasn't loaded into kind, or its tag doesn't match `pipeline-template.yaml` (step 3) |
| A step fails | `kubectl get pods -n argo`, then `kubectl logs -n argo <pod> -c main` |
| `create-ticket` fails with `The target project doesn't exist or you don't have permission` | The project key in the secret is wrong. It often has a trailing space from `.env`: check it with `kubectl get secret pipeline-secrets -n argo -o jsonpath='{.data.JIRA_PROJECT_KEY}' \| base64 -d \| sed 's/$/<END>/'` (any space before `<END>` is the problem) |
| `create-ticket` returns another 400 | The Jira project has no `Bug` issue type |

See [DEMO.md](DEMO.md#-if-something-goes-wrong) for the full on-stage recovery steps.

---

## Slides (`ui/`)

```sh
cd ui
npm install
npm run dev
```

Pushes to `main` that touch `ui/**` deploy to GitHub Pages automatically (`.github/workflows/deploy-ui.yml`).

## Production notes

This repo is a local proof of concept. In production you'd:

- Call Claude through **AWS Bedrock** instead of the Anthropic API, so traffic stays in your VPC
- Replace the Python scripts with **GitHub and Atlassian MCP** containers
- Use scoped IAM/RBAC instead of broad cluster roles, and a real cluster (e.g. EKS) instead of kind
- Keep a **human review gate**: the AI drafts the ticket, and an engineer approves it before it reaches the backlog
