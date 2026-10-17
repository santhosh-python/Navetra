import unittest

import pandas as pd

from main import get_consecutive_months


class ConsecutiveMonthTests(unittest.TestCase):
    def test_returns_only_a_complete_calendar_month_window(self):
        series = pd.DataFrame(
            {
                "date": pd.to_datetime(
                    [
                        "2023-01-01",
                        "2023-02-01",
                        "2023-04-01",
                        "2023-05-01",
                        "2023-06-01",
                        "2023-07-01",
                    ]
                ),
                "consumption": [1, 2, 4, 5, 6, 7],
            }
        )

        result = get_consecutive_months(series, count=6)

        self.assertTrue(result.empty)

    def test_returns_the_latest_complete_calendar_month_window(self):
        series = pd.DataFrame(
            {
                "date": pd.to_datetime(
                    [
                        "2022-11-01",
                        "2022-12-01",
                        "2023-01-01",
                        "2023-02-01",
                        "2023-03-01",
                        "2023-04-01",
                        "2023-05-01",
                    ]
                ),
                "consumption": [1, 2, 3, 4, 5, 6, 7],
            }
        )

        result = get_consecutive_months(series, count=6)

        self.assertEqual(
            result["date"].dt.strftime("%Y-%m-%d").tolist(),
            [
                "2022-12-01",
                "2023-01-01",
                "2023-02-01",
                "2023-03-01",
                "2023-04-01",
                "2023-05-01",
            ],
        )
