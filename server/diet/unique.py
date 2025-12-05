# Import necessary libraries
import pandas as pd

# -----------------------------
# Load the dataset
# -----------------------------
# Replace 'data.csv' with your actual dataset filename
df = pd.read_csv("Personalized_Diet_Recommendations.csv")

# -----------------------------
# Display unique values
# -----------------------------
print("Unique values in Gender:")
print(df["Gender"].unique(), "\n")

print("Unique values in DietPreference:")
print(df["Dietary_Habits"].unique(), "\n")



print("Unique values in ChronicDisease:")
print(df["Chronic_Disease"].unique(), "\n")
