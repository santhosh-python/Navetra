from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd

from .ml_pipeline import DEFAULT_MODEL_PATH, train_and_evaluate

DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "processed" / "S2_Dhis2Data.csv"


def main() -> None:
    if not DATA_PATH.is_file():
        raise FileNotFoundError(f"Dataset not found at {DATA_PATH}.")
    digest = hashlib.sha256(DATA_PATH.read_bytes()).hexdigest()
    data = pd.read_csv(DATA_PATH)
    metadata = train_and_evaluate(data, DEFAULT_MODEL_PATH)
    metadata["training_timestamp_utc"] = datetime.now(timezone.utc).isoformat()
    metadata["dataset"] = {
        "path": str(DATA_PATH.relative_to(DATA_PATH.parents[2])),
        "sha256": digest,
        "rows": int(len(data)),
    }
    metadata_path = DEFAULT_MODEL_PATH.with_suffix(".json")
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    artifact = joblib.load(DEFAULT_MODEL_PATH)
    artifact["metadata"] = metadata
    joblib.dump(artifact, DEFAULT_MODEL_PATH)
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main()
