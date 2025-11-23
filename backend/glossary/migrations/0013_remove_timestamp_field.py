# Migration to remove redundant timestamp field from EntryDraft
# The timestamp field is redundant since EntryDraft already has created_at from AuditedModel
# This migration removes the field and updates composite indices to use created_at instead

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("glossary", "0012_add_notifications"),
    ]

    operations = [
        # Drop composite indices that use timestamp
        migrations.RemoveIndex(
            model_name="entrydraft",
            name="glossary_en_entry_pub_ts_idx",
        ),
        migrations.RemoveIndex(
            model_name="entrydraft",
            name="glossary_en_pub_ts_idx",
        ),
        migrations.RemoveIndex(
            model_name="entrydraft",
            name="glossary_en_author_pub_ts_idx",
        ),
        migrations.RemoveIndex(
            model_name="entrydraft",
            name="glossary_en_entry_del_ts_idx",
        ),
        # Remove the timestamp field
        migrations.RemoveField(
            model_name="entrydraft",
            name="timestamp",
        ),
        # Recreate composite indices with created_at instead of timestamp
        migrations.AddIndex(
            model_name="entrydraft",
            index=models.Index(
                fields=["entry", "is_published", "created_at"],
                name="glossary_en_entry_pub_created_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="entrydraft",
            index=models.Index(
                fields=["is_published", "created_at"],
                name="glossary_en_pub_created_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="entrydraft",
            index=models.Index(
                fields=["author", "is_published", "created_at"],
                name="glossary_en_author_pub_created_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="entrydraft",
            index=models.Index(
                fields=["entry", "is_deleted", "created_at"],
                name="glossary_en_entry_del_created_idx",
            ),
        ),
    ]
