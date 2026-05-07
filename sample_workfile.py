"""
sample_workfile.py

Calculates statistically representative sample sizes for s2_workfile_cleaned.parquet
(N = 1,675,978 rows) and writes samples to data/WildChatData/samples/.
"""

import math
from pyspark.sql import SparkSession

# ── Population ────────────────────────────────────────────────────────────────

N = 837_989


# ── Sample size formula ───────────────────────────────────────────────────────
# n  = (Z² × p × (1-p)) / e²          (infinite population)
# n' = n / (1 + (n-1) / N)            (finite population correction)

def sample_size(z: float, e: float, N: int = N, p: float = 0.5) -> int:
    n = (z**2 * p * (1 - p)) / e**2
    n_adj = n / (1 + (n - 1) / N)
    return math.ceil(n_adj)


configs = [
    {"label": "95% confidence / ±5% margin", "z": 1.96,  "e": 0.05},
    {"label": "95% confidence / ±1% margin", "z": 1.96,  "e": 0.01},
    {"label": "99% confidence / ±1% margin", "z": 2.576, "e": 0.01},
]

print(f"\nPopulation N = {N:,}\n")
print(f"{'Scenario':<35} {'Sample size':>12} {'% of N':>10}")
print("─" * 60)
for c in configs:
    n = sample_size(c["z"], c["e"])
    c["n"] = n
    print(f"{c['label']:<35} {n:>12,} {n/N*100:>9.2f}%")
print()


# ── Draw samples ──────────────────────────────────────────────────────────────

spark = SparkSession.builder.getOrCreate()
df = spark.read.parquet("data/WildChatData/s2_workfile_cleaned.parquet")

for c in configs:
    fraction = min(c["n"] / N * 1.05, 1.0)   # slight oversample, then trim to exact n
    label    = c["label"].replace(" ", "_").replace("/", "").replace("%", "pct").replace("±","")

    sample = df.sample(fraction=fraction, seed=42).limit(c["n"])

    half        = c["n"] // 2
    James   = sample.limit(half)
    Ethan   = sample.subtract(James)

    p1_path = f"data/sample_data/{label}_part1"
    p2_path = f"data/sample_data/{label}_part2"

    James.write.mode("overwrite").parquet(p1_path)
    Ethan.write.mode("overwrite").parquet(p2_path)
    print(f"Written {James.count():,} rows → {p1_path}")
    print(f"Written {Ethan.count():,} rows → {p2_path}")