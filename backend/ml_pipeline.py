from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)

TARGET_COLUMN = "stockout"
LAG_COUNT = 6
MODEL_VERSION = "navetra-hgb-v1"
DEFAULT_MODEL_PATH = Path(__file__).resolve().parent / "artifacts" / "stockout_model.joblib"

NUMERIC_FEATURES = [
    *[f"consumption_lag_{lag}" for lag in range(1, LAG_COUNT + 1)],
    *[f"received_lag_{lag}" for lag in range(1, LAG_COUNT + 1)],
    *[f"close_balance_lag_{lag}" for lag in range(1, LAG_COUNT + 1)],
    *[f"open_balance_lag_{lag}" for lag in range(1, LAG_COUNT + 1)],
    *[f"stockout_lag_{lag}" for lag in range(1, LAG_COUNT + 1)],
    "consumption_mean_3",
    "consumption_mean_6",
    "consumption_std_6",
    "close_balance_mean_3",
    "close_balance_min_6",
    "close_balance_trend",
    "stockout_count_6",
    "month_sin",
    "month_cos",
]
CATEGORICAL_FEATURES = ["facility_type", "district", "productID"]
FEATURE_COLUMNS = NUMERIC_FEATURES + CATEGORICAL_FEATURES


@dataclass(frozen=True)
class FeatureMappings:
    facility_type: dict[str, int]
    district: dict[str, int]
    productID: dict[str, int]


def _month_index(dates: pd.Series) -> pd.Series:
    return dates.dt.year * 12 + dates.dt.month


def _encode(series: pd.Series, mapping: dict[str, int]) -> pd.Series:
    return series.astype("string").map(mapping).fillna(-1).astype(float)


def _fit_mappings(frame: pd.DataFrame) -> FeatureMappings:
    return FeatureMappings(
        facility_type={
            value: index
            for index, value in enumerate(sorted(frame["facility_type"].astype(str).unique()))
        },
        district={
            value: index
            for index, value in enumerate(sorted(frame["district"].astype(str).unique()))
        },
        productID={
            value: index
            for index, value in enumerate(sorted(frame["productID"].astype(str).unique()))
        },
    )


def build_feature_frame(
    data: pd.DataFrame,
    mappings: FeatureMappings | None = None,
) -> tuple[pd.DataFrame, FeatureMappings]:
    required = {
        "hf_pk", "productID", "date", TARGET_COLUMN, "received",
        "consumption", "closeBalance", "openBalance", "facility_type",
        "district",
    }
    missing = sorted(required - set(data.columns))
    if missing:
        raise ValueError(f"Missing feature columns: {missing}")

    frame = data.copy()
    frame["date"] = pd.to_datetime(frame["date"], format="mixed", errors="coerce")
    frame = frame.dropna(subset=list(required)).sort_values(
        ["hf_pk", "productID", "date"]
    ).reset_index(drop=True)
    frame["_month_index"] = _month_index(frame["date"])
    groups = frame.groupby(["hf_pk", "productID"], sort=False)

    lag_names = {
        "consumption": "consumption",
        "received": "received",
        "closeBalance": "close_balance",
        "openBalance": "open_balance",
        TARGET_COLUMN: "stockout",
    }
    for source, feature_name in lag_names.items():
        for lag in range(1, LAG_COUNT + 1):
            frame[f"{feature_name}_lag_{lag}"] = groups[source].shift(lag)

    frame["consumption_mean_3"] = frame[
        ["consumption_lag_1", "consumption_lag_2", "consumption_lag_3"]
    ].mean(axis=1)
    consumption_lags = [f"consumption_lag_{lag}" for lag in range(1, LAG_COUNT + 1)]
    close_lags = [f"close_balance_lag_{lag}" for lag in range(1, LAG_COUNT + 1)]
    frame["consumption_mean_6"] = frame[consumption_lags].mean(axis=1)
    frame["consumption_std_6"] = frame[consumption_lags].std(axis=1).fillna(0)
    frame["close_balance_mean_3"] = frame[close_lags[:3]].mean(axis=1)
    frame["close_balance_min_6"] = frame[close_lags].min(axis=1)
    frame["close_balance_trend"] = frame["close_balance_lag_1"] - frame["close_balance_lag_6"]
    frame["stockout_count_6"] = frame[
        [f"stockout_lag_{lag}" for lag in range(1, LAG_COUNT + 1)]
    ].sum(axis=1)
    frame["month_sin"] = np.sin(2 * np.pi * frame["date"].dt.month / 12)
    frame["month_cos"] = np.cos(2 * np.pi * frame["date"].dt.month / 12)

    complete_history = pd.Series(True, index=frame.index)
    for lag in range(1, LAG_COUNT + 1):
        complete_history &= (
            frame["_month_index"] - groups["_month_index"].shift(lag)
        ).eq(lag)
    frame = frame.loc[complete_history].copy()

    mappings = mappings or _fit_mappings(frame)
    for column in CATEGORICAL_FEATURES:
        frame[column] = _encode(frame[column], getattr(mappings, column))

    frame = frame.dropna(subset=NUMERIC_FEATURES)
    return frame, mappings


def build_next_month_features(
    series: pd.DataFrame,
    mappings: FeatureMappings,
) -> pd.DataFrame:
    """Build one next-month feature row from the latest six observed months."""
    frame = series.copy()
    frame["date"] = pd.to_datetime(frame["date"], format="mixed", errors="coerce")
    frame = frame.dropna(
        subset=[
            "date", "received", "consumption", "closeBalance", "openBalance",
            "facility_type", "district", "productID",
        ]
    ).sort_values("date")
    if len(frame) < LAG_COUNT:
        return pd.DataFrame(columns=FEATURE_COLUMNS)
    history = frame.tail(LAG_COUNT)
    month_index = _month_index(history["date"])
    if not month_index.diff().iloc[1:].eq(1).all():
        return pd.DataFrame(columns=FEATURE_COLUMNS)

    row: dict[str, Any] = {}
    for lag in range(1, LAG_COUNT + 1):
        source = history.iloc[-lag]
        row[f"consumption_lag_{lag}"] = source["consumption"]
        row[f"received_lag_{lag}"] = source["received"]
        row[f"close_balance_lag_{lag}"] = source["closeBalance"]
        row[f"open_balance_lag_{lag}"] = source["openBalance"]
        row[f"stockout_lag_{lag}"] = source[TARGET_COLUMN]
    consumption_lags = [row[f"consumption_lag_{lag}"] for lag in range(1, LAG_COUNT + 1)]
    close_lags = [row[f"close_balance_lag_{lag}"] for lag in range(1, LAG_COUNT + 1)]
    row["consumption_mean_3"] = float(np.mean(consumption_lags[:3]))
    row["consumption_mean_6"] = float(np.mean(consumption_lags))
    row["consumption_std_6"] = float(np.std(consumption_lags, ddof=1))
    row["close_balance_mean_3"] = float(np.mean(close_lags[:3]))
    row["close_balance_min_6"] = float(np.min(close_lags))
    row["close_balance_trend"] = close_lags[0] - close_lags[-1]
    row["stockout_count_6"] = float(
        sum(row[f"stockout_lag_{lag}"] for lag in range(1, LAG_COUNT + 1))
    )
    next_month = history.iloc[-1]["date"] + pd.DateOffset(months=1)
    row["month_sin"] = np.sin(2 * np.pi * next_month.month / 12)
    row["month_cos"] = np.cos(2 * np.pi * next_month.month / 12)
    row["facility_type"] = _encode(
        pd.Series([history.iloc[-1]["facility_type"]]),
        mappings.facility_type,
    ).iloc[0]
    row["district"] = _encode(
        pd.Series([history.iloc[-1]["district"]]),
        mappings.district,
    ).iloc[0]
    row["productID"] = _encode(
        pd.Series([history.iloc[-1]["productID"]]),
        mappings.productID,
    ).iloc[0]
    return pd.DataFrame([row], columns=FEATURE_COLUMNS)


def split_by_date(
    frame: pd.DataFrame,
    train_end: str = "2021-12-01",
    validation_end: str = "2022-12-01",
    test_end: str = "2023-11-01",
) -> dict[str, pd.DataFrame]:
    dates = pd.to_datetime(frame["date"])
    train_limit = pd.Timestamp(train_end)
    validation_limit = pd.Timestamp(validation_end)
    test_limit = pd.Timestamp(test_end)
    if not (train_limit < validation_limit < test_limit):
        raise ValueError("Chronological split dates must be strictly increasing.")

    splits = {
        "train": frame.loc[dates.le(train_limit)].copy(),
        "validation": frame.loc[
            dates.gt(train_limit) & dates.le(validation_limit)
        ].copy(),
        "test": frame.loc[
            dates.gt(validation_limit) & dates.le(test_limit)
        ].copy(),
    }
    if any(part.empty for part in splits.values()):
        raise ValueError("Chronological split produced an empty partition.")
    return splits


def make_model() -> HistGradientBoostingClassifier:
    return HistGradientBoostingClassifier(
        max_iter=160,
        learning_rate=0.08,
        max_leaf_nodes=31,
        l2_regularization=1.0,
        random_state=42,
    )


def choose_threshold(actual: pd.Series, probabilities: np.ndarray) -> float:
    candidates = np.arange(0.10, 0.91, 0.01)
    scores = [
        f1_score(actual, probabilities >= threshold, zero_division=0)
        for threshold in candidates
    ]
    return float(candidates[int(np.argmax(scores))])


def calculate_metrics(
    actual: pd.Series,
    probabilities: np.ndarray,
    threshold: float,
) -> dict[str, Any]:
    predicted = probabilities >= threshold
    matrix = confusion_matrix(actual, predicted, labels=[0, 1])
    result: dict[str, Any] = {
        "n": int(len(actual)),
        "stockout_prevalence_percent": round(float(actual.mean() * 100), 2),
        "accuracy_percent": round(float(accuracy_score(actual, predicted) * 100), 2),
        "precision_percent": round(float(precision_score(actual, predicted, zero_division=0) * 100), 2),
        "recall_percent": round(float(recall_score(actual, predicted, zero_division=0) * 100), 2),
        "f1_percent": round(float(f1_score(actual, predicted, zero_division=0) * 100), 2),
        "confusion_matrix": matrix.tolist(),
        "threshold": threshold,
    }
    if actual.nunique() > 1:
        result["average_precision_percent"] = round(
            float(average_precision_score(actual, probabilities) * 100), 2
        )
        result["roc_auc_percent"] = round(
            float(roc_auc_score(actual, probabilities) * 100), 2
        )
    else:
        result["average_precision_percent"] = None
        result["roc_auc_percent"] = None
    return result


def train_and_evaluate(
    data: pd.DataFrame,
    model_path: Path = DEFAULT_MODEL_PATH,
) -> dict[str, Any]:
    frame, mappings = build_feature_frame(data)
    splits = split_by_date(frame)
    model = make_model()
    x_train = splits["train"][FEATURE_COLUMNS]
    y_train = splits["train"][TARGET_COLUMN].astype(int)
    model.fit(x_train, y_train)

    validation_probabilities = model.predict_proba(
        splits["validation"][FEATURE_COLUMNS]
    )[:, 1]
    threshold = choose_threshold(
        splits["validation"][TARGET_COLUMN].astype(int),
        validation_probabilities,
    )
    metrics = {
        partition: calculate_metrics(
            split[TARGET_COLUMN].astype(int),
            model.predict_proba(split[FEATURE_COLUMNS])[:, 1],
            threshold,
        )
        for partition, split in splits.items()
    }
    metadata = {
        "model_version": MODEL_VERSION,
        "target_definition": "source stockout flag equals 1",
        "feature_columns": FEATURE_COLUMNS,
        "numeric_features": NUMERIC_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "train_dates": [str(splits["train"]["date"].min().date()), str(splits["train"]["date"].max().date())],
        "validation_dates": [str(splits["validation"]["date"].min().date()), str(splits["validation"]["date"].max().date())],
        "test_dates": [str(splits["test"]["date"].min().date()), str(splits["test"]["date"].max().date())],
        "split_counts": {name: int(len(split)) for name, split in splits.items()},
        "split_series_counts": {
            name: int(split[["hf_pk", "productID"]].drop_duplicates().shape[0])
            for name, split in splits.items()
        },
        "decision_threshold": threshold,
        "metrics": metrics,
        "limitations": [
            "Only rows with six prior consecutive calendar months are eligible.",
            "The source quarter column is excluded because November 2023 labels are inconsistent.",
            "This is a historical Sierra Leone dataset, not live Indian inventory.",
        ],
    }
    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {"model": model, "mappings": mappings, "metadata": metadata},
        model_path,
    )
    return metadata


def load_artifact(model_path: Path = DEFAULT_MODEL_PATH) -> dict[str, Any]:
    if not model_path.is_file():
        raise FileNotFoundError(
            f"ML model artifact is missing at {model_path}. Run python -m backend.train_model."
        )
    artifact = joblib.load(model_path)
    if not isinstance(artifact, dict) or not {"model", "mappings", "metadata"} <= artifact.keys():
        raise ValueError("ML model artifact has an invalid structure.")
    return artifact
