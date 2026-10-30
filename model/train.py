"""Train Lumen's placement model and export it as an additive points scorecard.

Data: Krooz/Campus_Recruitment_CSV on Hugging Face (CC0-1.0), 10,000 student records.
Run from the repo root:  model/.venv/bin/python model/train.py
Writes app/src/model/scorecard.json (read by the app) and model/metrics.json (for the report).
"""

import json
from datetime import date
from itertools import product
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression, LogisticRegressionCV
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    brier_score_loss,
    confusion_matrix,
    log_loss,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "model" / "data" / "raw_datasets"
SCORECARD_OUT = ROOT / "app" / "src" / "model" / "scorecard.json"
METRICS_OUT = ROOT / "model" / "metrics.json"

SEED = 42
TEST_SHARE = 0.2

COLUMNS = {
    "CGPA": "cgpa",
    "Internships": "internships",
    "Projects": "projects",
    "Workshops/Certifications": "certifications",
    "AptitudeTestScore": "aptitude",
    "SoftSkillsRating": "softSkills",
    "ExtracurricularActivities": "extracurricular",
    "PlacementTraining": "training",
    "SSC_Marks": "ssc",
    "HSC_Marks": "hsc",
}
YES_NO = ["extracurricular", "training"]
STEPS = {
    "cgpa": 0.1,
    "internships": 1,
    "projects": 1,
    "certifications": 1,
    "aptitude": 1,
    "softSkills": 0.1,
    "extracurricular": 1,
    "training": 1,
}

ALL_FEATURES = list(COLUMNS.values())
ACTIONABLE = ["cgpa", "internships", "projects", "certifications", "aptitude", "softSkills", "extracurricular", "training"]
# Seven factors keeps the explanation within Miller's 7 +/- 2. Which one to drop is decided by
# the cross-validated comparison below, not by taste.
CANDIDATE_SETS = {
    "all 10 columns": ALL_FEATURES,
    "8 factors a student can still act on": ACTIONABLE,
    **{f"7 factors, without {f}": [c for c in ACTIONABLE if c != f] for f in ACTIONABLE},
}

SCORE_MIDPOINT = 50
SCORE_HEADROOM = 48


def load() -> pd.DataFrame:
    frames = [pd.read_csv(DATA_DIR / f"{split}.csv") for split in ("train", "validation", "test")]
    raw = pd.concat(frames, ignore_index=True)
    df = raw.rename(columns={**COLUMNS, "PlacementStatus": "placed"})
    for col in YES_NO:
        df[col] = (df[col] == "Yes").astype(int)
    df["placed"] = (df["placed"] == "Placed").astype(int)
    return df


def pipeline(c: float | None = None):
    model = LogisticRegression(C=c, max_iter=2000) if c else LogisticRegressionCV(
        Cs=np.logspace(-3, 2, 12),
        l1_ratios=(0.0,),
        cv=5,
        scoring="neg_log_loss",
        max_iter=2000,
        use_legacy_attributes=False,
    )
    return make_pipeline(StandardScaler(), model)


def compare_feature_sets(X: pd.DataFrame, y: pd.Series) -> list[dict]:
    folds = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    rows = []
    for name, cols in CANDIDATE_SETS.items():
        cv = cross_validate(
            pipeline(c=1.0), X[cols], y, cv=folds, scoring=["accuracy", "roc_auc", "neg_log_loss"]
        )
        rows.append({
            "set": name,
            "features": cols,
            "accuracy": round(float(cv["test_accuracy"].mean()), 4),
            "roc_auc": round(float(cv["test_roc_auc"].mean()), 4),
            "log_loss": round(float(-cv["test_neg_log_loss"].mean()), 4),
        })
    return rows


def calibration(y_true: np.ndarray, p: np.ndarray, bins: int = 5) -> list[dict]:
    edges = np.linspace(0, 1, bins + 1)
    out = []
    for lo, hi in zip(edges[:-1], edges[1:]):
        mask = (p >= lo) & ((p < hi) if hi < 1 else (p <= hi))
        if mask.sum():
            out.append({
                "range": [round(float(lo), 2), round(float(hi), 2)],
                "count": int(mask.sum()),
                "predicted": round(float(p[mask].mean()), 3),
                "observed": round(float(y_true[mask].mean()), 3),
            })
    return out


def main() -> None:
    df = load()
    rows_raw = len(df)
    df = df.drop_duplicates().reset_index(drop=True)
    y = df["placed"]

    X_train, X_test, y_train, y_test = train_test_split(
        df[ALL_FEATURES], y, test_size=TEST_SHARE, stratify=y, random_state=SEED
    )

    comparison = compare_feature_sets(X_train, y_train)
    seven = [r for r in comparison if r["set"].startswith("7 factors")]
    chosen = min(seven, key=lambda r: r["log_loss"])
    features = chosen["features"]

    model = pipeline().fit(X_train[features], y_train)
    scaler, clf = model[0], model[-1]
    p_test = model.predict_proba(X_test[features])[:, 1]
    y_true = y_test.to_numpy()

    weights = clf.coef_[0] / scaler.scale_
    intercept = float(clf.intercept_[0] - np.sum(clf.coef_[0] * scaler.mean_ / scaler.scale_))

    lo = {f: float(df[f].min()) for f in features}
    hi = {f: float(df[f].max()) for f in features}
    mean = {f: float(X_train[f].mean()) for f in features}

    corner_logits = [
        intercept + sum(w * (hi[f] if pick else lo[f]) for f, w, pick in zip(features, weights, picks))
        for picks in product([0, 1], repeat=len(features))
    ]
    points_per_logit = SCORE_HEADROOM / max(abs(min(corner_logits)), abs(max(corner_logits)))
    reference_logit = intercept + sum(w * mean[f] for f, w in zip(features, weights))

    metrics = {
        "dataset": {
            "rows_downloaded": rows_raw,
            "rows_after_dedup": len(df),
            "train_rows": len(X_train),
            "test_rows": len(X_test),
            "placed_share": round(float(y.mean()), 4),
        },
        "feature_set_comparison_cv5": comparison,
        "chosen_set": chosen["set"],
        "chosen_C": round(float(np.ravel(clf.C_)[0]), 5),
        "test": {
            "accuracy": round(accuracy_score(y_true, p_test >= 0.5), 4),
            "balanced_accuracy": round(balanced_accuracy_score(y_true, p_test >= 0.5), 4),
            "majority_class_accuracy": round(float(max(y_true.mean(), 1 - y_true.mean())), 4),
            "roc_auc": round(roc_auc_score(y_true, p_test), 4),
            "brier": round(brier_score_loss(y_true, p_test), 4),
            "log_loss": round(log_loss(y_true, p_test), 4),
            "confusion_matrix": confusion_matrix(y_true, p_test >= 0.5).tolist(),
            "calibration": calibration(y_true, p_test),
        },
        "standardized_coefficients": {f: round(float(c), 4) for f, c in zip(features, clf.coef_[0])},
    }

    scorecard = {
        "generatedBy": "model/train.py",
        "generatedOn": date.today().isoformat(),
        "dataset": {
            "name": "Campus Recruitment (Krooz/Campus_Recruitment_CSV)",
            "url": "https://huggingface.co/datasets/Krooz/Campus_Recruitment_CSV",
            "license": "CC0-1.0",
            "students": len(df),
            "placedShare": metrics["dataset"]["placed_share"],
        },
        "model": {
            "type": "logistic regression",
            "intercept": intercept,
            "pointsPerLogit": points_per_logit,
            "scoreMidpoint": SCORE_MIDPOINT,
            "referenceLogit": reference_logit,
        },
        "features": [
            {
                "key": f,
                "weight": float(w),
                "min": lo[f],
                "max": hi[f],
                "step": STEPS[f],
                "mean": round(mean[f], 4),
            }
            for f, w in zip(features, weights)
        ],
        "excluded": [f for f in ALL_FEATURES if f not in features],
        "evaluation": {
            "testStudents": len(X_test),
            "accuracy": metrics["test"]["accuracy"],
            "rocAuc": metrics["test"]["roc_auc"],
            "allColumnsAccuracy": next(r["accuracy"] for r in comparison if r["set"] == "all 10 columns"),
            "chosenSetAccuracy": chosen["accuracy"],
        },
    }

    SCORECARD_OUT.parent.mkdir(parents=True, exist_ok=True)
    SCORECARD_OUT.write_text(json.dumps(scorecard, indent=2) + "\n")
    METRICS_OUT.write_text(json.dumps(metrics, indent=2) + "\n")

    print(f"rows {rows_raw} -> {len(df)} after removing duplicates; train {len(X_train)}, test {len(X_test)}")
    print("\nfeature sets (5-fold CV on the training split):")
    for r in comparison:
        print(f"  {r['set']:45s} acc {r['accuracy']:.4f}  auc {r['roc_auc']:.4f}  logloss {r['log_loss']:.4f}")
    print(f"\nchosen: {chosen['set']} (C={metrics['chosen_C']})")
    print("test:", {k: v for k, v in metrics["test"].items() if k not in ("calibration",)})
    print("calibration:", metrics["test"]["calibration"])
    print("weights per unit:", {f: round(float(w), 4) for f, w in zip(features, weights)})
    print(f"points per logit {points_per_logit:.3f}; average student score "
          f"{SCORE_MIDPOINT + points_per_logit * reference_logit:.1f}")



if __name__ == "__main__":
    main()
