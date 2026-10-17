import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

import pandas as pd

from ml_pipeline import (
    FEATURE_COLUMNS,
    build_feature_frame,
    build_next_month_features,
    load_artifact,
    split_by_date,
    train_and_evaluate,
)


def make_fixture() -> pd.DataFrame:
    rows = []
    for facility in [1, 2]:
        for product in [10, 11]:
            for month in pd.date_range("2019-06-01", "2023-11-01", freq="MS"):
                rows.append(
                    {
                        "hf_pk": facility,
                        "productID": product,
                        "date": month,
                        "stockout": int(month.month == 11 and product == 11),
                        "received": 5,
                        "consumption": 3,
                        "closeBalance": 20,
                        "openBalance": 18,
                        "facility_type": "CHC",
                        "district": "Western",
                        "normAvg": 3.0,
                        "normStd": 1.0,
                    }
                )
    return pd.DataFrame(rows)


class FeaturePipelineTests(unittest.TestCase):
    def test_features_use_only_prior_calendar_months(self):
        frame, _ = build_feature_frame(make_fixture())
        row = frame.loc[frame["date"].eq(pd.Timestamp("2020-01-01"))].iloc[0]
        self.assertEqual(row["consumption_lag_1"], 3)
        self.assertNotIn("stockout", FEATURE_COLUMNS)
        self.assertNotIn("date", FEATURE_COLUMNS)

    def test_missing_months_are_not_fabricated(self):
        fixture = make_fixture()
        fixture = fixture[
            ~(
                fixture["hf_pk"].eq(1)
                & fixture["productID"].eq(10)
                & fixture["date"].eq(pd.Timestamp("2021-06-01"))
            )
        ]
        frame, _ = build_feature_frame(fixture)
        series = frame.loc[
            (frame["hf_pk"] == 1) & (frame["productID"] == 10), "date"
        ]
        self.assertNotIn(pd.Timestamp("2021-07-01"), set(series))

    def test_split_is_chronological_and_non_overlapping(self):
        frame, _ = build_feature_frame(make_fixture())
        splits = split_by_date(frame)
        self.assertLessEqual(
            splits["train"]["date"].max(), pd.Timestamp("2021-12-01")
        )
        self.assertGreater(
            splits["validation"]["date"].min(), pd.Timestamp("2021-12-01")
        )
        self.assertGreater(
            splits["test"]["date"].min(), pd.Timestamp("2022-12-01")
        )
        self.assertTrue(
            set(splits["train"]["date"]).isdisjoint(
                splits["validation"]["date"]
            )
        )

    def test_next_month_features_have_no_target_month_values(self):
        _, mappings = build_feature_frame(make_fixture())
        fixture = make_fixture()
        series = fixture.loc[
            (fixture["hf_pk"] == 1) & (fixture["productID"] == 10)
        ]
        next_features = build_next_month_features(series, mappings)
        self.assertEqual(len(next_features), 1)
        self.assertEqual(next_features.iloc[0]["consumption_lag_1"], 3)
        self.assertNotIn("stockout", next_features.columns)

    def test_training_artifact_can_be_saved_and_loaded(self):
        with TemporaryDirectory() as directory:
            path = Path(directory) / "model.joblib"
            metadata = train_and_evaluate(make_fixture(), path)
            artifact = load_artifact(path)
            self.assertEqual(metadata["target_definition"], "source stockout flag equals 1")
            self.assertEqual(artifact["metadata"]["feature_columns"], FEATURE_COLUMNS)
            features, _ = build_feature_frame(
                make_fixture(), mappings=artifact["mappings"]
            )
            probabilities = artifact["model"].predict_proba(
                features[FEATURE_COLUMNS]
            )[:, 1]
            self.assertEqual(len(probabilities), len(features))
            self.assertTrue(((probabilities >= 0) & (probabilities <= 1)).all())


if __name__ == "__main__":
    unittest.main()
