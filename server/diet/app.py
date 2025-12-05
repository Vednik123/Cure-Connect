from flask import Flask, request, jsonify, send_from_directory
import pickle, pandas as pd, numpy as np, json, os

app = Flask(__name__)

MODEL_DIR = "diet_model"

# Load preprocess
with open(f"{MODEL_DIR}/preprocess.pkl", "rb") as f:
    preproc = pickle.load(f)

num_cols    = preproc["num_cols"]
cat_cols    = preproc["cat_cols"]
num_imputer = preproc["num_imputer"]
cat_imputer = preproc["cat_imputer"]
ohe         = preproc["ohe"]
X_columns   = preproc["X_columns"]

# Target list
with open(f"{MODEL_DIR}/last_run.json", "r") as f:
    targets = json.load(f)["targets"]

# Load models
models = {}
for t in targets:
    safe = t.replace(" ", "_")
    with open(f"{MODEL_DIR}/{safe}.pkl", "rb") as f:
        models[t] = pickle.load(f)


def predict_requirements(user):
    # Auto compute BMI if needed
    if "Height_cm" in user and "Weight_kg" in user and "BMI" in num_cols:
        h = user["Height_cm"] / 100
        user["BMI"] = user["Weight_kg"] / (h*h)

    x = pd.DataFrame([user])

    # numeric
    x_num = pd.DataFrame(
        num_imputer.transform(x.reindex(columns=num_cols, fill_value=np.nan)),
        columns=num_cols
    )

    # categorical
    x_cat = pd.DataFrame(
        cat_imputer.transform(x.reindex(columns=cat_cols, fill_value="missing")),
        columns=cat_cols
    )
    x_cat = ohe.transform(x_cat)

    x_proc = pd.concat([x_num, x_cat], axis=1)

    # align with training columns
    for col in X_columns:
        if col not in x_proc:
            x_proc[col] = 0
    x_proc = x_proc[X_columns]

    # predictions
    out = {}
    for t, m in models.items():
        out[t] = float(m.predict(x_proc)[0])

    return out


@app.route("/")
def home():
    return send_from_directory(".", "index.html")


@app.route("/predict", methods=["POST"])
def predict_api():
    try:
        user = request.json
        preds = predict_requirements(user)
        return jsonify(preds)
    except Exception as e:
        print("Error:", e)
        return jsonify({"error": str(e)}), 500
    
@app.route("/diet-with-model", methods=["GET"]) 
def diet_with_model():
    try:
        # Example fixed sample input or default parameters
        sample_user = {
            "Age": 30,
            "Gender": "Male",
            "Height_cm": 170,
            "Weight_kg": 70,
            "Activity_Level": "Moderate"
        }

        preds = predict_requirements(sample_user)
        return jsonify({"reply": preds})

    except Exception as e:
        print("Error:", e)
        return jsonify({"error": str(e)}), 500



if __name__ == "__main__":
    print("Running at http://localhost:5001")
    app.run(port=5001, debug=True)


    
