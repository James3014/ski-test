import json

def create_quiz_db():
    try:
        with open('q.md', 'r', encoding='utf-8') as f:
            casi_raw_data = f.read().strip()

        with open('sa-kamui.md', 'r', encoding='utf-8') as f:
            kamui_raw_data = f.read().strip()
        
        with open('sa-karuizawa.md', 'r', encoding='utf-8') as f:
            karuizawa_raw_data = f.read().strip()

        # CASI data: q.md now contains only data rows, so we add the header and separator
        casi_header = "| 題號 | 題目 | A | B | C | D | 正解 | 分類 | CASI 等級 | 難度 | 解析 |\n|---|---|---|---|---|---|---|---|---|---|---|"
        casi_data = casi_header + '\n' + casi_raw_data

        # Resort data: sa-kamui.md and sa-karuizawa.md now contain only data rows
        # We add the resort header and separator once, then append all data
        resort_header = "| 題號 | 題目 | A | B | C | D | 正解 | 雪場 | 分類 | 難度 | 解析 |\n|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|"
        resort_data = resort_header + '\n' + kamui_raw_data + '\n' + karuizawa_raw_data

        database = {
            "casi": casi_data,
            "resort": resort_data
        }

        with open('quiz_database.json', 'w', encoding='utf-8') as f:
            json.dump(database, f, ensure_ascii=False, indent=4)
            
        print("Successfully created quiz_database.json")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == '__main__':
    create_quiz_db()
