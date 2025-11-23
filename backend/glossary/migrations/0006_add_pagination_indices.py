# Generated migration for pagination index optimization
#
# This migration includes:
# 1. Auto-generated AlterField operations for db_index=True on single-column fields
# 2. Manually added composite indices that cannot be auto-generated
#
# Note: Single-column indices are defined via db_index=True in models for maintainability.
# Composite indices are documented here and in views.py comments.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("glossary", "0005_userprofile"),
    ]

    operations = [
        # Auto-generated: Single-column indices from db_index=True in models
        # Entry.created_at - for date range filtering (created_after, created_before)
        migrations.AlterField(
            model_name="entry",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, db_index=True),
        ),
        # Term.is_official - for filtering official terms
        migrations.AlterField(
            model_name="term",
            name="is_official",
            field=models.BooleanField(
                db_index=True,
                default=False,
                help_text="Indicates term has official status",
            ),
        ),
        # EntryDraft.timestamp - for default ordering (critical, used in almost all queries)
        # NOTE: This field was removed in migration 0013_remove_timestamp_field.py
        # and replaced with created_at
        migrations.AlterField(
            model_name="entrydraft",
            name="timestamp",
            field=models.DateTimeField(auto_now_add=True, db_index=True),
        ),
        # EntryDraft.is_published - for filtering published/unpublished drafts
        migrations.AlterField(
            model_name="entrydraft",
            name="is_published",
            field=models.BooleanField(
                db_index=True,
                default=False,
                help_text="Whether this draft has been published as active",
            ),
        ),
        # EntryDraft.published_at - for ordering by published date
        migrations.AlterField(
            model_name="entrydraft",
            name="published_at",
            field=models.DateTimeField(blank=True, db_index=True, null=True),
        ),
        # Comment.object_id - for generic foreign key lookups
        migrations.AlterField(
            model_name="comment",
            name="object_id",
            field=models.PositiveIntegerField(db_index=True),
        ),
        # Comment.is_resolved - for filtering resolved comments
        migrations.AlterField(
            model_name="comment",
            name="is_resolved",
            field=models.BooleanField(db_index=True, default=False),
        ),
        # Comment.created_at - for ordering (inherited from AuditedModel)
        migrations.AlterField(
            model_name="comment",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, db_index=True),
        ),
        # EntryDraft.created_at - for date filtering (inherited from AuditedModel)
        migrations.AlterField(
            model_name="entrydraft",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, db_index=True),
        ),
        # Term.created_at - for date filtering (inherited from AuditedModel)
        migrations.AlterField(
            model_name="term",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, db_index=True),
        ),
        # Perspective.created_at - for date filtering (inherited from AuditedModel)
        migrations.AlterField(
            model_name="perspective",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, db_index=True),
        ),
        # PerspectiveCurator.created_at - for date filtering (inherited from AuditedModel)
        migrations.AlterField(
            model_name="perspectivecurator",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, db_index=True),
        ),
        # UserProfile.created_at - for date filtering (inherited from AuditedModel)
        migrations.AlterField(
            model_name="userprofile",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, db_index=True),
        ),
        # Manually added: Composite indices (cannot be auto-generated)
        # Entry model composite indices
        # Composite index for soft-delete filtering combined with date range queries
        # Used in: EntryViewSet.get_queryset() for created_after/created_before filtering
        migrations.AddIndex(
            model_name="entry",
            index=models.Index(
                fields=["is_deleted", "created_at"],
                name="glossary_en_is_del_created_idx",
            ),
        ),
        # EntryDraft model composite indices
        # Composite index for EntryViewSet.list() query pattern:
        # Entry.filter(drafts__is_published=True).distinct() with ordering
        # Used in: EntryViewSet.get_queryset() line 140
        migrations.AddIndex(
            model_name="entrydraft",
            index=models.Index(
                fields=["entry", "is_published", "timestamp"],
                name="glossary_en_entry_pub_ts_idx",
            ),
        ),
        # Composite index for EntryDraftViewSet.list() default filtering:
        # filter(is_published=False) with ordering by -timestamp
        # Used in: EntryDraftViewSet.get_queryset() line 564
        migrations.AddIndex(
            model_name="entrydraft",
            index=models.Index(
                fields=["is_published", "timestamp"],
                name="glossary_en_pub_ts_idx",
            ),
        ),
        # Composite index for author filtering with ordering
        # Used in: EntryDraftViewSet.get_queryset() for author filtering (line 447)
        # and eligibility="own" queries (line 534)
        migrations.AddIndex(
            model_name="entrydraft",
            index=models.Index(
                fields=["author", "is_published", "timestamp"],
                name="glossary_en_author_pub_ts_idx",
            ),
        ),
        # Composite index for draft history queries
        # Used in: EntryDraftViewSet.history() line 774
        migrations.AddIndex(
            model_name="entrydraft",
            index=models.Index(
                fields=["entry", "is_deleted", "timestamp"],
                name="glossary_en_entry_del_ts_idx",
            ),
        ),
        # Comment model composite indices
        # Composite index for filtered generic foreign key lookups
        # Used in: CommentViewSet.with_draft_positions() for filtering by
        # content_type, object_id, and is_resolved (lines 908-923)
        migrations.AddIndex(
            model_name="comment",
            index=models.Index(
                fields=["content_type", "object_id", "is_resolved"],
                name="glossary_co_ct_obj_res_idx",
            ),
        ),
        # Composite index for reply ordering
        # Used in: CommentViewSet queryset ordering by created_at with parent filtering
        migrations.AddIndex(
            model_name="comment",
            index=models.Index(
                fields=["parent", "created_at"],
                name="glossary_co_parent_created_idx",
            ),
        ),
        # Term model composite indices
        # Composite index for search queries with soft-delete filtering
        # Used in: TermViewSet.get_queryset() for search on text_normalized
        migrations.AddIndex(
            model_name="term",
            index=models.Index(
                fields=["is_deleted", "text_normalized"],
                name="glossary_te_del_text_norm_idx",
            ),
        ),
    ]
