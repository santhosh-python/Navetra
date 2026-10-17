from functools import lru_cache
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "processed" / "S2_Dhis2Data.csv"

app = FastAPI(
    title="Navetra Historical Inventory API",
    version="0.1.0",
    description=(
        "Historical medicine inventory research data and a transparent "
        "rolling-average forecast baseline. This is not a live inventory feed."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@lru_cache(maxsize=1)
def get_data() -> pd.DataFrame:
    if not DATA_PATH.is_file():
        raise RuntimeError(
            f"Dataset not found at {DATA_PATH}. "
            "Check that data/processed/S2_Dhis2Data.csv exists."
        )

    df = pd.read_csv(
        DATA_PATH,
        dtype={"hf_pk": "string", "productID": "string"},
    )

    required = {
        "hf_pk", "name1", "date", "stockout", "received",
        "consumption", "closeBalance", "openBalance",
        "facility_type", "district", "quarter", "productID",
    }
    missing = sorted(required - set(df.columns))
    if missing:
        raise RuntimeError(f"Required dataset columns are missing: {missing}")

    df["date"] = pd.to_datetime(
        df["date"], format="%m/%d/%y", errors="coerce"
    )

    for column in [
        "stockout", "received", "consumption", "closeBalance",
        "openBalance", "lat", "long", "normAvg", "normStd",
    ]:
        if column in df.columns:
            df[column] = pd.to_numeric(df[column], errors="coerce")

    df = df.dropna(subset=["hf_pk", "productID", "name1", "date"])
    df = df.sort_values(["hf_pk", "productID", "date"]).reset_index(drop=True)
    return df


def safe_number(value):
    if pd.isna(value):
        return None
    return float(value)


def date_text(value) -> str:
    return pd.Timestamp(value).strftime("%Y-%m-%d")


def get_series(facility_id: str, product_id: str) -> pd.DataFrame:
    df = get_data()
    subset = df[
        (df["hf_pk"].astype(str) == facility_id)
        & (df["productID"].astype(str) == product_id)
    ].sort_values("date")

    if subset.empty:
        raise HTTPException(
            status_code=404,
            detail="No history found for that facility and product.",
        )
    return subset


@app.get("/")
def root():
    return {
        "service": "Navetra Historical Inventory API",
        "docs": "/docs",
        "health": "/health",
        "data_context": "Historical research data; not live stock information.",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "dataset_file_exists": DATA_PATH.is_file(),
    }


@app.get("/research/summary")
def research_summary():
    df = get_data()
    expected_close = (
        df["openBalance"] + df["received"] - df["consumption"]
    )
    valid_balance = expected_close.notna() & df["closeBalance"].notna()
    mismatches = (
        (expected_close - df["closeBalance"]).abs() > 0.01
    ) & valid_balance

    stockout = df["stockout"].eq(1)

    return {
        "dataset": "S2_Dhis2Data.csv",
        "data_context": "Historical research data from Sierra Leone, not live stock.",
        "rows": int(len(df)),
        "facilities": int(df["hf_pk"].nunique()),
        "products": int(df["productID"].nunique()),
        "first_observation": date_text(df["date"].min()),
        "last_observation": date_text(df["date"].max()),
        "unique_observation_dates": int(df["date"].nunique()),
        "stockout_rows": int(stockout.sum()),
        "stockout_rate_percent": round(float(stockout.mean() * 100), 2),
        "balance_checks": int(valid_balance.sum()),
        "balance_mismatches": int(mismatches.sum()),
        "quarters": {
            str(k): int(v)
            for k, v in df["quarter"].value_counts().sort_index().items()
        },
    }


@app.get("/research/facilities")
def research_facilities(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    df = get_data()
    result = (
        df.groupby("hf_pk", dropna=False)
        .agg(
            facility_type=("facility_type", "last"),
            district=("district", "last"),
            observations=("hf_pk", "size"),
            product_count=("productID", "nunique"),
            last_observed=("date", "max"),
        )
        .reset_index()
        .sort_values(["district", "hf_pk"])
    )

    total = len(result)
    result = result.iloc[offset:offset + limit].copy()
    result["last_observed"] = result["last_observed"].map(date_text)

    return {
        "total": int(total),
        "limit": limit,
        "offset": offset,
        "items": result.where(pd.notna(result), None).to_dict("records"),
    }


@app.get("/research/products")
def research_products(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    df = get_data()
    result = (
        df.groupby(["productID", "name1"], dropna=False)
        .agg(
            observations=("productID", "size"),
            facility_count=("hf_pk", "nunique"),
            stockout_rate=("stockout", "mean"),
            mean_recorded_consumption=("consumption", "mean"),
            last_observed=("date", "max"),
        )
        .reset_index()
        .sort_values(["stockout_rate", "name1"], ascending=[False, True])
    )

    total = len(result)
    result = result.iloc[offset:offset + limit].copy()
    result["stockout_rate_percent"] = (result.pop("stockout_rate") * 100).round(2)
    result["mean_recorded_consumption"] = result[
        "mean_recorded_consumption"
    ].round(2)
    result["last_observed"] = result["last_observed"].map(date_text)

    return {
        "total": int(total),
        "limit": limit,
        "offset": offset,
        "items": result.where(pd.notna(result), None).to_dict("records"),
    }


@app.get("/research/history")
def research_history(
    facility_id: str,
    product_id: str,
    limit: int = Query(default=100, ge=1, le=200),
):
    series = get_series(facility_id, product_id).tail(limit)
    columns = [
        "hf_pk", "productID", "name1", "date", "quarter",
        "stockout", "openBalance", "received", "consumption", "closeBalance",
    ]

    result = series[columns].copy()
    result["date"] = result["date"].map(date_text)
    return {
        "facility_id": facility_id,
        "product_id": product_id,
        "product_name": str(series.iloc[-1]["name1"]),
        "records_returned": int(len(result)),
        "items": result.where(pd.notna(result), None).to_dict("records"),
    }


@app.get("/research/forecast")
def research_forecast(
    facility_id: str,
    product_id: str,
    horizon_months: int = Query(default=3, ge=1, le=12),
):
    series = get_series(facility_id, product_id)
    last = series.iloc[-1]

    recent_usage = (
        series["consumption"]
        .tail(6)
        .dropna()
        .clip(lower=0)
    )
    if recent_usage.empty:
        raise HTTPException(
            status_code=422,
            detail="No usable historical consumption is available for this series.",
        )

    avg_monthly_usage = float(recent_usage.mean())
    starting_stock = max(0.0, float(last["closeBalance"] or 0))
    stock = starting_stock
    last_date = pd.Timestamp(last["date"])
    projection = []
    first_risk_date = None

    for month in range(1, horizon_months + 1):
        forecast_date = last_date + pd.DateOffset(months=month)
        demand = max(0.0, avg_monthly_usage)
        unmet = max(0.0, demand - stock)
        closing_stock = max(0.0, stock - demand)
        risk = unmet > 0 or (demand > 0 and closing_stock <= 0)

        if risk and first_risk_date is None:
            first_risk_date = date_text(forecast_date)

        projection.append({
            "date": date_text(forecast_date),
            "expected_consumption": round(demand, 2),
            "projected_closing_stock": round(closing_stock, 2),
            "unmet_demand": round(unmet, 2),
            "stockout_risk": bool(risk),
        })
        stock = closing_stock

    return {
        "facility_id": facility_id,
        "product_id": product_id,
        "product_name": str(last["name1"]),
        "method": "six-observation rolling-mean baseline",
        "data_context": "Historical research data; this is not a live inventory forecast.",
        "last_observed_date": date_text(last_date),
        "historical_observations": int(len(series)),
        "observations_used_for_baseline": int(len(recent_usage)),
        "starting_stock": round(starting_stock, 2),
        "average_monthly_consumption": round(avg_monthly_usage, 2),
        "first_projected_stockout_risk": first_risk_date,
        "future_receipts_assumed": 0,
        "projection": projection,
        "limitations": [
            "This simple baseline is not a trained machine-learning model.",
            "No future deliveries are assumed because future orders are not provided.",
            "The source dataset is historical and does not represent current Indian stock.",
        ],
    }
