"""
Utility functions for CSV processing and glossary data loading.
"""

import csv
import re
from io import TextIOWrapper

from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone

from glossary.models import Entry, EntryDraft, Perspective, Term


def normalize_content(content):
    """Normalize HTML content for comparison by stripping whitespace and normalizing tags."""
    if not content:
        return ""
    # Strip leading/trailing whitespace
    content = content.strip()
    # Normalize whitespace (multiple spaces/newlines to single space)
    content = re.sub(r"\s+", " ", content)
    # Remove empty tags
    content = re.sub(r"<(\w+)>\s*</\1>", "", content)
    return content


def resolve_author(author_name, admin_user):
    """
    Resolve author from CSV row.

    Args:
        author_name: Author name from CSV (may be None, empty, or username)
        admin_user: Admin user to use as fallback

    Returns:
        User object to use as author
    """
    if not author_name or not author_name.strip():
        return admin_user

    # Try to find user by username
    try:
        user = User.objects.get(username=author_name.strip())
        return user
    except User.DoesNotExist:
        # If user doesn't exist, use admin user
        return admin_user


def get_latest_published_draft(entry):
    """Get the latest published draft for an entry."""
    return (
        entry.drafts.filter(is_published=True, is_deleted=False)
        .order_by("-published_at", "-created_at")
        .first()
    )


def content_matches(existing_content, new_content):
    """Check if two content strings match after normalization."""
    return normalize_content(existing_content) == normalize_content(new_content)


def _get_or_create_perspective(perspective_name, admin_user, perspectives_cache=None):
    """Get or create perspective, using cache if available."""
    if perspectives_cache and perspective_name in perspectives_cache:
        return perspectives_cache[perspective_name]

    perspective, _ = Perspective.objects.get_or_create(
        name=perspective_name, defaults={"created_by": admin_user}
    )
    if perspectives_cache:
        perspectives_cache[perspective_name] = perspective
    return perspective


def _prepare_content(definition):
    """Prepare content, wrapping in <p> tags if needed."""
    content = definition.strip()
    if not content.startswith("<"):
        content = f"<p>{content}</p>"
    return content


def _add_approvers_for_admin_upload(draft, admin_user, author):
    """Add approvers to meet MIN_APPROVALS requirement for admin uploads."""
    from django.conf import settings

    min_approvals = getattr(settings, "MIN_APPROVALS", 2)
    draft.approvers.add(admin_user)

    if min_approvals > 1 and author != admin_user:
        draft.approvers.add(author)

    if draft.approvers.count() < min_approvals:
        other_staff = (
            User.objects.filter(is_staff=True, is_active=True)
            .exclude(id=admin_user.id)
            .exclude(id__in=draft.approvers.values_list("id", flat=True))
            .first()
        )
        if other_staff:
            draft.approvers.add(other_staff)


def _create_and_publish_draft(entry, content, author, admin_user, published_draft):
    """Create a new draft, approve it, and publish it."""
    draft = EntryDraft.objects.create(
        entry=entry, content=content, author=author, created_by=admin_user
    )

    _add_approvers_for_admin_upload(draft, admin_user, author)

    draft.is_published = True
    draft.published_at = timezone.now()

    if published_draft:
        draft.replaces_draft = published_draft

    draft.save()
    return draft


def process_csv_row(row, admin_user, perspectives_cache=None):
    """
    Process a single CSV row and create/update entry draft.

    Args:
        row: Dictionary with keys: perspective, term, definition, author (optional)
        admin_user: Admin user for fallback author and created_by
        perspectives_cache: Optional dict to cache perspectives

    Returns:
        dict with keys: entry_created, draft_created, skipped, error
    """
    result = {
        "entry_created": False,
        "draft_created": False,
        "skipped": False,
        "error": None,
    }

    try:
        perspective = _get_or_create_perspective(
            row["perspective"].strip(), admin_user, perspectives_cache
        )

        term_text = row["term"].strip()
        term, _ = Term.objects.get_or_create(
            text=term_text, defaults={"created_by": admin_user}
        )

        entry, entry_created = Entry.objects.get_or_create(
            term=term, perspective=perspective, defaults={"created_by": admin_user}
        )
        result["entry_created"] = entry_created

        author = resolve_author(
            row.get("author", "").strip() if "author" in row else "", admin_user
        )
        content = _prepare_content(row["definition"])

        published_draft = get_latest_published_draft(entry)
        if published_draft and content_matches(published_draft.content, content):
            result["skipped"] = True
            return result

        _create_and_publish_draft(entry, content, author, admin_user, published_draft)
        result["draft_created"] = True

    except Exception as e:
        result["error"] = str(e)

    return result


def _open_csv_file(csv_file):
    """Open CSV file, handling file paths or Django uploaded files. Returns (file_obj, should_close)."""
    if isinstance(csv_file, str):
        return open(csv_file, "r", encoding="utf-8"), True
    elif hasattr(csv_file, "read"):
        if hasattr(csv_file, "seek"):
            csv_file.seek(0)
        return TextIOWrapper(csv_file, encoding="utf-8"), False
    else:
        raise ValueError(
            "csv_file must be a file path, file object, or Django uploaded file"
        )


def _validate_csv_columns(reader):
    """Validate CSV has required columns."""
    required_columns = {"perspective", "term", "definition"}
    if not required_columns.issubset(reader.fieldnames):
        missing = required_columns - set(reader.fieldnames)
        raise ValueError(f"CSV missing required columns: {', '.join(missing)}")


def _process_csv_rows(reader, admin_user, summary):
    """Process all CSV rows and update summary."""
    perspectives_cache = {}

    for row_num, row in enumerate(reader, start=2):  # Start at 2 (row 1 is header)
        result = process_csv_row(row, admin_user, perspectives_cache)

        if result["error"]:
            summary["errors"].append(f"Row {row_num}: {result['error']}")
        elif result["skipped"]:
            summary["skipped"] += 1
        else:
            if result["entry_created"]:
                summary["entries_created"] += 1
            if result["draft_created"]:
                summary["drafts_created"] += 1


def load_entries_from_csv(csv_file, admin_user, skip_duplicates=True):
    """
    Load entries from CSV file.

    Args:
        csv_file: File-like object or path to CSV file
        admin_user: Admin user for fallback author and created_by
        skip_duplicates: If True, skip entries with matching published draft content

    Returns:
        dict with summary: entries_created, drafts_created, skipped, errors
    """
    summary = {
        "entries_created": 0,
        "drafts_created": 0,
        "skipped": 0,
        "errors": [],
        "cross_references_resolved": 0,
    }

    file_obj, should_close = _open_csv_file(csv_file)

    try:
        reader = csv.DictReader(file_obj)
        _validate_csv_columns(reader)

        with transaction.atomic():
            _process_csv_rows(reader, admin_user, summary)

            if summary["drafts_created"] > 0 or summary["entries_created"] > 0:
                cross_ref_count = resolve_cross_references()
                summary["cross_references_resolved"] = cross_ref_count

    finally:
        if should_close:
            file_obj.close()

    return summary


def resolve_cross_references():
    """
    Resolve [[term|perspective]] placeholders in all draft content to HTML links.

    Returns:
        Number of cross-references resolved
    """
    import re

    # Build lookup of all entries by (term_text, perspective_name)
    all_entries = {}
    for entry in Entry.objects.filter(is_deleted=False).select_related(
        "term", "perspective"
    ):
        entry_key = (entry.term.text.strip(), entry.perspective.name.strip())
        all_entries[entry_key] = entry

    cross_ref_count = 0

    # Process all drafts that contain cross-reference placeholders
    for draft in EntryDraft.objects.filter(is_deleted=False):
        content = draft.content
        if "[[" in content:
            # Find all cross-reference placeholders: [[Term|Perspective]]
            pattern = r"\[\[([^\|]+)\|([^\]]+)\]\]"
            matches = re.findall(pattern, content)

            for term_text, perspective_name in matches:
                # Look up entry
                entry_key = (term_text.strip(), perspective_name.strip())
                referenced_entry = all_entries.get(entry_key)

                if referenced_entry:
                    # Replace placeholder with HTML link
                    placeholder = f"[[{term_text}|{perspective_name}]]"
                    link_text = f"{term_text} 📖"
                    link_html = (
                        f'<a href="/entry/{referenced_entry.id}" '
                        f'data-entry-id="{referenced_entry.id}">'
                        f"{link_text}</a>"
                    )
                    content = content.replace(placeholder, link_html)
                    cross_ref_count += 1

            # Update draft content if changed
            if content != draft.content:
                draft.content = content
                draft.save()

    return cross_ref_count
