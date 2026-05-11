# 🎤 KCD Toronto 2026 — Demo Day Runbook
## "Reducing Cycle Time 10x: Building an Intelligent Ticket Pipeline on Kubernetes"

> Keep this open on a second screen during your talk. Follow top to bottom.

---

## ⏱️ Before You Leave for the Venue

- [ ] Laptop charged, charger packed
- [ ] Hotspot ready (don't trust venue WiFi for live demo)
- [ ] Open https://gonzalovazquez.github.io/ai-ticketing-pipeline/
- [ ] Log into [JIRA](https://gonzalo-vazquez.atlassian.net/jira/software/projects/KAN/boards/1)
- [ ] SSH into Server
- [ ] ngrok running and GitHub webhook URL updated
- [ ] Test issue fired and Jira ticket confirmed created
- [ ] Argo UI open at https://localhost:2746
- [ ] Jira DEMO project open in browser tab
- [ ] GitHub test repo open in browser tab
- [ ] Backup recording ready (screen recording of a successful run)

---

## 🚀 Morning Of — Cluster Health Check

Run these in order before leaving for the venue:

```bash
# 1. Verify cluster is up
kubectl get nodes
# Expected: ai-ticketing-control-plane   Ready

# 2. Verify all pods are running
kubectl get pods -n argo-events
kubectl get pods -n argo
# Everything should be Running — no CrashLoopBackOff or Error

# 3. Verify secrets are in place
kubectl get secret pipeline-secrets -n argo
kubectl get secret pipeline-secrets -n argo-events

# 4. Verify sensor is active
kubectl get sensors -n argo-events
# Expected: github-issue-sensor   (no error)
```

---

## 🔌 Start the Demo Environment (Run Every Session)

```bash
# Step 1: Activate Python venv
source venv/bin/activate

# Step 2: Port-forward EventSource pod → localhost:12000
kubectl port-forward -n argo-events \
  $(kubectl get pods -n argo-events -l eventsource-name=github-issues \
    -o jsonpath='{.items[0].metadata.name}') \
  12000:12000 &

# Step 3: Start ngrok tunnel (note the new URL!)
ngrok http 12000
```

> ⚠️ **ngrok URL changes every restart.** Copy the new `https://xxxxx.ngrok-free.app` URL
> and update GitHub webhook: Repo → Settings → Webhooks → your webhook → Settings tab →
> update Payload URL to `https://NEW-URL.ngrok-free.app/github` → Update webhook

```bash
# Step 4: Open Argo UI
# Bind to 0.0.0.0 so your Mac can reach it over the network
kubectl -n argo port-forward deployment/argo-server 2746:2746 --address=0.0.0.0 &

# Find your Linux machine's IP
hostname -I | awk '{print $1}'
# e.g. 192.168.1.45

# Open on your Mac browser: https://192.168.1.45:2746
# Accept the self-signed certificate warning (Advanced → Proceed)
```

---

## ✅ Pre-Demo Smoke Test

Fire a test issue and confirm the full pipeline works before you go on stage:

```bash
# Watch for new workflows
kubectl get workflows -n argo --watch
```

Go to your GitHub test repo → create a new issue titled **"Pre-demo smoke test"**.

You should see within 40 seconds:
```
ticket-pipeline-auto-xxxxx   Running   5s
ticket-pipeline-auto-xxxxx   Succeeded   40s
```

Open Jira DEMO project — confirm the ticket was created with classification, description, steps to reproduce, and acceptance criteria.

**If it works → you're ready. Delete the smoke test issue and the Jira ticket.**

---

## 🎬 Live Demo Script (~8 minutes)

### Slide cue: "Let me show you this live"

**Step 1 — Show the value stream (30 sec)**
- Open your value stream map slide
- Point out: manual process = 45 min, multiple handoffs, 40% rework rate
- "Let me show you what this looks like automated"

**Step 2 — Show the architecture (1 min)**
- Switch to architecture diagram slide
- Walk through: GitHub → Argo Events → EventBus → Sensor → Argo Workflows DAG
- "Three steps: classify, enrich, create ticket — all driven by LLM"

**Step 3 — Fire the live demo (3 min)**

Open GitHub test repo and create a new issue:
```
Title: Payment service failing in production after deploy
Body: After deploying v4.2.1 of the payment service at 14:30 UTC,
we are seeing a 500 error rate spike to 23%. Transactions are
failing for users with non-standard card types. The issue appears
to be in the charge validation logic. Revenue impact is approximately
$12k/hour. Rollback attempted but did not resolve.
```

Switch to terminal showing `kubectl get workflows -n argo --watch`

**Narrate while it runs:**
- "GitHub fires the webhook... Argo Events receives it..."
- "Sensor filters for issue:opened... triggers the DAG..."
- "Step 1 — Claude classifies: severity, component, priority..."
- "Step 2 — Claude enriches: writes the full ticket, steps to reproduce, acceptance criteria..."
- "Step 3 — Jira ticket created via REST API..."

Switch to Argo UI — show the green DAG.

Switch to Jira — show the fully formed ticket.

**Step 4 — Show the metrics (1 min)**
- Switch to metrics slide
- Before: 45 min, 40% rework
- After: < 1 min end-to-end, structured output every time
- "That's a 45x reduction in cycle time"

**Step 5 — Close (30 sec)**
- "This is running on Kubernetes, using CNCF-graduated projects"
- "The real production version swaps the Anthropic API for AWS Bedrock"
- "And replaces these Python scripts with GitHub and Atlassian MCP containers"

---

## 🚨 If Something Goes Wrong

### Workflow not triggering after GitHub issue
```bash
# Check sensor logs
kubectl logs -n argo-events -l sensor-name=github-issue-sensor --tail=20

# Check EventSource received the webhook
kubectl logs -n argo-events -l eventsource-name=github-issues --tail=20

# ngrok probably changed URL — redeliver from GitHub Recent Deliveries
```

### Workflow fails mid-run
```bash
# Check which step failed
kubectl get pods -n argo | grep ticket-pipeline-auto

# Check the failing pod logs
kubectl logs -n argo <pod-name> -c main
```

### Argo UI not loading
```bash
kubectl -n argo port-forward deployment/argo-server 2746:2746 --address=0.0.0.0 &
# Open https://<linux-ip>:2746 on your Mac (not localhost)
```

### Everything is broken — play the backup
"I actually ran this right before coming on stage — let me show you the recording."
→ Play your pre-recorded screen capture of a successful run.

---

## 🔑 Quick Reference

| Thing | Value |
|---|---|
| Argo UI | https://localhost:2746 |
| Jira project | https://gonzalo-vazquez.atlassian.net/jira/software/projects/KAN/boards/1 |
| GitHub test repo | https://github.com/gonzalovazquez/ai-ticket-demo |
| ngrok dashboard | http://127.0.0.1:4040 |
| Working image tags | ai-classifier:v3 / ai-enricher:v3 / ai-jira:v1 |
| Argo namespace | `argo` |
| Sensor name | `github-issue-sensor` |

---

## 📊 Key Numbers to Drop During the Talk

| Metric | Before | After |
|---|---|---|
| Cycle time | ~45 minutes | < 1 minute |
| Rework rate | ~40% | < 5% |
| Process efficiency | ~12% | > 95% |
| Human touchpoints | 4–6 handoffs | 1 (review gate) |

---

## 🎯 Talking Points if Asked About Production

- "In production we swap Anthropic API for AWS Bedrock — same Claude model, runs in your VPC"
- "The Python scripts become containerized MCP servers — GitHub MCP and Atlassian MCP"
- "RBAC uses scoped IAM roles instead of cluster-admin — that's just a local dev shortcut"
- "We run this on EKS with multi-node clusters — kind is just for the local POC you saw me build"
- "Human-in-the-loop is intentional — the AI drafts, an engineer approves before tickets hit the backlog"

---
