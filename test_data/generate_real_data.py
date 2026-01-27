#!/usr/bin/env python3
"""
Generate real_data2.csv from glossary2.dita file.

This script:
1. Parses the DITA XML file to extract glossary entries
2. Categorizes terms into perspectives (CAT Modeling, VSS Product, Verisk External)
3. Creates entries with cross-references within each perspective
4. Outputs CSV file with cross-reference placeholders
"""

import csv
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from html import unescape


def convert_xref_to_link(elem):
    """Convert <xref> element to HTML link."""
    href = elem.get('href', '')
    text = ''.join(elem.itertext()).strip()

    # Fix http to https for verisk.com
    if 'verisk.com' in href and href.startswith('http://'):
        href = href.replace('http://', 'https://')

    if href and text:
        return f'<a href="{href}" target="_blank" rel="noopener noreferrer">{text}</a>'
    elif href:
        # Self-closing xref with href
        return f'<a href="{href}" target="_blank" rel="noopener noreferrer">{href}</a>'
    else:
        return text


def wrap_in_paragraphs(text):
    """Wrap text in <p> tags if not already wrapped."""
    if not text:
        return "<p></p>"

    text = text.strip()

    # If already has <p> tags, return as-is
    if text.startswith('<p>'):
        return text

    # Otherwise wrap in paragraph
    return f"<p>{text}</p>"


def categorize_perspective(term_text, definition_text):
    """
    Categorize a term into a perspective based on keywords in term name and definition.

    Returns: "CAT Modeling", "VSS Product", or "Verisk External"
    Defaults to "CAT Modeling" for unclear cases.
    """
    combined = (term_text + ' ' + definition_text).lower()

    # Verisk External keywords (check first to catch branding terms)
    verisk_keywords = [
        'verisk', 'air', 'analyze re', 'touchstone', 'model builder',
        'synergy studio', 'alert', 'ceda', 'cede', 'unicede', 'oed'
    ]
    if any(kw in combined for kw in verisk_keywords):
        return "Verisk External"

    # VSS Product keywords (infrastructure/application features)
    vss_keywords = [
        'aws', 's3', 'cloud', 'server', 'database', 'application server',
        'architecture', 'microservices', 'client server', 'dbeaver', 'sql',
        'activity monitor', 'air cloud', 'multi-tenant', 'single-tenant',
        'high performance computing', 'hpc', 'saas', 'software as a service',
        'vector file', 'geojson', 'gml', 'shapefile', 'sqlite',
        'online help', 'project', 'exposure view', 'exposure set',
        'mapping set', 'query language', 'sequential identifier'
    ]
    if any(kw in combined for kw in vss_keywords):
        return "VSS Product"

    # CAT Modeling keywords (catastrophe modeling domain concepts)
    # Default to CAT Modeling for unclear cases
    return "CAT Modeling"


def improve_definition(original, term_text, all_terms, current_perspective):
    """Improve definition by removing redundancy and adding cross-references."""
    improved = original

    # Remove redundant phrasing where term is used in definition
    # Pattern: "Term is a..." or "Term is the..." -> "A..." or "The..."
    # But only if not inside HTML tags
    term_lower = term_text.lower()
    patterns = [
        (rf'^{re.escape(term_text)}\s+is\s+(a|an|the)\s+', r'\1 ', re.IGNORECASE),
        (rf'^{re.escape(term_text)}\s+is\s+', '', re.IGNORECASE),
        (rf'^{re.escape(term_lower)}\s+is\s+(a|an|the)\s+', r'\1 ', re.IGNORECASE),
        (rf'^{re.escape(term_lower)}\s+is\s+', '', re.IGNORECASE),
    ]

    for pattern, replacement, flags in patterns:
        improved = re.sub(pattern, replacement, improved, flags=flags)

    # Filter terms to only include those from the same perspective
    same_perspective_terms = {
        term: perspective
        for term, perspective in all_terms.items()
        if perspective == current_perspective
    }

    # Add cross-references for related terms
    # Split text into parts: HTML tags and text content
    # Only replace terms in text content, not in HTML attributes or inside links
    parts = []
    last_end = 0
    in_link = False  # Track if we're inside an <a> tag

    # Find all HTML tags
    for match in re.finditer(r'<[^>]+>', improved):
        # Text before tag
        text_before = improved[last_end:match.start()]
        if text_before:
            parts.append(('text', text_before, in_link))
        # Tag itself
        tag = match.group()
        parts.append(('tag', tag))
        # Check if this is an opening or closing link tag
        if tag.lower().startswith('<a '):
            in_link = True
        elif tag.lower() == '</a>':
            in_link = False
        last_end = match.end()

    # Text after last tag
    if last_end < len(improved):
        parts.append(('text', improved[last_end:], in_link))

    # Process text parts only
    result_parts = []
    for part in parts:
        if len(part) == 2:  # Tag
            part_type, part_content = part
            result_parts.append(part_content)
        else:  # Text with link flag
            part_type, part_content, is_inside_link = part
            if is_inside_link:
                # Don't process text inside links - preserve it as-is to keep external links intact
                result_parts.append(part_content)
            else:
                # Process text content for cross-references (only if not inside a link)
                text_content = part_content
                for other_term, other_perspective in same_perspective_terms.items():
                    if other_term.lower() == term_text.lower():
                        continue

                    # Skip if term is too short (likely false matches)
                    if len(other_term) < 3:
                        continue

                    # Skip if text already contains cross-reference placeholders
                    # (to avoid nested cross-references like [[[[term|EES]] data|EES]])
                    if '[[' in text_content and ']]' in text_content:
                        # Check if this term is already inside a cross-reference
                        # Find all existing cross-references
                        existing_refs = re.findall(r'\[\[([^\|]+)\|([^\]]+)\]\]', text_content)
                        term_in_ref = False
                        for ref_term, _ in existing_refs:
                            if other_term.lower() in ref_term.lower() or ref_term.lower() in other_term.lower():
                                term_in_ref = True
                                break
                        if term_in_ref:
                            continue

                    # Check if term appears in text (case-insensitive word boundary)
                    pattern = r'\b' + re.escape(other_term) + r'\b'
                    if re.search(pattern, text_content, re.IGNORECASE):
                        # Only replace if not already a cross-reference
                        if f'[[{other_term}|' not in text_content:
                            # Also check that we're not inside an existing cross-reference
                            # by checking if the match is between [[ and ]]
                            matches = list(re.finditer(pattern, text_content, re.IGNORECASE))
                            for match in reversed(matches):  # Process from end to avoid index shifts
                                start, end = match.span()
                                # Check if this position is inside a cross-reference
                                before = text_content[:start]
                                after = text_content[end:]
                                # Count [[ before and ]] after
                                open_count = before.count('[[') - before.count(']]')
                                close_count = after.count(']]') - after.count('[[')
                                # If we're inside a cross-reference, skip this match
                                if open_count > 0 and close_count > 0:
                                    continue
                                # Replace this occurrence
                                text_content = (
                                    text_content[:start] +
                                    f'[[{other_term}|{other_perspective}]]' +
                                    text_content[end:]
                                )
                                break  # Only replace first match per term
                result_parts.append(text_content)

    improved = ''.join(result_parts)

    return improved.strip()


def process_element(elem, term_lookup=None, all_terms=None):
    """Process an XML element and convert to HTML, handling special DITA elements."""
    if term_lookup is None:
        term_lookup = {}
    if all_terms is None:
        all_terms = {}

    result_parts = []

    # Process text before first child
    if elem.text:
        result_parts.append(elem.text)

    # Process children
    for child in elem:
        if child.tag == 'p':
            # Paragraph - wrap in <p> tags
            para_content = process_element(child, term_lookup, all_terms)
            if para_content.strip():
                result_parts.append(f'<p>{para_content}</p>')
        elif child.tag == 'xref':
            # External link - convert to HTML link
            link_html = convert_xref_to_link(child)
            result_parts.append(link_html)
        elif child.tag == 'term':
            # Term reference - could be keyref (reference) or id (definition)
            keyref = child.get('keyref', '')
            term_id = child.get('id', '')
            term_text = child.text or ''.join(child.itertext()).strip()

            if keyref:
                # Reference to another term - try to find the term name
                # keyref format: "gloss_termName" -> term name
                # First try direct lookup in entry_id_to_term
                term_name = None
                if keyref in term_lookup.get('_entry_ids', {}):
                    term_name = term_lookup['_entry_ids'][keyref]
                else:
                    # Try without "gloss_" prefix
                    camel_key = keyref.replace('gloss_', '')
                    if camel_key in term_lookup.get('_entry_ids', {}):
                        term_name = term_lookup['_entry_ids'][camel_key]
                    else:
                        # Try to find by camelCase matching
                        # "activityMonitor" -> "Activity Monitor"
                        # Convert camelCase to title case
                        import re
                        words = re.findall(r'[A-Z]?[a-z]+|[A-Z]+(?=[A-Z]|$)', camel_key)
                        if words:
                            potential_term = ' '.join(word.capitalize() for word in words)
                            # Check if this matches a term
                            term_lower = potential_term.lower().replace(' ', '')
                            if term_lower in term_lookup:
                                term_name = term_lookup[term_lower]

                if term_name:
                    # Find perspective for this term
                    perspective = all_terms.get(term_name, "CAT Modeling")
                    result_parts.append(f'[[{term_name}|{perspective}]]')
                elif term_text:
                    # Use the text if available
                    result_parts.append(term_text)
                else:
                    # Fallback: try camelCase conversion
                    camel_key = keyref.replace('gloss_', '')
                    words = re.findall(r'[A-Z]?[a-z]+|[A-Z]+(?=[A-Z]|$)', camel_key)
                    if words:
                        potential_term = ' '.join(word.capitalize() for word in words)
                        perspective = all_terms.get(potential_term, "CAT Modeling")
                        result_parts.append(f'[[{potential_term}|{perspective}]]')
                    else:
                        result_parts.append(keyref)
            elif term_id:
                # Inline term definition - keep text, maybe add cross-reference
                if term_text:
                    # Try to find matching term
                    term_name = term_id.replace('gloss_', '').replace('gloss', '')
                    if term_name in term_lookup:
                        perspective = all_terms.get(term_lookup[term_name], "CAT Modeling")
                        result_parts.append(f'[[{term_lookup[term_name]}|{perspective}]]')
                    else:
                        result_parts.append(term_text)
                else:
                    result_parts.append(term_text)
            else:
                # Just term text
                result_parts.append(term_text or '')
        elif child.tag == 'keyword':
            # Keyword reference - usually just placeholder, get text if available
            keyref = child.get('keyref', '')
            # Try to infer from keyref (e.g., "k_kw_air-company-name-abbrev" -> "AIR")
            if 'air-company-name' in keyref:
                result_parts.append('AIR')
            elif 'verisk' in keyref.lower():
                result_parts.append('Verisk')
            else:
                # Just skip keyword references if we can't infer
                pass
        elif child.tag == 'ph':
            # Phrase - just get text
            result_parts.append(process_element(child, term_lookup, all_terms))
        elif child.tag == 'codeph':
            # Code phrase - wrap in <code>
            code_text = ''.join(child.itertext())
            result_parts.append(f'<code>{code_text}</code>')
        else:
            # Unknown element - recursively process
            result_parts.append(process_element(child, term_lookup, all_terms))

        # Process tail text after child
        if child.tail:
            result_parts.append(child.tail)

    return ''.join(result_parts)


def parse_dita_file(dita_path, all_terms=None):
    """Parse DITA file and extract glossary entries with rich formatting."""
    if all_terms is None:
        all_terms = {}

    tree = ET.parse(dita_path)
    root = tree.getroot()

    entries = []

    # First pass: build term lookup from all entries
    # Map both entry IDs and term names
    term_lookup = {}
    entry_id_to_term = {}

    for entry in root.findall('.//glossentry'):
        entry_id = entry.get('id', '')
        term_elem = entry.find('glossterm')
        if term_elem is not None:
            term_text = (term_elem.text or '').strip()
            if not term_text:
                # Try to get from children
                term_text = ''.join(term_elem.itertext()).strip()

            if term_text:
                # Map entry ID to term name (e.g., "gloss_activityMonitor" -> "Activity Monitor")
                if entry_id:
                    entry_id_to_term[entry_id] = term_text
                    # Also map without "gloss_" prefix
                    entry_id_to_term[entry_id.replace('gloss_', '')] = term_text

                # Normalize term name for lookup (lowercase, no spaces)
                term_key = term_text.lower().replace(' ', '').replace('-', '')
                term_lookup[term_key] = term_text
                # Also add variations
                term_lookup[term_text.lower()] = term_text
                term_lookup[term_text] = term_text
                # Add camelCase version (e.g., "activityMonitor" -> "Activity Monitor")
                if entry_id and 'gloss_' in entry_id:
                    camel_key = entry_id.replace('gloss_', '')
                    entry_id_to_term[camel_key] = term_text

    # Store entry_id mapping in term_lookup for access in process_element
    term_lookup['_entry_ids'] = entry_id_to_term

    # Second pass: extract entries with rich formatting
    for entry in root.findall('.//glossentry'):
        term_elem = entry.find('glossterm')
        def_elem = entry.find('glossdef')

        if term_elem is not None and def_elem is not None:
            # Get term text - handle keyword elements
            term = ''
            if term_elem.text:
                term = term_elem.text.strip()
            else:
                # Try to get text from children (like keyword elements)
                term = ''.join(term_elem.itertext()).strip()
                # If still empty, try to infer from keyword keyref
                for child in term_elem:
                    if child.tag == 'keyword':
                        keyref = child.get('keyref', '')
                        if 'analyze-re' in keyref:
                            term = 'Analyze Re'
                        elif 'air-company-name' in keyref:
                            term = 'AIR'
                        elif 'air-product-name' in keyref:
                            # Try to infer product name
                            if 'touchstone' in keyref:
                                term = 'Touchstone'
                            elif 'alert' in keyref:
                                term = 'ALERT'

            if term:
                # Process definition element to HTML
                definition_html = process_element(def_elem, term_lookup, all_terms)

                # Clean up: remove XML comments
                definition_html = re.sub(r'<!--.*?-->', '', definition_html, flags=re.DOTALL)

                # Clean up whitespace but preserve HTML structure
                # Don't collapse spaces inside HTML tags
                definition_html = re.sub(r'\s+', ' ', definition_html)
                definition_html = definition_html.strip()

                if definition_html:
                    entries.append((term, definition_html))

    return entries


def main():
    """Generate real_data2.csv from glossary2.dita."""
    script_dir = Path(__file__).parent
    dita_path = script_dir / "glossary2.dita"
    csv_path = script_dir / "real_data2.csv"

    print(f"Parsing {dita_path}...")

    # First pass: extract terms and definitions for categorization
    tree = ET.parse(dita_path)
    root = tree.getroot()

    term_def_pairs = []
    for entry in root.findall('.//glossentry'):
        term_elem = entry.find('glossterm')
        def_elem = entry.find('glossdef')
        if term_elem is not None and def_elem is not None:
            term = ''
            if term_elem.text:
                term = term_elem.text.strip()
            else:
                term = ''.join(term_elem.itertext()).strip()

            if term:
                # Get plain text definition for categorization
                def_text = ''.join(def_elem.itertext()).strip()
                term_def_pairs.append((term, def_text))

    # Categorize all terms
    print(f"Found {len(term_def_pairs)} entries, categorizing...")
    all_terms = {}
    perspective_counts = {}
    for term, def_text in term_def_pairs:
        perspective = categorize_perspective(term, def_text)
        all_terms[term] = perspective
        perspective_counts[perspective] = perspective_counts.get(perspective, 0) + 1

    # Second pass: parse with full formatting and cross-references
    dita_entries = parse_dita_file(dita_path, all_terms)
    print(f"Parsed {len(dita_entries)} entries with formatting")

    # Write CSV
    print(f"Writing {csv_path}...")
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["perspective", "term", "definition", "author"])

        # Write entries with their categorized perspectives
        for term, original_def in dita_entries:
            perspective = all_terms.get(term, "CAT Modeling")
            # Generate improved definition in-memory (adds cross-references)
            improved_def = improve_definition(original_def, term, all_terms, perspective)
            draft = wrap_in_paragraphs(improved_def)
            writer.writerow([perspective, term, draft, "admin"])

    print(f"✓ Generated {csv_path}")
    for perspective, count in sorted(perspective_counts.items()):
        print(f"  - {count} {perspective} terms")
    print(f"  - Total: {len(dita_entries)} rows")


if __name__ == "__main__":
    main()
