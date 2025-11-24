#!/usr/bin/env python3
"""
Generate real_data.csv from glossary.dita file.

This script:
1. Parses the DITA XML file to extract glossary entries
2. Creates EES perspective entries with two drafts (original and improved)
3. Creates Tools perspective entries for Termageddon-related terms
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


def improve_definition(original, term_text, all_terms):
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

    # Add cross-references for related terms
    # Split text into parts: HTML tags and text content
    # Only replace terms in text content, not in HTML attributes
    parts = []
    last_end = 0

    # Find all HTML tags
    for match in re.finditer(r'<[^>]+>', improved):
        # Text before tag
        text_before = improved[last_end:match.start()]
        if text_before:
            parts.append(('text', text_before))
        # Tag itself
        parts.append(('tag', match.group()))
        last_end = match.end()

    # Text after last tag
    if last_end < len(improved):
        parts.append(('text', improved[last_end:]))

    # Process text parts only
    result_parts = []
    for part_type, part_content in parts:
        if part_type == 'tag':
            result_parts.append(part_content)
        else:
            # Process text content for cross-references
            text_content = part_content
            for other_term, other_perspective in all_terms.items():
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


def process_element(elem, term_lookup=None):
    """Process an XML element and convert to HTML, handling special DITA elements."""
    if term_lookup is None:
        term_lookup = {}

    result_parts = []

    # Process text before first child
    if elem.text:
        result_parts.append(elem.text)

    # Process children
    for child in elem:
        if child.tag == 'p':
            # Paragraph - wrap in <p> tags
            para_content = process_element(child, term_lookup)
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
                    result_parts.append(f'[[{term_name}|EES]]')
                elif term_text:
                    # Use the text if available
                    result_parts.append(term_text)
                else:
                    # Fallback: try camelCase conversion
                    camel_key = keyref.replace('gloss_', '')
                    words = re.findall(r'[A-Z]?[a-z]+|[A-Z]+(?=[A-Z]|$)', camel_key)
                    if words:
                        potential_term = ' '.join(word.capitalize() for word in words)
                        result_parts.append(f'[[{potential_term}|EES]]')
                    else:
                        result_parts.append(keyref)
            elif term_id:
                # Inline term definition - keep text, maybe add cross-reference
                if term_text:
                    # Try to find matching term
                    term_name = term_id.replace('gloss_', '').replace('gloss', '')
                    if term_name in term_lookup:
                        result_parts.append(f'[[{term_name}|EES]]')
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
            result_parts.append(process_element(child, term_lookup))
        elif child.tag == 'codeph':
            # Code phrase - wrap in <code>
            code_text = ''.join(child.itertext())
            result_parts.append(f'<code>{code_text}</code>')
        else:
            # Unknown element - recursively process
            result_parts.append(process_element(child, term_lookup))

        # Process tail text after child
        if child.tail:
            result_parts.append(child.tail)

    return ''.join(result_parts)


def parse_dita_file(dita_path):
    """Parse DITA file and extract glossary entries with rich formatting."""
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
                definition_html = process_element(def_elem, term_lookup)

                # Clean up: remove XML comments
                definition_html = re.sub(r'<!--.*?-->', '', definition_html, flags=re.DOTALL)

                # Clean up whitespace but preserve HTML structure
                # Don't collapse spaces inside HTML tags
                definition_html = re.sub(r'\s+', ' ', definition_html)
                definition_html = definition_html.strip()

                if definition_html:
                    entries.append((term, definition_html))

    return entries


def create_tools_entries():
    """Create Tools perspective entries for Termageddon-related terms."""
    entries = [
        (
            "Termageddon",
            "A glossary management system developed by David Wolfe for creating, reviewing, and publishing term definitions across multiple perspectives. Termageddon enables collaborative editing with an approval workflow, version history, and cross-referencing between entries."
        ),
        (
            "entry draft",
            "A proposed definition for a term within a specific perspective in [[Termageddon|Tools]]. Entry drafts require approval from two reviewers before they can be published. Drafts can be revised, creating a version history that tracks changes over time."
        ),
        (
            "perspective",
            "A categorization system in [[Termageddon|Tools]] that groups related terms together. Each perspective represents a particular viewpoint or domain (e.g., EES for industry terms, Tools for software tools). Terms can have different definitions across perspectives."
        ),
        (
            "entry",
            "A combination of a term and a perspective in [[Termageddon|Tools]]. Each entry can have multiple drafts, but only one published draft is active at a time. Entries enable the same term to have different definitions depending on the perspective."
        ),
        (
            "term",
            "A word or phrase that is being defined in [[Termageddon|Tools]]. A single term can appear in multiple entries across different perspectives, each with its own definition."
        ),
        (
            "definition",
            "The content that explains what a term means within a specific perspective in [[Termageddon|Tools]]. Definitions are written using a rich-text editor and can include cross-references to other entries."
        ),
        (
            "approval",
            "The process in [[Termageddon|Tools]] by which reviewers validate an entry draft before it can be published. Each draft requires two approvals from different users before it becomes the active definition."
        ),
        (
            "reviewer",
            "A user in [[Termageddon|Tools]] who can approve or comment on entry drafts. Reviewers help ensure the quality and accuracy of definitions before they are published."
        ),
        (
            "perspective curator",
            "A user in [[Termageddon|Tools]] who has special responsibilities for a specific perspective. Curators can endorse published drafts and help maintain the quality of definitions within their assigned perspective."
        ),
        (
            "published draft",
            "An entry draft in [[Termageddon|Tools]] that has been approved and made active. Only one published draft exists per entry at a time, and it is the definition that appears in the glossary view."
        ),
    ]
    return entries


def main():
    """Generate real_data.csv from glossary.dita."""
    script_dir = Path(__file__).parent
    dita_path = script_dir / "glossary.dita"
    csv_path = script_dir / "real_data.csv"

    print(f"Parsing {dita_path}...")
    dita_entries = parse_dita_file(dita_path)
    print(f"Found {len(dita_entries)} entries in DITA file")

    # Build term lookup for cross-references
    all_terms = {}
    for term, _ in dita_entries:
        all_terms[term] = "EES"

    # Add Tools terms to lookup
    tools_entries = create_tools_entries()
    for term, _ in tools_entries:
        all_terms[term] = "Tools"

    # Write CSV
    print(f"Writing {csv_path}...")
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["perspective", "term", "definition", "author"])

        # Write EES entries (two drafts each)
        for term, original_def in dita_entries:
            # First draft: original definition
            first_draft = wrap_in_paragraphs(original_def)
            writer.writerow(["EES", term, first_draft, "admin"])

            # Second draft: improved definition
            improved_def = improve_definition(original_def, term, all_terms)
            second_draft = wrap_in_paragraphs(improved_def)
            writer.writerow(["EES", term, second_draft, "admin"])

        # Write Tools entries (single draft each)
        for term, definition in tools_entries:
            draft = wrap_in_paragraphs(definition)
            writer.writerow(["Tools", term, draft, "admin"])

    print(f"✓ Generated {csv_path}")
    print(f"  - {len(dita_entries)} EES terms (2 drafts each = {len(dita_entries) * 2} rows)")
    print(f"  - {len(tools_entries)} Tools terms ({len(tools_entries)} rows)")
    print(f"  - Total: {len(dita_entries) * 2 + len(tools_entries)} rows")


if __name__ == "__main__":
    main()
