from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from glossary.models import EntryDraft


class Command(BaseCommand):
    help = "Archive unpublished drafts older than 1 month"

    def handle(self, *args, **options):
        """Archive unpublished drafts older than 1 month"""
        one_month_ago = timezone.now() - timedelta(days=30)

        # Find unpublished drafts older than 1 month that aren't already archived
        drafts_to_archive = EntryDraft.objects.filter(
            is_published=False,
            is_archived=False,
            timestamp__lt=one_month_ago,
            is_deleted=False,
        )

        count = drafts_to_archive.update(is_archived=True)

        self.stdout.write(self.style.SUCCESS(f"Successfully archived {count} draft(s)"))
