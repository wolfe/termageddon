# Generated manually

import django.db.models.deletion
from django.db import migrations, models


def delete_null_comments(apps, schema_editor):
    """Delete any comments with NULL draft (shouldn't exist, but safety check)"""
    Comment = apps.get_model("glossary", "Comment")
    Comment.objects.filter(draft__isnull=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("glossary", "0007_remove_generic_fk_from_comments"),
    ]

    operations = [
        migrations.RunPython(delete_null_comments, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="comment",
            name="draft",
            field=models.ForeignKey(
                help_text="The draft this comment is attached to",
                on_delete=django.db.models.deletion.CASCADE,
                related_name="comments",
                to="glossary.entrydraft",
            ),
        ),
    ]
