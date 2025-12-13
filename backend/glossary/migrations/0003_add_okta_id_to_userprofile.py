# Generated manually for Okta integration

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("glossary", "0002_add_composite_indices"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="okta_id",
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text="Okta user ID (sub claim) for OAuth authentication",
                max_length=255,
                null=True,
                unique=True,
            ),
        ),
    ]
