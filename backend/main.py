from functools import lru_cache
import os
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
try:
    from .ml_pipeline import (
        DEFAULT_MODEL_PATH,
        FEATURE_COLUMNS,
        build_feature_frame,
        build_next_month_features,
        load_artifact,
    )
except ImportError:
    from ml_pipeline import (  # type: ignore[no-redef]
        DEFAULT_MODEL_PATH,
        FEATURE_COLUMNS,
        build_feature_frame,
        build_next_month_features,
        load_artifact,
    )

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "processed" / "S2_Dhis2Data.csv"
DEFAULT_CORS_ORIGINS = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://10.23.18.223:5173",
)


def get_cors_origins() -> list[str]:
    configured = os.getenv("NAVETRA_CORS_ORIGINS")
    if configured is None:
        return list(DEFAULT_CORS_ORIGINS)

    origins = [origin.strip().rstrip("/") for origin in configured.split(",")]
    origins = [origin for origin in origins if origin]
    if "*" in origins:
        raise ValueError(
            "NAVETRA_CORS_ORIGINS must list explicit origins; '*' is not allowed."
        )
    return origins

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
    allow_origins=get_cors_origins(),
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


@lru_cache(maxsize=1)
def get_model_artifact():
    return load_artifact(DEFAULT_MODEL_PATH)


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


def get_consecutive_months(series: pd.DataFrame, count: int) -> pd.DataFrame:
    """Return the latest complete calendar-month window, or an empty frame."""
    if count < 1 or len(series) < count:
        return series.iloc[0:0].copy()

    window = series.sort_values("date").tail(count).copy()
    month_index = window["date"].dt.year * 12 + window["date"].dt.month
    if not month_index.diff().iloc[1:].eq(1).all():
        return series.iloc[0:0].copy()
    return window


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
    model_available = False
    model_error = None
    model_metadata = {}
    try:
        model_metadata = get_model_artifact()["metadata"]
        model_available = True
    except (FileNotFoundError, ValueError, OSError) as exc:
        model_error = str(exc)

    return {
        "status": "ok" if DATA_PATH.is_file() and model_available else "degraded",
        "dataset_file_exists": DATA_PATH.is_file(),
        "model_artifact_exists": DEFAULT_MODEL_PATH.is_file(),
        "model_loadable": model_available,
        "ready": DATA_PATH.is_file() and model_available,
        "model_error": model_error,
        "model_version": model_metadata.get("model_version"),
        "decision_threshold": model_metadata.get("decision_threshold"),
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

    recent_history = get_consecutive_months(series, count=6)
    if recent_history.empty:
        raise HTTPException(
            status_code=422,
            detail=(
                "Six consecutive calendar months of history are required "
                "for this forecast."
            ),
        )
    recent_usage = recent_history["consumption"].dropna().clip(lower=0)
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
        "method": "six-consecutive-calendar-month rolling-mean baseline",
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


@app.get("/research/ml-forecast")
def research_ml_forecast(
    facility_id: str,
    product_id: str,
):
    """Predict stockout for the next observed calendar month using the trained model."""
    try:
        artifact = get_model_artifact()
    except (FileNotFoundError, ValueError, OSError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    series = get_series(facility_id, product_id)
    features = build_next_month_features(series, artifact["mappings"])
    if features.empty:
        raise HTTPException(
            status_code=422,
            detail=(
                "Six consecutive calendar months of valid history are required "
                "for a model prediction."
            ),
        )

    model = artifact["model"]
    probability = float(
        model.predict_proba(features[FEATURE_COLUMNS])[:, 1][0]
    )
    threshold = float(artifact["metadata"]["decision_threshold"])
    last_observed = pd.Timestamp(series["date"].max())
    return {
        "facility_id": facility_id,
        "product_id": product_id,
        "product_name": str(series.iloc[-1]["name1"]),
        "prediction_for_month": date_text(last_observed + pd.DateOffset(months=1)),
        "last_observed_date": date_text(last_observed),
        "stockout_probability": round(probability, 4),
        "stockout_risk": bool(probability >= threshold),
        "decision_threshold": threshold,
        "model_version": artifact["metadata"]["model_version"],
        "data_context": "Historical Sierra Leone research data; not live inventory.",
        "limitations": [
            "The score is a model estimate, not a calibrated operational probability.",
            "The model uses only six prior consecutive calendar months.",
        ],
    }


@app.get("/research/backtest")
def research_backtest(
    test_from: str = Query(default="2023-01-01"),
    test_to: str = Query(default="2023-11-01"),
):
    """Vectorized one-month-ahead evaluation using six prior monthly records."""
    cutoff = pd.to_datetime(test_from, errors="coerce")
    test_end = pd.to_datetime(test_to, errors="coerce")
    if pd.isna(cutoff) or pd.isna(test_end):
        raise HTTPException(
            status_code=400,
            detail=(
                "test_from and test_to must be valid dates such as "
                "2023-01-01."
            ),
        )
    if cutoff > test_end:
        raise HTTPException(
            status_code=400,
            detail="test_from must be on or before test_to.",
        )

    df = get_data().dropna(
        subset=[
            "hf_pk", "productID", "date", "stockout",
            "consumption", "closeBalance",
        ]
    ).copy()

    df["month_index"] = df["date"].dt.year * 12 + df["date"].dt.month
    group_keys = ["hf_pk", "productID"]
    grouped = df.groupby(group_keys, sort=False)

    df["_previous_stock"] = grouped["closeBalance"].shift(1)
    df["_previous_stockout"] = grouped["stockout"].shift(1)

    lag_columns = []
    mask = (
        df["date"].ge(cutoff)
        & df["date"].le(test_end)
        & df["stockout"].isin([0, 1])
    )

    # Require observations in each of the six immediately preceding months.
    for lag in range(1, 7):
        month_col = f"_month_lag_{lag}"
        consumption_col = f"_consumption_lag_{lag}"

        df[month_col] = grouped["month_index"].shift(lag)
        df[consumption_col] = grouped["consumption"].shift(lag)

        mask &= (df["month_index"] - df[month_col]).eq(lag)
        lag_columns.append(consumption_col)

    evaluation = df.loc[mask].copy()

    def calculate_metrics(actual, predicted):
        actual = actual.astype(bool)
        predicted = predicted.astype(bool)

        tp = int((actual & predicted).sum())
        fp = int((~actual & predicted).sum())
        tn = int((~actual & ~predicted).sum())
        fn = int((actual & ~predicted).sum())
        n = len(actual)

        precision = tp / (tp + fp) if tp + fp else 0.0
        recall = tp / (tp + fn) if tp + fn else 0.0
        f1 = (
            2 * precision * recall / (precision + recall)
            if precision + recall else 0.0
        )

        return {
            "n": n,
            "accuracy_percent": round((tp + tn) / n * 100, 2) if n else None,
            "precision_percent": round(precision * 100, 2),
            "recall_percent": round(recall * 100, 2),
            "f1_percent": round(f1 * 100, 2),
            "true_positives": tp,
            "false_positives": fp,
            "true_negatives": tn,
            "false_negatives": fn,
        }

    if evaluation.empty:
        return {
            "test_from": cutoff.strftime("%Y-%m-%d"),
            "test_to": test_end.strftime("%Y-%m-%d"),
            "evaluations": 0,
            "message": "No eligible consecutive monthly records in the test period.",
        }

    previous_six = evaluation[lag_columns].clip(lower=0)
    predicted_demand = previous_six.mean(axis=1)

    # Baseline A: previous closing stock minus mean consumption from prior months.
    rule_prediction = (
        evaluation["_previous_stock"].clip(lower=0) - predicted_demand
    ).le(0)

    # Baseline B: repeat the previous month's stockout status.
    persistence_prediction = evaluation["_previous_stockout"].eq(1)
    actual = evaluation["stockout"].eq(1)

    dates = sorted(evaluation["date"].dt.strftime("%Y-%m-%d").unique())
    series_count = evaluation[group_keys].drop_duplicates().shape[0]

    return {
        "dataset": "S2_Dhis2Data.csv",
        "data_context": "Historical Sierra Leone research data, not live stock.",
        "test_from": cutoff.strftime("%Y-%m-%d"),
        "test_to": dates[-1],
        "evaluation_months": dates,
        "eligible_facility_product_series": int(series_count),
        "evaluations": int(len(evaluation)),
        "actual_stockouts": int(actual.sum()),
        "actual_stockout_rate_percent": round(float(actual.mean() * 100), 2),
        "target_definition": "The source dataset's stockout flag equals 1.",
        "stock_based_rule": calculate_metrics(actual, rule_prediction),
        "previous_month_persistence_baseline": calculate_metrics(
            actual, persistence_prediction
        ),
        "methodology": (
            "One-month-ahead test using six prior consecutive monthly records. "
            "The final test window is bounded by test_from and test_to. "
            "No future receipt information is used in either prediction."
        ),
        "limitations": [
            "Only series with complete consecutive monthly observations are tested.",
            "Future receipts are not known to the forecasting rule.",
            "Results do not establish accuracy for live Indian inventory.",
        ],
    }
