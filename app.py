from __future__ import annotations

import json

import pandas as pd
import plotly.express as px
import streamlit as st

from src.agents.recall_workflow import investigate_batch
from src.database.repository import get_repository

st.set_page_config(page_title="BatchBack", page_icon="🧪", layout="wide")

st.markdown(
    """
    <style>
    :root {
        --bg: #07111F;
        --panel: #0B1728;
        --cyan: #20D9F2;
        --teal: #14D9B5;
        --text: #F4F8FC;
        --muted: #8B9AAF;
        --warning: #FFB84D;
        --red: #FF5263;
    }
    .stApp {
        background: linear-gradient(180deg, #07111F 0%, #0B1728 100%);
        color: var(--text);
    }
    .block-container {
        padding-top: 2rem;
    }
    .metric-card {
        background: rgba(11,23,40,0.8);
        border: 1px solid rgba(32,217,242,0.4);
        border-radius: 16px;
        padding: 1rem;
        box-shadow: 0 12px 35px rgba(14, 22, 38, 0.45);
    }
    .main-header {
        font-size: 2.5rem;
        font-weight: 800;
        background: linear-gradient(135deg, #20D9F2, #14D9B5);
        -webkit-background-clip: text;
        color: transparent;
    }
    .eyebrow {
        color: var(--cyan);
        letter-spacing: 0.12em;
        font-size: 0.72rem;
        text-transform: uppercase;
    }
    div[data-testid="stSidebar"] {
        background: rgba(7,17,31,0.96);
    }
    </style>
    """,
    unsafe_allow_html=True,
)

repo = get_repository()


def make_kpi(label: str, value: str, delta: str = ""):
    st.markdown(
        f"""
        <div class="metric-card">
            <div style="color:#8B9AAF;font-size:0.7rem;letter-spacing:0.08em;text-transform:uppercase;">{label}</div>
            <div style="font-size:2rem;font-weight:800;margin:0.4rem 0;">{value}</div>
            <div style="color:#14D9B5;font-size:0.75rem;">{delta}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


with st.sidebar:
    st.title("BatchBack")
    st.caption("Trace Faster. Recall Smarter. Protect Better.")
    page = st.radio(
        "Navigation",
        ["Overview", "Batch Registry", "Supply Chain Explorer", "Recall Intelligence", "Notifications", "Reports", "Settings"],
    )

if page == "Overview":
    batches = repo.get_batches()
    shipments = repo.get_shipments()
    metrics = repo.get_dashboard_snapshot()

    st.markdown('<div class="eyebrow">Command center</div>', unsafe_allow_html=True)
    st.markdown('<div class="main-header">Food safety recall operations dashboard</div>', unsafe_allow_html=True)

    col1, col2, col3 = st.columns([2, 2, 1])
    with col1:
        st.metric("Total batches", metrics["total_registered_batches"])
    with col2:
        st.metric("Active shipments", f"{metrics['active_shipments']:,}")
    with col3:
        st.metric("High-risk batches", metrics["batches_under_investigation"])

    cards = [
        ("Total registered batches", metrics["total_registered_batches"], "Live registry"),
        ("Active shipments", f"{metrics['active_shipments']:,}", "Goods in motion"),
        ("Batches under investigation", metrics["batches_under_investigation"], "Risk review"),
        ("Pending recall operations", metrics["pending_recall_operations"], "Awaiting approval"),
        ("Affected destinations", metrics["affected_destinations"], "Locations exposed"),
        ("Inventory awaiting isolation", f"{metrics['inventory_awaiting_isolation']:,}", "Units on hold"),
    ]

    grid = st.columns(3)
    for i, (label, value, detail) in enumerate(cards):
        with grid[i % 3]:
            make_kpi(label, str(value), detail)

    st.subheader("Inventory by destination")
    by_dest = shipments.groupby("destination", as_index=False)["inventory_quantity"].sum().sort_values("inventory_quantity", ascending=False)
    fig = px.bar(by_dest, x="destination", y="inventory_quantity", color="inventory_quantity", color_continuous_scale="Tealgrn")
    fig.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", font={"color": "#F4F8FC"})
    st.plotly_chart(fig, use_container_width=True)

    col_a, col_b = st.columns(2)
    with col_a:
        recall_status = batches["recall_status"].value_counts().reset_index()
        recall_status.columns = ["status", "count"]
        fig2 = px.pie(recall_status, names="status", values="count", color_discrete_sequence=["#20D9F2", "#14D9B5", "#FFB84D", "#FF5263"])
        fig2.update_layout(paper_bgcolor="rgba(0,0,0,0)", font={"color": "#F4F8FC"})
        st.plotly_chart(fig2, use_container_width=True)
    with col_b:
        batches["production_date"] = pd.to_datetime(batches["production_date"])
        batch_counts = batches.groupby(pd.Grouper(key="production_date", freq="D")).size().reset_index()
        batch_counts.columns = ["date", "batches"]
        fig3 = px.line(batch_counts, x="date", y="batches", markers=True)
        fig3.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", font={"color": "#F4F8FC"})
        st.plotly_chart(fig3, use_container_width=True)

    st.subheader("Recent batch activity")
    st.dataframe(batches.head(6), use_container_width=True)

elif page == "Batch Registry":
    batches = repo.get_batches()
    st.title("Batch Registry")
    search = st.text_input("Search by batch ID or product")
    filtered = batches.copy()
    if search:
        filtered = filtered[filtered["batch_id"].str.contains(search, case=False) | filtered["product_name"].str.contains(search, case=False)]
    st.dataframe(filtered, use_container_width=True)

    if not filtered.empty:
        selected = st.selectbox("Inspect batch", filtered["batch_id"].tolist())
        detail = filtered[filtered["batch_id"] == selected].iloc[0].to_dict()
        st.json(detail)

elif page == "Supply Chain Explorer":
    shipments = repo.get_shipments()
    st.title("Supply Chain Explorer")
    batch_options = repo.get_batches()["batch_id"].tolist()
    selected = st.selectbox("Choose batch", batch_options)
    subset = shipments[shipments["batch_id"] == selected]
    if subset.empty:
        st.warning("No shipments found for this batch.")
    else:
        destinations = subset["destination"].unique().tolist()
        st.write(f"Destinations for {selected}: {', '.join(destinations)}")
        trace = px.scatter(
            subset,
            x=[0.2, 0.8, 0.5][: len(subset)],
            y=[0.6, 0.2, 0.8][: len(subset)],
            size="inventory_quantity",
            color="destination",
            hover_name="destination",
            title="Destination network",
        )
        trace.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", font={"color": "#F4F8FC"})
        st.plotly_chart(trace, use_container_width=True)
        st.dataframe(subset[["batch_id", "destination", "inventory_quantity", "shipment_status", "recall_status"]], use_container_width=True)

elif page == "Recall Intelligence":
    batches = repo.get_batches()
    selected = st.selectbox("Select batch", batches["batch_id"].tolist())
    recommendation = investigate_batch(repo, selected)
    st.title("AI Recall Intelligence")
    col1, col2 = st.columns([1.1, 1.7])
    with col1:
        st.metric("Risk priority", recommendation["risk_priority"])
        st.metric("Risk score", recommendation["risk_score"])
        st.caption("Approval status: " + recommendation["approval_status"])
    with col2:
        st.markdown("### Supporting evidence")
        for reason in recommendation["supporting_evidence"]:
            st.write("• " + reason)
    st.subheader("Recommended action")
    st.info(recommendation["recommended_action"])
    st.subheader("Outstanding information")
    st.warning(recommendation["outstanding_information"])
    st.subheader("Affected destinations")
    st.write(", ".join(recommendation["affected_destinations"]))
    st.dataframe(pd.DataFrame(recommendation["shipments"]), use_container_width=True)

elif page == "Notifications":
    st.title("Notification Center")
    severity = st.selectbox("Filter by severity", ["All", "High", "Medium", "Low"])
    notifications = repo.get_notifications(None if severity == "All" else severity)
    for item in notifications:
        tag = item["severity"]
        if tag == "High":
            st.error(f"{item['title']} — {item['message']}")
        elif tag == "Medium":
            st.warning(f"{item['title']} — {item['message']}")
        else:
            st.info(f"{item['title']} — {item['message']}")

elif page == "Reports":
    st.title("Analytics & Reports")
    report = json.loads(repo.export_report())
    st.download_button("Download JSON report", data=json.dumps(report, indent=2), file_name="batchback_report.json", mime="application/json")
    if report.get("batches"):
        batch_df = pd.DataFrame(report["batches"])
        cases = batch_df["recall_status"].value_counts()
        st.bar_chart(cases)
        st.dataframe(batch_df, use_container_width=True)

else:
    st.title("Settings")
    st.write("Database mode: demo")
    st.write("AI mode: rule-based analysis (no secret credentials are stored in the app)")
    st.write("Db2 adapter available for connector-backed deployments when configured via environment variables.")
    st.code("DATABASE_MODE=demo\nDB2_DSN=\nDB2_UID=\nDB2_PWD=\nENABLE_AI=false")
