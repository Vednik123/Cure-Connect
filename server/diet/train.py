"""
train.py
--------
Run this script when you want to (re)train your diet recommendation models.

What it does:
- Loads local CSV dataset
- Detects calorie/protein/carbs/fat columns
- Preprocesses (impute, one-hot encode, etc.)
- Trains one LightGBM regressor per target
- Evaluates (MAE, RMSE, R2) on test set
- OVERWRITES old models with new ones
- Saves:
    - models: diet_model/<target>.pkl
    - preprocess bundle: diet_model/preprocess.pkl
    - logs:
        - diet_model/train_log.jsonl   (history)
        - diet_model/last_run.json     (latest)
"""

import os
import re
import json
import math
from datetime import datetime
import warnings

warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.impute import SimpleImputer
from category_encoders import OneHotEncoder
from lightgbm import LGBMRegressor
import pickle

# ===========================
# CONFIG
# ===========================

CSV_PATH = "Personalized_Diet_Recommendations.csv"  # your dataset in same folder
MODEL_DIR = "diet_model"


# ===========================
# HELPERS
# ===========================

def load_dataset(csv_path: str) -> pd.DataFrame:
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset not found at: {csv_path}")
    df = pd.read_csv(csv_path)
    print(f"[INFO] Loaded dataset with shape: {df.shape}")
    return df


def detect_targets(df: pd.DataFrame):
    """Try to find calories/protein/carbs/fat columns by name pattern."""
    def find_col(cands):
        patt = re.compile("|".join([re.escape(x) for x in cands]), re.I)
        for c in df.columns:
            if patt.search(c):
                return c
        return None

    target_map = {
        "calories": find_col(["calorie", "kcal", "calories"]),
        "protein":  find_col(["protein", "prot"]),
        "carbs":    find_col(["carb", "carbohydrate"]),
        "fat":      find_col(["fat", "fats", "lipid"]),
    }

    print("[INFO] Detected target columns:", target_map)

    # If needed, override manually here:
    # target_map["calories"] = "Calories"
    # target_map["protein"]  = "Protein"
    # target_map["carbs"]    = "Carbs"
    # target_map["fat"]      = "Fats"

    targets = [target_map[k] for k in ["calories", "protein", "carbs", "fat"] if target_map[k] is not None]
    if not targets:
        raise ValueError("No target columns detected. Please set target_map[...] manually in detect_targets().")

    return targets


def preprocess(df: pd.DataFrame, targets):
    """Build X/Y, impute, encode, split."""
    # Drop ID-like columns
    drop_like = [c for c in df.columns if c.lower() in ["id", "user_id", "index", "seqn"]]
    X = df.drop(columns=list(set(targets + drop_like)), errors="ignore")
    Y = df[targets].copy()

    # Drop very high-cardinality free-text columns
    too_many_uniques = [c for c in X.columns if X[c].dtype == "object" and X[c].nunique() > 50]
    if too_many_uniques:
        print("[INFO] Dropping high-cardinality columns:", too_many_uniques)
    X = X.drop(columns=too_many_uniques, errors="ignore")

    # Split numeric / categorical
    num_cols = [c for c in X.columns if pd.api.types.is_numeric_dtype(X[c])]
    cat_cols = [c for c in X.columns if c not in num_cols]

    print("[INFO] Numeric cols:", num_cols)
    print("[INFO] Categorical cols:", cat_cols)

    # Imputers
    num_imputer = SimpleImputer(strategy="median")
    cat_imputer = SimpleImputer(strategy="most_frequent")

    X_num = pd.DataFrame(num_imputer.fit_transform(X[num_cols]), columns=num_cols, index=X.index)

    if cat_cols:
        X_cat_raw = pd.DataFrame(cat_imputer.fit_transform(X[cat_cols]), columns=cat_cols, index=X.index)
        ohe = OneHotEncoder(use_cat_names=True, handle_missing="value", handle_unknown="ignore")
        X_cat_ohe = ohe.fit_transform(X_cat_raw)
    else:
        X_cat_raw = pd.DataFrame(index=X.index)
        X_cat_ohe = pd.DataFrame(index=X.index)
        ohe = None

    X_proc = pd.concat([X_num, X_cat_ohe], axis=1)

    # Clip extreme outliers in targets for stability
    Yc = Y.copy()
    for c in Yc.columns:
        q1, q99 = Yc[c].quantile(0.01), Yc[c].quantile(0.99)
        Yc[c] = Yc[c].clip(lower=q1, upper=q99)

    X_train, X_test, Y_train, Y_test = train_test_split(X_proc, Yc, test_size=0.2, random_state=42)

    print(f"[INFO] Train: {X_train.shape}, Test: {X_test.shape}")

    return (X_train, X_test, Y_train, Y_test,
            num_cols, cat_cols, num_imputer, cat_imputer, ohe, X_proc)


def train_models(X_train: pd.DataFrame, Y_train: pd.DataFrame):
    """Train one LGBMRegressor per target with fixed params."""
    models = {}

    base_params = dict(
        objective="regression",
        n_estimators=800,
        num_leaves=63,
        learning_rate=0.05,
        subsample=0.9,
        colsample_bytree=0.9,
        random_state=42,
    )

    for t in Y_train.columns:
        print(f"\n[TRAIN] Target: {t}")
        reg = LGBMRegressor(**base_params)
        reg.fit(X_train, Y_train[t])
        models[t] = reg
        print(f"[TRAIN] Finished training for {t}")

    return models


def evaluate_regression(models, X_test, Y_test):
    """
    Compute MAE, RMSE, R2 for each target and return as dict.
    Also prints a small table.
    """
    print("\n=== Regression metrics on test set ===")
    rows = []
    metrics = {}

    for t, model in models.items():
        y_true = Y_test[t].values
        y_pred = model.predict(X_test)

        mae = mean_absolute_error(y_true, y_pred)
        mse = mean_squared_error(y_true, y_pred)
        rmse = math.sqrt(mse)
        r2 = r2_score(y_true, y_pred)

        rows.append([t, mae, rmse, r2])
        metrics[t] = {
            "MAE": float(mae),
            "RMSE": float(rmse),
            "R2": float(r2),
        }

    dfm = pd.DataFrame(rows, columns=["Target", "MAE", "RMSE", "R2"])
    print(dfm.to_string(index=False))
    return metrics


def save_training_artifacts(models,
                            metrics,
                            targets,
                            num_cols,
                            cat_cols,
                            num_imputer,
                            cat_imputer,
                            ohe,
                            X_proc,
                            model_dir=MODEL_DIR):
    """
    Overwrite models + save preprocessors + write logs.
    """
    os.makedirs(model_dir, exist_ok=True)

    # 1) Save models (overwrite)
    for t, m in models.items():
        safe_name = t.replace(" ", "_")
        with open(os.path.join(model_dir, f"{safe_name}.pkl"), "wb") as f:
            pickle.dump(m, f)

    # 2) Preprocessing bundle
    preproc_bundle = {
        "num_cols": num_cols,
        "cat_cols": cat_cols,
        "X_columns": list(X_proc.columns),
        "num_imputer": num_imputer,
        "cat_imputer": cat_imputer,
        "ohe": ohe,
    }
    with open(os.path.join(model_dir, "preprocess.pkl"), "wb") as f:
        pickle.dump(preproc_bundle, f)

    # 3) Run info
    run_info = {
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "targets": list(targets),
        "metrics": metrics,
    }

    # 4) Append to JSONL log
    log_path = os.path.join(model_dir, "train_log.jsonl")
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(run_info) + "\n")

    # 5) Save last_run snapshot
    last_run_path = os.path.join(model_dir, "last_run.json")
    with open(last_run_path, "w", encoding="utf-8") as f:
        json.dump(run_info, f, indent=2)

    print(f"\n[INFO] Models & preprocessors saved to: {model_dir}")
    print(f"[INFO] Appended log to: {log_path}")
    print(f"[INFO] Last run summary: {last_run_path}")


# ===========================
# MAIN
# ===========================

def main():
    df = load_dataset(CSV_PATH)
    targets = detect_targets(df)

    (X_train, X_test, Y_train, Y_test,
     num_cols, cat_cols, num_imputer, cat_imputer, ohe, X_proc) = preprocess(df, targets)

    models = train_models(X_train, Y_train)
    metrics = evaluate_regression(models, X_test, Y_test)

    save_training_artifacts(
        models=models,
        metrics=metrics,
        targets=targets,
        num_cols=num_cols,
        cat_cols=cat_cols,
        num_imputer=num_imputer,
        cat_imputer=cat_imputer,
        ohe=ohe,
        X_proc=X_proc
    )

    print("\n[INFO] Training + saving complete.")


if __name__ == "__main__":
    main()
