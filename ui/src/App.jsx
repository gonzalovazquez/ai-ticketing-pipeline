import { useState, useEffect, useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";

const COLORS = {
  navy: "#1a2744",
  navyLight: "#243352",
  teal: "#2dd4a8",
  tealDark: "#1fa882",
  red: "#e63946",
  redDark: "#c1121f",
  gold: "#f4a261",
  white: "#f8f9fa",
  gray: "#94a3b8",
  grayDark: "#475569",
  bg: "#0f1729",
  card: "#1e293b",
  cardHover: "#263548",
};

const fonts = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
`;

const SLIDES = ["hero", "problem", "vsm", "architecture", "simulator", "solution-arch", "metrics", "thankyou"];

// ─── Utility: Intersection Observer Hook ───
function useInView(threshold = 0.2) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

// ─── Animated Counter ───
function Counter({ end, duration = 1500, suffix = "", prefix = "", inView }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = end / (duration / 16);
    const id = setInterval(() => {
      start += step;
      if (start >= end) { setVal(end); clearInterval(id); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(id);
  }, [inView, end, duration]);
  return <span>{prefix}{val}{suffix}</span>;
}

// ─── Section Wrapper ───
function Section({ id, children, dark = true, style = {} }) {
  const [ref, inView] = useInView(0.1);
  return (
    <section
      ref={ref}
      id={id}
      style={{
        minHeight: "100vh",
        padding: "100px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: dark ? COLORS.bg : COLORS.navy,
        position: "relative",
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(40px)",
        transition: "opacity 0.8s ease, transform 0.8s ease",
        ...style,
      }}
    >
      {children}
    </section>
  );
}

// ─── Navigation ───
function Nav({ active, presentationMode }) {
  const items = [
    { id: "hero", label: "Home" },
    { id: "problem", label: "Problem" },
    { id: "vsm", label: "Value Stream" },
    { id: "architecture", label: "Architecture" },
    { id: "simulator", label: "Simulator" },
    { id: "solution-arch", label: "Solution" },
    { id: "metrics", label: "Metrics" },
    { id: "thankyou", label: "Thank You" },
  ];

  if (presentationMode) return null;

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: "rgba(15,23,41,0.85)", backdropFilter: "blur(16px)",
      borderBottom: `1px solid ${COLORS.navyLight}`,
      display: "flex", justifyContent: "center", gap: 8, padding: "12px 16px",
    }}>
      <span style={{
        fontFamily: "'JetBrains Mono'", fontWeight: 700, color: COLORS.teal,
        fontSize: 14, marginRight: "auto", paddingLeft: 8,
        letterSpacing: "0.05em",
      }}>KCD Toronto 2026</span>
      {items.map(it => (
        <a key={it.id} href={`#${it.id}`} style={{
          color: active === it.id ? COLORS.teal : COLORS.gray,
          textDecoration: "none", fontSize: 13, fontFamily: "'Outfit'",
          fontWeight: active === it.id ? 600 : 400,
          padding: "4px 12px", borderRadius: 6,
          background: active === it.id ? "rgba(45,212,168,0.1)" : "transparent",
          transition: "all 0.2s",
        }}>{it.label}</a>
      ))}
    </nav>
  );
}

// ─── Slide Indicator (presentation mode) ───
function SlideIndicator({ current, total }) {
  return (
    <div style={{
      position: "fixed", right: 24, top: "50%", transform: "translateY(-50%)",
      zIndex: 200, display: "flex", flexDirection: "column", gap: 8, alignItems: "center",
    }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: i === current ? 10 : 6,
          height: i === current ? 10 : 6,
          borderRadius: "50%",
          background: i === current ? COLORS.teal : COLORS.grayDark,
          transition: "all 0.3s ease",
          boxShadow: i === current ? `0 0 8px ${COLORS.teal}` : "none",
        }} />
      ))}
      <div style={{
        fontFamily: "'JetBrains Mono'", fontSize: 10, color: COLORS.gray,
        marginTop: 4,
      }}>
        {current + 1}/{total}
      </div>
    </div>
  );
}

// ─── Presentation Controls Hint ───
function PresentationHint({ visible }) {
  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      zIndex: 200, display: "flex", gap: 16, alignItems: "center",
      background: "rgba(15,23,41,0.9)", backdropFilter: "blur(12px)",
      padding: "8px 20px", borderRadius: 8,
      border: `1px solid ${COLORS.navyLight}`,
      opacity: visible ? 1 : 0,
      transition: "opacity 0.5s ease",
      pointerEvents: "none",
    }}>
      {[
        { keys: "← →", label: "Navigate" },
        { keys: "Space", label: "Next" },
        { keys: "F", label: "Fullscreen" },
        { keys: "Esc", label: "Exit" },
      ].map(h => (
        <div key={h.keys} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            fontFamily: "'JetBrains Mono'", fontSize: 10, color: COLORS.teal,
            background: "rgba(45,212,168,0.15)", padding: "2px 8px", borderRadius: 4,
          }}>{h.keys}</span>
          <span style={{ fontFamily: "'Outfit'", fontSize: 11, color: COLORS.gray }}>{h.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Hero ───
function Hero() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);
  return (
    <section id="hero" style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", textAlign: "center",
      background: `radial-gradient(ellipse at 50% 30%, ${COLORS.navyLight} 0%, ${COLORS.bg} 70%)`,
      padding: "60px 24px", position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0, opacity: 0.06,
        backgroundImage: `linear-gradient(${COLORS.teal} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.teal} 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />
      <div style={{
        position: "absolute", top: "20%", left: "50%", transform: "translate(-50%,-50%)",
        width: 600, height: 600, borderRadius: "50%",
        background: `radial-gradient(circle, rgba(45,212,168,0.12) 0%, transparent 70%)`,
        filter: "blur(60px)",
      }} />
      <div style={{
        position: "relative", zIndex: 1,
        opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(30px)",
        transition: "all 1s ease 0.2s",
      }}>
        <div style={{
          fontFamily: "'JetBrains Mono'", fontSize: 13, color: COLORS.teal,
          letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 24,
          background: "rgba(45,212,168,0.1)", display: "inline-block",
          padding: "6px 20px", borderRadius: 20, border: `1px solid rgba(45,212,168,0.2)`,
        }}>KCD Toronto 2026</div>
        <h1 style={{
          fontFamily: "'Outfit'", fontWeight: 900, fontSize: "clamp(42px, 7vw, 86px)",
          color: COLORS.white, lineHeight: 1.05, margin: "16px 0",
          maxWidth: 800,
        }}>
          Reducing Cycle Time{" "}
          <span style={{ color: COLORS.teal }}>10x</span>
        </h1>
        <p style={{
          fontFamily: "'Outfit'", fontWeight: 300, fontSize: "clamp(18px, 2.5vw, 26px)",
          color: COLORS.teal, margin: "12px 0 32px", maxWidth: 600,
        }}>
          Building an Intelligent Ticket Pipeline on Kubernetes
        </p>
        <div style={{
          fontFamily: "'Outfit'", fontSize: 15, color: COLORS.gray, marginBottom: 40,
        }}>
          Gonzalo Vazquez &middot; Director, Cloud Engineering &middot; Royal Bank of Canada
        </div>
        <a href="#problem" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: COLORS.teal, color: COLORS.navy, fontFamily: "'Outfit'",
          fontWeight: 600, fontSize: 15, padding: "14px 32px", borderRadius: 8,
          textDecoration: "none", transition: "transform 0.2s, box-shadow 0.2s",
          boxShadow: "0 4px 24px rgba(45,212,168,0.3)",
        }}>
          Explore the Pipeline &#8595;
        </a>
      </div>
    </section>
  );
}

// ─── Problem Statement ───
function ProblemSection() {
  const [ref, inView] = useInView(0.2);
  const wastes = [
    { name: "Overproduction", icon: "\u{1F4E6}", desc: "Creating tickets nobody asked for" },
    { name: "Waiting Time", icon: "⏳", desc: "Queuing for human review" },
    { name: "Superfluous Movement", icon: "\u{1F504}", desc: "Context switching between tools" },
    { name: "Transport", icon: "\u{1F69A}", desc: "Moving data across systems manually" },
    { name: "Overprocessing", icon: "⚙️", desc: "Redundant analysis steps" },
    { name: "Inventory/Stock", icon: "\u{1F4CB}", desc: "Backlog of unprocessed requests" },
    { name: "Defects & Rework", icon: "\u{1F501}", desc: "~30% ticket reopen rate" },
  ];
  return (
    <Section id="problem">
      <div ref={ref} style={{ maxWidth: 1000, width: "100%" }}>
        <div style={{
          fontFamily: "'JetBrains Mono'", fontSize: 12, color: COLORS.teal,
          letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12,
        }}>The Problem</div>
        <h2 style={{
          fontFamily: "'Outfit'", fontWeight: 800, fontSize: "clamp(28px,4vw,48px)",
          color: COLORS.white, margin: "0 0 12px",
        }}>
          AI optimizes processes...{" "}
          <span style={{ color: COLORS.gray, fontWeight: 300 }}>
            if we know how to measure them.
          </span>
        </h2>
        <p style={{
          fontFamily: "'Outfit'", fontSize: 17, color: COLORS.gray, maxWidth: 650,
          lineHeight: 1.6, marginBottom: 48,
        }}>
          A process is standardized and repeatable. Value is added when the output
          is greater than the input. The Japanese concept of <em>Muda</em> teaches
          us to eliminate waste to maximize value.
        </p>
        <h3 style={{
          fontFamily: "'Outfit'", fontWeight: 600, fontSize: 20, color: COLORS.white,
          marginBottom: 24,
        }}>Seven Types of Waste (Muda)</h3>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
        }}>
          {wastes.map((w, i) => (
            <div key={w.name} style={{
              background: COLORS.card, borderRadius: 10, padding: "18px 16px",
              border: `1px solid ${COLORS.navyLight}`,
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(20px)",
              transition: `all 0.5s ease ${i * 0.07}s`,
            }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{w.icon}</div>
              <div style={{
                fontFamily: "'Outfit'", fontWeight: 600, fontSize: 14,
                color: COLORS.white, marginBottom: 4,
              }}>{w.name}</div>
              <div style={{
                fontFamily: "'Outfit'", fontSize: 12, color: COLORS.gray, lineHeight: 1.4,
              }}>{w.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ─── Value Stream Map ───
function VSMSection() {
  const [ref, inView] = useInView(0.15);
  const [showFuture, setShowFuture] = useState(false);

  const currentSteps = [
    { name: "Issue Created", ct: "2 min", wait: null, color: COLORS.red },
    { name: "Queue for Review", ct: "N/A", wait: "15 min", color: COLORS.red },
    { name: "Manual Analysis", ct: "12 min", wait: null, color: COLORS.red },
    { name: "Clarification", ct: "5 min", wait: "8 min", color: COLORS.red },
    { name: "Write Requirements", ct: "10 min", wait: null, color: COLORS.red },
    { name: "Create Jira Ticket", ct: "5 min", wait: null, color: COLORS.red },
  ];

  const futureSteps = [
    { name: "Issue Created", ct: "1 min", wait: null, color: COLORS.teal, auto: false },
    { name: "Webhook Trigger", ct: "< 1 sec", wait: null, color: COLORS.teal, auto: true },
    { name: "AI Analysis (LLM + MCP)", ct: "2 min", wait: null, color: COLORS.teal, auto: true },
    { name: "Auto-Create Jira", ct: "30 sec", wait: null, color: COLORS.teal, auto: true },
    { name: "Human Review", ct: "1 min", wait: null, color: COLORS.teal, auto: false },
  ];

  const steps = showFuture ? futureSteps : currentSteps;
  const title = showFuture ? "Future State" : "Current State";
  const leadTime = showFuture ? "< 5 minutes" : "45+ minutes";

  return (
    <Section id="vsm" dark={false}>
      <div ref={ref} style={{ maxWidth: 1100, width: "100%" }}>
        <div style={{
          fontFamily: "'JetBrains Mono'", fontSize: 12, color: COLORS.teal,
          letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12,
        }}>Value Stream Map</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 32 }}>
          <div>
            <h2 style={{
              fontFamily: "'Outfit'", fontWeight: 800, fontSize: "clamp(26px,3.5vw,42px)",
              color: COLORS.white, margin: 0,
            }}>{title} Value Stream Map</h2>
            <p style={{
              fontFamily: "'Outfit'", fontSize: 15, color: COLORS.gray, margin: "4px 0 0",
            }}>
              {showFuture ? "Automated Pipeline" : "Manual Intake Process"} &mdash; Lead Time: {" "}
              <span style={{ color: showFuture ? COLORS.teal : COLORS.red, fontWeight: 600 }}>{leadTime}</span>
            </p>
          </div>
          <button onClick={() => setShowFuture(!showFuture)} style={{
            background: showFuture ? COLORS.red : COLORS.teal,
            color: showFuture ? COLORS.white : COLORS.navy,
            fontFamily: "'Outfit'", fontWeight: 600, fontSize: 14,
            padding: "10px 24px", borderRadius: 8, border: "none", cursor: "pointer",
            transition: "all 0.3s",
          }}>
            {showFuture ? "Show Current State" : "Show Future State"}
          </button>
        </div>

        <div style={{
          display: "flex", gap: 8, overflowX: "auto", paddingBottom: 16,
        }}>
          {steps.map((s, i) => (
            <div key={`${showFuture}-${i}`} style={{
              flex: "1 0 140px", minWidth: 140,
              background: COLORS.card, borderRadius: 10,
              border: `2px solid ${s.color}`,
              padding: 16, textAlign: "center",
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(20px)",
              transition: `all 0.4s ease ${i * 0.08}s`,
            }}>
              <div style={{
                fontFamily: "'Outfit'", fontWeight: 600, fontSize: 14,
                color: COLORS.white, marginBottom: 8, minHeight: 36,
              }}>{s.name}</div>
              <div style={{
                fontFamily: "'JetBrains Mono'", fontSize: 12, color: s.color,
              }}>C/T: {s.ct}</div>
              {s.wait && (
                <div style={{
                  fontFamily: "'JetBrains Mono'", fontSize: 12, color: COLORS.gold,
                  marginTop: 4,
                }}>Wait: {s.wait}</div>
              )}
              {s.auto !== undefined && (
                <div style={{
                  marginTop: 8, fontSize: 10, fontFamily: "'JetBrains Mono'",
                  color: s.auto ? COLORS.teal : COLORS.gray,
                  background: s.auto ? "rgba(45,212,168,0.15)" : "rgba(148,163,184,0.15)",
                  padding: "3px 10px", borderRadius: 10, display: "inline-block",
                  fontWeight: 600,
                }}>{s.auto ? "AUTOMATED" : "MANUAL"}</div>
              )}
              {i < steps.length - 1 && (
                <div style={{
                  position: "absolute", right: -16, top: "50%", color: COLORS.gray,
                  fontSize: 18,
                }}>&#8594;</div>
              )}
            </div>
          ))}
        </div>

        <div style={{
          display: "flex", marginTop: 16, height: 28, borderRadius: 6, overflow: "hidden",
          background: COLORS.card,
        }}>
          {steps.map((s, i) => {
            const widths = showFuture ? [20, 2, 45, 13, 20] : [4, 28, 22, 24, 18, 9];
            return (
              <div key={i} style={{
                flex: `${widths[i]} 0 0`,
                background: s.wait ? COLORS.red + "55" : s.color + "44",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'JetBrains Mono'", fontSize: 10, color: COLORS.white,
                borderRight: i < steps.length - 1 ? `1px solid ${COLORS.bg}` : "none",
                transition: "all 0.5s ease",
              }}>
                {s.ct}
              </div>
            );
          })}
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12, marginTop: 32,
        }}>
          {[
            { label: "Process Efficiency", before: "56%", after: "95%+" },
            { label: "Quality Issues", before: "~30% rework", after: "< 5% rework" },
            { label: "Bottleneck", before: "Human queue", after: "None (event-driven)" },
          ].map((m, i) => (
            <div key={m.label} style={{
              background: COLORS.card, borderRadius: 8, padding: 16,
              border: `1px solid ${COLORS.navyLight}`,
            }}>
              <div style={{ fontFamily: "'Outfit'", fontSize: 12, color: COLORS.gray, marginBottom: 8 }}>{m.label}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 14, color: COLORS.red }}>{m.before}</span>
                <span style={{ color: COLORS.gray, fontSize: 16 }}>&#8594;</span>
                <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 14, color: COLORS.teal }}>{m.after}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ─── Architecture Diagram ───
function ArchitectureSection() {
  const [ref, inView] = useInView(0.15);
  const [hoveredNode, setHoveredNode] = useState(null);

  const nodes = {
    github: { label: "GitHub", sub: "Issue Created (Webhook)", x: 0, y: 1, color: COLORS.white, icon: "\u{1F419}" },
    argoEvents: { label: "Argo Events", sub: "EventSource + Sensor", x: 1, y: 0.5, color: COLORS.teal, icon: "⚡" },
    step1: { label: "1. Fetch Issue", sub: "GitHub MCP Server", x: 2, y: 0, color: COLORS.gold, icon: "\u{1F4E5}" },
    step2: { label: "2. LLM Analysis", sub: "Requirement extraction", x: 2, y: 1, color: COLORS.teal, icon: "\u{1F9E0}" },
    step3: { label: "3. Create Jira", sub: "Atlassian MCP", x: 2, y: 2, color: COLORS.gold, icon: "\u{1F4DD}" },
    jira: { label: "Atlassian Jira", sub: "FR & NFR Structured Output", x: 3, y: 1, color: COLORS.white, icon: "\u{1F3AB}" },
  };

  return (
    <Section id="architecture">
      <div ref={ref} style={{ maxWidth: 1000, width: "100%" }}>
        <div style={{
          fontFamily: "'JetBrains Mono'", fontSize: 12, color: COLORS.teal,
          letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12,
        }}>Solution Architecture</div>
        <h2 style={{
          fontFamily: "'Outfit'", fontWeight: 800, fontSize: "clamp(26px,3.5vw,42px)",
          color: COLORS.white, margin: "0 0 8px",
        }}>Event-Driven Intake Pipeline</h2>
        <p style={{
          fontFamily: "'Outfit'", fontSize: 15, color: COLORS.gray, marginBottom: 40,
        }}>Running on Kubernetes (EKS/AKS) with Argo Workflows and MCP Protocol</p>

        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 16, position: "relative",
        }}>
          {Object.entries(nodes).map(([key, node], i) => (
            <div
              key={key}
              onMouseEnter={() => setHoveredNode(key)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{
                gridColumn: node.x + 1,
                gridRow: node.y + 1,
                background: hoveredNode === key ? COLORS.cardHover : COLORS.card,
                borderRadius: 12,
                border: `2px solid ${hoveredNode === key ? node.color : COLORS.navyLight}`,
                padding: 20, textAlign: "center", cursor: "pointer",
                opacity: inView ? 1 : 0,
                transform: inView
                  ? (hoveredNode === key ? "scale(1.05)" : "scale(1)")
                  : "translateY(30px)",
                transition: `all 0.5s ease ${i * 0.1}s`,
                boxShadow: hoveredNode === key ? `0 8px 32px ${node.color}22` : "none",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{node.icon}</div>
              <div style={{
                fontFamily: "'Outfit'", fontWeight: 700, fontSize: 14,
                color: COLORS.white,
              }}>{node.label}</div>
              <div style={{
                fontFamily: "'JetBrains Mono'", fontSize: 11, color: node.color,
                marginTop: 4, opacity: 0.8,
              }}>{node.sub}</div>
            </div>
          ))}
        </div>

        <div style={{
          display: "flex", gap: 12, marginTop: 40, flexWrap: "wrap", justifyContent: "center",
        }}>
          {[
            { name: "Argo Events", desc: "Event-driven triggers", color: COLORS.teal },
            { name: "Argo Workflows", desc: "DAG orchestration", color: COLORS.teal },
            { name: "MCP Protocol", desc: "Tool integration", color: COLORS.gold },
            { name: "LLM (Bedrock/Azure)", desc: "Requirement extraction", color: COLORS.teal },
          ].map((t, i) => (
            <div key={t.name} style={{
              background: COLORS.card, borderRadius: 8, padding: "12px 20px",
              borderTop: `3px solid ${t.color}`, textAlign: "center", flex: "1 0 180px",
              opacity: inView ? 1 : 0,
              transition: `opacity 0.5s ease ${0.5 + i * 0.1}s`,
            }}>
              <div style={{ fontFamily: "'Outfit'", fontWeight: 600, fontSize: 14, color: COLORS.white }}>{t.name}</div>
              <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: COLORS.gray, marginTop: 2 }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ─── Pipeline Simulator ───
function SimulatorSection() {
  const [ref, inView] = useInView(0.1);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(-1);
  const [logs, setLogs] = useState([]);
  const [ticketResult, setTicketResult] = useState(null);
  const timerRef = useRef(null);

  const pipeline = [
    { name: "GitHub Webhook Received", duration: 400, icon: "\u{1F419}", log: "Event: issues.opened on repo cloud-platform/intake" },
    { name: "Argo EventSource Triggered", duration: 600, icon: "⚡", log: "Sensor matched: github-issue-sensor → trigger workflow" },
    { name: "Fetching Issue via MCP", duration: 800, icon: "\u{1F4E5}", log: "MCP:github:get_issue → fetched issue #347: 'Add rate limiting to API gateway'" },
    { name: "LLM Analyzing Requirements", duration: 2000, icon: "\u{1F9E0}", log: "Extracting FR/NFR... Classifying priority... Generating acceptance criteria..." },
    { name: "Creating Jira Ticket", duration: 600, icon: "\u{1F4DD}", log: "MCP:atlassian:create_issue → PLAT-1892 created in Cloud Platform backlog" },
    { name: "Human Review Ready", duration: 400, icon: "✅", log: "Notification sent to #platform-intake. Awaiting review." },
  ];

  const startSimulation = useCallback(() => {
    setRunning(true);
    setStep(0);
    setLogs([]);
    setTicketResult(null);
    let current = 0;
    const runStep = () => {
      if (current >= pipeline.length) {
        setRunning(false);
        setTicketResult({
          key: "PLAT-1892",
          title: "Add rate limiting to API gateway",
          type: "Feature Request",
          priority: "High",
          fr: ["Implement token bucket algorithm with configurable rate", "Support per-client rate limiting by API key", "Return 429 status with Retry-After header"],
          nfr: ["P99 latency impact < 2ms", "Support 50k req/s throughput", "Configuration changes without pod restart"],
        });
        return;
      }
      setStep(current);
      setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), ...pipeline[current] }]);
      current++;
      timerRef.current = setTimeout(runStep, pipeline[current - 1].duration);
    };
    runStep();
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <Section id="simulator" dark={false} style={{ background: `linear-gradient(180deg, ${COLORS.navy} 0%, ${COLORS.bg} 100%)` }}>
      <div ref={ref} style={{ maxWidth: 1000, width: "100%" }}>
        <div style={{
          fontFamily: "'JetBrains Mono'", fontSize: 12, color: COLORS.teal,
          letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12,
        }}>Interactive Demo</div>
        <h2 style={{
          fontFamily: "'Outfit'", fontWeight: 800, fontSize: "clamp(26px,3.5vw,42px)",
          color: COLORS.white, margin: "0 0 8px",
        }}>Pipeline Simulator</h2>
        <p style={{
          fontFamily: "'Outfit'", fontSize: 15, color: COLORS.gray, marginBottom: 32,
        }}>Watch the intelligent ticket pipeline process a GitHub issue in real time</p>

        <button
          onClick={startSimulation}
          disabled={running}
          style={{
            background: running ? COLORS.grayDark : COLORS.teal,
            color: running ? COLORS.gray : COLORS.navy,
            fontFamily: "'Outfit'", fontWeight: 700, fontSize: 16,
            padding: "14px 36px", borderRadius: 10, border: "none",
            cursor: running ? "default" : "pointer",
            marginBottom: 32, transition: "all 0.3s",
            boxShadow: running ? "none" : `0 4px 24px rgba(45,212,168,0.3)`,
          }}
        >
          {running ? "Running Pipeline..." : "▶  Run Pipeline"}
        </button>

        <div style={{
          display: "flex", gap: 4, marginBottom: 24, flexWrap: "wrap", justifyContent: "center",
        }}>
          {pipeline.map((p, i) => {
            const isActive = i === step;
            const finalDone = !running && ticketResult && i <= pipeline.length - 1;
            return (
              <div key={i} style={{
                flex: "1 0 120px", maxWidth: 160,
                background: isActive ? COLORS.teal + "22" : COLORS.card,
                borderRadius: 8, padding: "12px 10px", textAlign: "center",
                border: `2px solid ${isActive ? COLORS.teal : finalDone ? COLORS.teal + "55" : COLORS.navyLight}`,
                transition: "all 0.3s",
                opacity: inView ? 1 : 0.3,
              }}>
                <div style={{
                  fontSize: 22, marginBottom: 4,
                  filter: isActive ? "none" : "grayscale(0.5)",
                  transition: "filter 0.3s",
                }}>{p.icon}</div>
                <div style={{
                  fontFamily: "'Outfit'", fontWeight: 600, fontSize: 11,
                  color: isActive ? COLORS.teal : finalDone ? COLORS.white : COLORS.gray,
                }}>{p.name}</div>
                {isActive && (
                  <div style={{
                    width: 16, height: 16, border: `2px solid ${COLORS.teal}`,
                    borderTop: "2px solid transparent", borderRadius: "50%",
                    margin: "6px auto 0",
                    animation: "spin 0.8s linear infinite",
                  }} />
                )}
                {finalDone && !isActive && (
                  <div style={{ color: COLORS.teal, fontSize: 14, marginTop: 4 }}>&#10003;</div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{
          background: "#0a0e1a", borderRadius: 10, padding: 20,
          border: `1px solid ${COLORS.navyLight}`,
          fontFamily: "'JetBrains Mono'", fontSize: 12, color: COLORS.gray,
          minHeight: 140, maxHeight: 200, overflowY: "auto",
        }}>
          {logs.length === 0 && <span style={{ opacity: 0.5 }}>$ awaiting pipeline execution...</span>}
          {logs.map((l, i) => (
            <div key={i} style={{ marginBottom: 6, lineHeight: 1.5 }}>
              <span style={{ color: COLORS.grayDark }}>[{l.time}]</span>{" "}
              <span style={{ color: COLORS.teal }}>{l.icon} {l.name}</span>
              <br />
              <span style={{ color: COLORS.gray, paddingLeft: 20 }}>{l.log}</span>
            </div>
          ))}
        </div>

        {ticketResult && (
          <div style={{
            background: COLORS.card, borderRadius: 12, padding: 24, marginTop: 20,
            border: `2px solid ${COLORS.teal}`,
            animation: "fadeIn 0.5s ease",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
              <div>
                <span style={{
                  fontFamily: "'JetBrains Mono'", fontSize: 13, color: COLORS.teal,
                  background: "rgba(45,212,168,0.15)", padding: "3px 10px", borderRadius: 4,
                }}>{ticketResult.key}</span>
                <span style={{
                  fontFamily: "'Outfit'", fontSize: 16, fontWeight: 600, color: COLORS.white,
                  marginLeft: 12,
                }}>{ticketResult.title}</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{
                  fontSize: 11, fontFamily: "'JetBrains Mono'", color: COLORS.gold,
                  background: "rgba(244,162,97,0.15)", padding: "3px 10px", borderRadius: 4,
                }}>{ticketResult.priority}</span>
                <span style={{
                  fontSize: 11, fontFamily: "'JetBrains Mono'", color: COLORS.teal,
                  background: "rgba(45,212,168,0.15)", padding: "3px 10px", borderRadius: 4,
                }}>{ticketResult.type}</span>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <div style={{ fontFamily: "'Outfit'", fontWeight: 600, fontSize: 13, color: COLORS.teal, marginBottom: 8 }}>
                  Functional Requirements
                </div>
                {ticketResult.fr.map((r, i) => (
                  <div key={i} style={{
                    fontFamily: "'Outfit'", fontSize: 13, color: COLORS.gray,
                    padding: "4px 0", borderBottom: `1px solid ${COLORS.navyLight}`,
                    lineHeight: 1.5,
                  }}>&#8226; {r}</div>
                ))}
              </div>
              <div>
                <div style={{ fontFamily: "'Outfit'", fontWeight: 600, fontSize: 13, color: COLORS.gold, marginBottom: 8 }}>
                  Non-Functional Requirements
                </div>
                {ticketResult.nfr.map((r, i) => (
                  <div key={i} style={{
                    fontFamily: "'Outfit'", fontSize: 13, color: COLORS.gray,
                    padding: "4px 0", borderBottom: `1px solid ${COLORS.navyLight}`,
                    lineHeight: 1.5,
                  }}>&#8226; {r}</div>
                ))}
              </div>
            </div>
            <div style={{
              marginTop: 16, fontFamily: "'JetBrains Mono'", fontSize: 12,
              color: COLORS.teal, opacity: 0.8,
            }}>
              Total pipeline duration: ~4.8 seconds &middot; 10x faster than manual process
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}

// ─── Solution Architecture Diagram ───
function SolutionArchSection() {
  const [ref, inView] = useInView(0.1);

  const flowSteps = [
    { label: "1. Fetch\nIssue", color: COLORS.teal },
    { label: "2. LLM\nAnalysis", color: COLORS.gold },
    { label: "3. Create\nJira", color: COLORS.teal },
  ];

  return (
    <Section id="solution-arch">
      <div ref={ref} style={{ maxWidth: 1050, width: "100%" }}>
        <div style={{
          fontFamily: "'JetBrains Mono'", fontSize: 12, color: COLORS.teal,
          letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12,
        }}>Solution Architecture</div>
        <h2 style={{
          fontFamily: "'Outfit'", fontWeight: 800, fontSize: "clamp(26px,3.5vw,42px)",
          color: COLORS.white, margin: "0 0 8px",
        }}>Event-Driven Intake Pipeline on Kubernetes (EKS/AKS)</h2>
        <p style={{
          fontFamily: "'Outfit'", fontSize: 15, color: COLORS.gray, marginBottom: 40,
        }}>End-to-end flow from GitHub issue to structured Jira ticket</p>

        {/* Main diagram */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "160px 1fr 160px",
          gap: 20,
          alignItems: "center",
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0)" : "translateY(30px)",
          transition: "all 0.8s ease",
        }}>
          {/* LEFT: GitHub */}
          <div style={{
            background: COLORS.card, borderRadius: 12, padding: 20,
            border: `2px solid ${COLORS.navyLight}`, textAlign: "center",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
          }}>
            <div style={{
              fontFamily: "'Outfit'", fontWeight: 700, fontSize: 16, color: COLORS.white,
            }}>GitHub</div>
            <div style={{
              fontFamily: "'Outfit'", fontSize: 12, color: COLORS.gray, lineHeight: 1.4,
            }}>Issue Created<br />(Webhook)</div>
            <div style={{
              background: COLORS.bg, borderRadius: 8, padding: "8px 14px",
              border: `1px solid ${COLORS.teal}`,
            }}>
              <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: COLORS.teal }}>GitHub</div>
              <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 9, color: COLORS.gray }}>MCP Server</div>
            </div>
          </div>

          {/* CENTER: Kubernetes Cluster */}
          <div style={{
            border: `2px dashed ${COLORS.teal}`,
            borderRadius: 16, padding: 24, position: "relative",
            background: "rgba(45,212,168,0.03)",
          }}>
            <div style={{
              position: "absolute", top: -12, left: 24,
              background: COLORS.bg, padding: "2px 12px",
              fontFamily: "'JetBrains Mono'", fontSize: 11, color: COLORS.teal,
              fontWeight: 600, letterSpacing: "0.05em",
            }}>Kubernetes Cluster (EKS/AKS)</div>

            {/* Argo Events */}
            <div style={{
              display: "flex", gap: 16, alignItems: "center", marginBottom: 20,
            }}>
              <div style={{
                background: COLORS.tealDark, borderRadius: 8, padding: "12px 18px",
                minWidth: 120, textAlign: "center", flexShrink: 0,
              }}>
                <div style={{ fontFamily: "'Outfit'", fontWeight: 700, fontSize: 13, color: COLORS.white }}>Argo Events</div>
                <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>Event Source + Sensor</div>
              </div>

              {/* Arrow to workflows */}
              <div style={{ color: COLORS.teal, fontSize: 20, flexShrink: 0 }}>&#8594;</div>

              {/* Argo Workflows box */}
              <div style={{
                flex: 1, border: `2px solid ${COLORS.teal}`, borderRadius: 10,
                padding: 16, position: "relative",
                background: "rgba(45,212,168,0.05)",
              }}>
                <div style={{
                  position: "absolute", top: -10, left: 16,
                  background: COLORS.bg, padding: "1px 10px",
                  fontFamily: "'JetBrains Mono'", fontSize: 10, color: COLORS.teal,
                  fontWeight: 600,
                }}>Argo Workflows</div>

                <div style={{
                  display: "flex", gap: 8, alignItems: "center", justifyContent: "center",
                }}>
                  {flowSteps.map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        background: s.color, borderRadius: 8, padding: "10px 16px",
                        textAlign: "center", minWidth: 90,
                      }}>
                        <div style={{
                          fontFamily: "'Outfit'", fontWeight: 600, fontSize: 12,
                          color: COLORS.navy, whiteSpace: "pre-line", lineHeight: 1.3,
                        }}>{s.label}</div>
                      </div>
                      {i < flowSteps.length - 1 && (
                        <div style={{ color: COLORS.gray, fontSize: 16 }}>&#8594;</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* MCP Containers */}
            <div style={{ marginTop: 4 }}>
              <div style={{
                fontFamily: "'JetBrains Mono'", fontSize: 10, color: COLORS.gray,
                marginBottom: 8, letterSpacing: "0.05em",
              }}>MCP Containers (Sidecar/Init)</div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{
                  background: COLORS.tealDark, borderRadius: 6, padding: "8px 18px",
                  textAlign: "center",
                }}>
                  <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: COLORS.white, fontWeight: 600 }}>Atlassian MCP</div>
                </div>
                <div style={{
                  background: COLORS.gold, borderRadius: 6, padding: "8px 18px",
                  textAlign: "center",
                }}>
                  <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: COLORS.navy, fontWeight: 600 }}>AWS MCP</div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Atlassian */}
          <div style={{
            background: COLORS.card, borderRadius: 12, padding: 20,
            border: `2px solid ${COLORS.navyLight}`, textAlign: "center",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
          }}>
            <div style={{
              fontFamily: "'Outfit'", fontWeight: 700, fontSize: 16, color: COLORS.white,
            }}>Atlassian</div>
            <div style={{
              fontFamily: "'Outfit'", fontSize: 12, color: COLORS.gray, lineHeight: 1.4,
            }}>Jira Ticket<br />Created</div>
            <div style={{
              background: COLORS.bg, borderRadius: 8, padding: "8px 14px",
              border: `1px solid ${COLORS.gold}`,
            }}>
              <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: COLORS.gold }}>FR & NFR</div>
              <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 9, color: COLORS.gray }}>Structured Output</div>
            </div>
          </div>
        </div>

        {/* Flow arrows between main sections */}
        <div style={{
          display: "grid", gridTemplateColumns: "160px 1fr 160px",
          gap: 20, marginTop: -8, marginBottom: 8,
          opacity: inView ? 1 : 0,
          transition: "opacity 0.5s ease 0.4s",
        }}>
          <div style={{ textAlign: "center", color: COLORS.teal, fontSize: 18 }}>&#8594;</div>
          <div />
          <div style={{ textAlign: "center", color: COLORS.teal, fontSize: 18, transform: "scaleX(-1)" }}>&#8592;</div>
        </div>

        {/* Key Technologies */}
        <div style={{
          marginTop: 36,
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.6s ease 0.5s",
        }}>
          <div style={{
            fontFamily: "'Outfit'", fontWeight: 700, fontSize: 16, color: COLORS.white,
            marginBottom: 16,
          }}>Key Technologies</div>
          <div style={{
            display: "flex", gap: 12, flexWrap: "wrap",
          }}>
            {[
              { name: "Argo Events", desc: "Event-driven triggers", borderColor: COLORS.teal },
              { name: "Argo Workflows", desc: "DAG orchestration", borderColor: COLORS.teal },
              { name: "MCP Protocol", desc: "Tool integration", borderColor: COLORS.gold },
              { name: "LLM (Bedrock/Azure)", desc: "Requirement extraction", borderColor: COLORS.gold },
            ].map((t) => (
              <div key={t.name} style={{
                flex: "1 0 180px",
                background: COLORS.card, borderRadius: 8, padding: "14px 20px",
                borderLeft: `4px solid ${t.borderColor}`,
                textAlign: "left",
              }}>
                <div style={{ fontFamily: "'Outfit'", fontWeight: 600, fontSize: 14, color: COLORS.white }}>{t.name}</div>
                <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: COLORS.gray, marginTop: 2 }}>{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─── Metrics Dashboard ───
function MetricsSection() {
  const [ref, inView] = useInView(0.2);
  const metrics = [
    { label: "Lead Time", before: "45+ min", after: "< 5 min", improvement: "10x", sublabel: "Argo Workflow duration", color: COLORS.teal },
    { label: "Process Efficiency", before: "56%", after: "95%+", improvement: "Near-optimal", sublabel: "Value-add / Total time", color: COLORS.teal },
    { label: "Ticket Quality", before: "~30% rework", after: "< 5% rework", improvement: "6x", sublabel: "Jira ticket reopen rate", color: COLORS.gold },
    { label: "Throughput", before: "~10/day", after: "Unlimited*", improvement: "Scales", sublabel: "Kubernetes autoscaling", color: COLORS.teal },
  ];

  const definitions = [
    { term: "Takt Time", def: "Available time / Customer demand. Sets the pace for sustainable delivery." },
    { term: "Cycle Time", def: "Time to complete one unit of work. Target: < 5 minutes per ticket." },
    { term: "Process Efficiency", def: "Value-add time / Total lead time. Higher = less waste." },
    { term: "First Pass Yield", def: "% of tickets accepted without rework. Quality indicator." },
  ];

  return (
    <Section id="metrics">
      <div ref={ref} style={{ maxWidth: 1000, width: "100%" }}>
        <div style={{
          fontFamily: "'JetBrains Mono'", fontSize: 12, color: COLORS.teal,
          letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12,
        }}>Measuring Success</div>
        <h2 style={{
          fontFamily: "'Outfit'", fontWeight: 800, fontSize: "clamp(26px,3.5vw,42px)",
          color: COLORS.white, margin: "0 0 32px",
        }}>Key Metrics for Cycle Time and Quality</h2>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16, marginBottom: 40,
        }}>
          {metrics.map((m, i) => (
            <div key={m.label} style={{
              background: COLORS.card, borderRadius: 12, padding: 24,
              border: `1px solid ${COLORS.navyLight}`,
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(20px)",
              transition: `all 0.5s ease ${i * 0.1}s`,
            }}>
              <div style={{ fontFamily: "'Outfit'", fontWeight: 600, fontSize: 16, color: COLORS.white, marginBottom: 16 }}>{m.label}</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: COLORS.gray }}>Before</div>
                  <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 16, color: COLORS.red, fontWeight: 600 }}>{m.before}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: COLORS.gray }}>After</div>
                  <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 16, color: COLORS.teal, fontWeight: 600 }}>{m.after}</div>
                </div>
              </div>
              <div style={{ height: 6, background: COLORS.navyLight, borderRadius: 3, overflow: "hidden", marginBottom: 12 }}>
                <div style={{
                  height: "100%", background: `linear-gradient(90deg, ${COLORS.red}, ${m.color})`,
                  width: inView ? "100%" : "0%",
                  borderRadius: 3,
                  transition: `width 1.2s ease ${0.3 + i * 0.15}s`,
                }} />
              </div>
              <div style={{
                fontFamily: "'Outfit'", fontWeight: 700, fontSize: 14,
                color: COLORS.navy, background: m.color,
                display: "inline-block", padding: "4px 14px", borderRadius: 6,
              }}>{m.improvement}{m.improvement !== "Near-optimal" && m.improvement !== "Scales" ? " faster" : ""}</div>
              <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: COLORS.grayDark, marginTop: 8 }}>{m.sublabel}</div>
            </div>
          ))}
        </div>

        <div style={{
          background: COLORS.card, borderRadius: 12, padding: 24,
          border: `1px solid ${COLORS.navyLight}`,
        }}>
          <div style={{
            fontFamily: "'Outfit'", fontWeight: 600, fontSize: 16, color: COLORS.white,
            marginBottom: 16,
          }}>Value Stream Metrics Explained</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            {definitions.map(d => (
              <div key={d.term}>
                <div style={{ fontFamily: "'Outfit'", fontWeight: 600, fontSize: 13, color: COLORS.teal }}>{d.term}</div>
                <div style={{ fontFamily: "'Outfit'", fontSize: 13, color: COLORS.gray, lineHeight: 1.5, marginTop: 4 }}>{d.def}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─── Thank You Section ───
function ThankYouSection() {
  const [ref, inView] = useInView(0.1);
  return (
    <section
      ref={ref}
      id="thankyou"
      style={{
        minHeight: "100vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center",
        background: `radial-gradient(ellipse at 50% 40%, ${COLORS.navyLight} 0%, ${COLORS.bg} 70%)`,
        padding: "60px 24px", position: "relative", overflow: "hidden",
      }}
    >
      <div style={{
        position: "absolute", inset: 0, opacity: 0.04,
        backgroundImage: `linear-gradient(${COLORS.teal} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.teal} 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />
      <div style={{
        position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)",
        width: 500, height: 500, borderRadius: "50%",
        background: `radial-gradient(circle, rgba(45,212,168,0.1) 0%, transparent 70%)`,
        filter: "blur(80px)",
      }} />

      <div style={{
        position: "relative", zIndex: 1,
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(40px)",
        transition: "all 1s ease",
      }}>
        <div style={{
          fontFamily: "'JetBrains Mono'", fontSize: 13, color: COLORS.teal,
          letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 24,
          background: "rgba(45,212,168,0.1)", display: "inline-block",
          padding: "6px 20px", borderRadius: 20, border: `1px solid rgba(45,212,168,0.2)`,
        }}>KCD Toronto 2026</div>

        <h1 style={{
          fontFamily: "'Outfit'", fontWeight: 900, fontSize: "clamp(48px, 8vw, 96px)",
          color: COLORS.white, lineHeight: 1.05, margin: "16px 0",
        }}>
          Thank You
        </h1>

        <p style={{
          fontFamily: "'Outfit'", fontWeight: 300, fontSize: "clamp(16px, 2vw, 22px)",
          color: COLORS.gray, margin: "8px 0 48px", maxWidth: 500,
        }}>
          Gonzalo Vazquez &middot; Director, Cloud Engineering &middot; Royal Bank of Canada
        </p>

        <div style={{
          display: "flex", gap: 48, justifyContent: "center", alignItems: "center",
          flexWrap: "wrap",
        }}>
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.8s ease 0.3s",
          }}>
            <div style={{
              background: COLORS.white, borderRadius: 16, padding: 16,
              boxShadow: `0 0 40px rgba(45,212,168,0.15)`,
            }}>
              <QRCodeSVG
                value="https://gonzalovazquez.github.io/ai-ticketing-pipeline/"
                size={160}
                bgColor={COLORS.white}
                fgColor={COLORS.bg}
                level="M"
              />
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono'", fontSize: 11, color: COLORS.gray,
              maxWidth: 180, lineHeight: 1.4,
            }}>
              Scan to view this presentation
            </div>
          </div>

          <div style={{
            display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start",
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.8s ease 0.5s",
          }}>
            <a
              href="https://github.com/gonzalovazquez/ai-ticketing-pipeline"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 12,
                background: COLORS.card, borderRadius: 12, padding: "16px 24px",
                border: `1px solid ${COLORS.navyLight}`,
                textDecoration: "none",
                transition: "all 0.3s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = COLORS.teal;
                e.currentTarget.style.boxShadow = `0 4px 24px rgba(45,212,168,0.15)`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = COLORS.navyLight;
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill={COLORS.white}>
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <div>
                <div style={{ fontFamily: "'Outfit'", fontWeight: 600, fontSize: 15, color: COLORS.white }}>
                  View Source Code
                </div>
                <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: COLORS.gray, marginTop: 2 }}>
                  gonzalovazquez/ai-ticketing-pipeline
                </div>
              </div>
            </a>

            <div style={{
              fontFamily: "'JetBrains Mono'", fontSize: 12, color: COLORS.grayDark,
              paddingLeft: 4, lineHeight: 1.6,
            }}>
              <div style={{ color: COLORS.gray, marginBottom: 4 }}>gonzalovazquez.ca</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Main App ───
export default function App() {
  const [active, setActive] = useState("hero");
  const [presentationMode, setPresentationMode] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const isScrolling = useRef(false);

  const goToSlide = useCallback((index) => {
    const clampedIndex = Math.max(0, Math.min(index, SLIDES.length - 1));
    const el = document.getElementById(SLIDES[clampedIndex]);
    if (!el) return;
    isScrolling.current = true;
    el.scrollIntoView({ behavior: "smooth" });
    setActive(SLIDES[clampedIndex]);
    setTimeout(() => { isScrolling.current = false; }, 800);
  }, []);

  const currentIndex = SLIDES.indexOf(active);

  useEffect(() => {
    const handleScroll = () => {
      if (isScrolling.current) return;
      for (const id of [...SLIDES].reverse()) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 200) {
          setActive(id);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
        case "PageDown":
        case " ":
          e.preventDefault();
          goToSlide(currentIndex + 1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
          e.preventDefault();
          goToSlide(currentIndex - 1);
          break;
        case "Home":
          e.preventDefault();
          goToSlide(0);
          break;
        case "End":
          e.preventDefault();
          goToSlide(SLIDES.length - 1);
          break;
        case "f":
        case "F":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            if (document.fullscreenElement) {
              document.exitFullscreen();
              setPresentationMode(false);
            } else {
              document.documentElement.requestFullscreen();
              setPresentationMode(true);
            }
          }
          break;
        case "Escape":
          if (presentationMode && !document.fullscreenElement) {
            setPresentationMode(false);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentIndex, goToSlide, presentationMode]);

  useEffect(() => {
    const onFSChange = () => {
      if (!document.fullscreenElement) {
        setPresentationMode(false);
      }
    };
    document.addEventListener("fullscreenchange", onFSChange);
    return () => document.removeEventListener("fullscreenchange", onFSChange);
  }, []);

  useEffect(() => {
    setShowHint(true);
    const t = setTimeout(() => setShowHint(false), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      fontFamily: "'Outfit', sans-serif", background: COLORS.bg,
      minHeight: "100vh", color: COLORS.white,
    }}>
      <style>{fonts}{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${COLORS.bg}; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.navyLight}; border-radius: 3px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <Nav active={active} presentationMode={presentationMode} />
      <SlideIndicator current={currentIndex} total={SLIDES.length} />
      <PresentationHint visible={showHint} />

      {!presentationMode && (
        <button
          onClick={() => {
            document.documentElement.requestFullscreen();
            setPresentationMode(true);
          }}
          title="Enter presentation mode (F)"
          style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 200,
            background: COLORS.card, border: `1px solid ${COLORS.navyLight}`,
            color: COLORS.gray, borderRadius: 8, padding: "8px 12px",
            cursor: "pointer", fontFamily: "'JetBrains Mono'", fontSize: 11,
            display: "flex", alignItems: "center", gap: 6,
            transition: "all 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.teal; e.currentTarget.style.color = COLORS.teal; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.navyLight; e.currentTarget.style.color = COLORS.gray; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
          Present
        </button>
      )}

      <Hero />
      <ProblemSection />
      <VSMSection />
      <ArchitectureSection />
      <SimulatorSection />
      <SolutionArchSection />
      <MetricsSection />
      <ThankYouSection />
    </div>
  );
}
