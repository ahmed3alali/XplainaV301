import sys
sys.path.insert(0, "./backend")
import pandas as pd
from loader import load_all_data, get_state

def main():
    load_all_data()
    state = get_state()
    cf_preds = state.cf_predictions
    
    found = 0
    for u, series in cf_preds.items():
        n_pos = (series > 0).sum()
        if n_pos > 0:
            print(f"User {u} has {n_pos} non-zero CF predictions")
            print(series[series > 0])
            found += 1
            if found >= 2:
                break
    if found == 0:
        print("Never found a user with positive predictions???")

if __name__ == "__main__":
    main()
