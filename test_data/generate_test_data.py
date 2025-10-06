import csv
import random
import requests
import os
from bs4 import BeautifulSoup

# Configuration
OUTPUT_DIR = os.path.dirname(__file__)
CSV_FILE_PATH = os.path.join(OUTPUT_DIR, "test_data.csv")
TARGET_ROWS_PER_DOMAIN = 40

GLOSSARIES = {
    "Physics": "https://en.wikipedia.org/wiki/Glossary_of_physics",
    "Biology": "https://en.wikipedia.org/wiki/Glossary_of_biology",
    "Chemistry": "https://en.wikipedia.org/wiki/Glossary_of_chemistry_terms",
    "Computer Science": "https://en.wikipedia.org/wiki/Glossary_of_computer_science",
    "Geology": "https://en.wikipedia.org/wiki/Glossary_of_geology",
    "Calculus": "https://en.wikipedia.org/wiki/Glossary_of_calculus",
    "Graph Theory": "https://en.wikipedia.org/wiki/Glossary_of_graph_theory",
    "Probability and Statistics": "https://en.wikipedia.org/wiki/Glossary_of_probability_and_statistics",
    "Linear Algebra": "https://en.wikipedia.org/wiki/Glossary_of_linear_algebra",
}

AUTHORS = [
    "Evelyn Reed", "Kenji Tanaka", "Aisha Khan", "Samuel Greene",
    "Maria Flores", "Ben Carter", "Sofia Rossi", "Leo Schmidt",
    "Chloe Dubois", "Ivan Petrov"
]

def scrape_glossary(domain, url):
    """Scrapes a single Wikipedia glossary page for terms and definitions."""
    print(f"Scraping {domain} glossary from {url}...")
    try:
        response = requests.get(url, headers={'User-Agent': 'TermageddonTestDataGenerator/1.0'})
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        
        content = soup.find('div', {'class': 'mw-parser-output'})
        if not content:
            print(f"Warning: Could not find content div for {domain}")
            return []

        data = []
        # Find all definition terms (<dt>)
        for dt in content.find_all('dt'):
            term = dt.get_text(strip=True)
            # The definition is in the immediately following <dd> tag
            dd = dt.find_next_sibling('dd')
            if term and dd:
                # Use a separator to handle word breaks across different tags,
                # then normalize whitespace to clean up any extra spaces.
                raw_definition = dd.get_text(separator=' ', strip=True)
                definition = ' '.join(raw_definition.split())
                
                # Ensure the definition is not empty before adding
                if definition:
                    data.append({"term": term, "definition": definition})
        
        print(f"Found {len(data)} terms in {domain} glossary.")
        return data
    except requests.RequestException as e:
        print(f"Error fetching {url}: {e}")
        return []

def generate_csv():
    """Generates the CSV file from the Wikipedia glossaries."""
    print("Step 1: Scraping all glossaries...")
    
    all_terms = {}
    total_scraped_count = 0

    for domain, url in GLOSSARIES.items():
        glossary_data = scrape_glossary(domain, url)
        total_scraped_count += len(glossary_data)
        for item in glossary_data:
            term = item['term']
            if term not in all_terms:
                all_terms[term] = []
            all_terms[term].append({'domain': domain, 'definition': item['definition']})
            
    print(f"\nStep 1 Complete: Scraped {total_scraped_count} total terms from {len(GLOSSARIES)} glossaries.")
    print(f"Found {len(all_terms)} unique terms.")

    print("\nStep 2: Identifying duplicate and unique terms...")
    duplicate_entries = []
    unique_entries = []

    for term, definitions in all_terms.items():
        if len(definitions) > 1:
            for entry in definitions:
                author = random.choice(AUTHORS)
                duplicate_entries.append([entry['domain'], term, entry['definition'], author])
        else:
            entry = definitions[0]
            author = random.choice(AUTHORS)
            unique_entries.append([entry['domain'], term, entry['definition'], author])
            
    print(f"Step 2 Complete: Found {len(duplicate_entries)} entries for duplicate terms.")
    print(f"Found {len(unique_entries)} entries for unique terms.")

    print("\nStep 3: Writing data to CSV...")
    with open(CSV_FILE_PATH, 'w', newline='', encoding='utf-8') as f_csv:
        writer = csv.writer(f_csv)
        writer.writerow(["domain", "term", "definition", "author"])
        
        # Write all duplicate entries first
        for row in duplicate_entries:
            writer.writerow(row)
        
        total_rows_written = len(duplicate_entries)
        
        # Calculate how many more rows we need
        target_total_rows = len(GLOSSARIES) * TARGET_ROWS_PER_DOMAIN
        remaining_rows_needed = target_total_rows - total_rows_written
        
        if remaining_rows_needed > 0:
            # Shuffle the unique entries to get a random sample
            random.shuffle(unique_entries)
            
            # Add unique entries until the target is met or we run out
            num_to_add = min(remaining_rows_needed, len(unique_entries))
            for i in range(num_to_add):
                writer.writerow(unique_entries[i])
                total_rows_written += 1
                
    print(f"\nStep 3 Complete: Successfully generated {total_rows_written} rows in {CSV_FILE_PATH}")

if __name__ == "__main__":
    generate_csv() 