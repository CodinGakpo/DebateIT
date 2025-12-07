# Generated manually to align the database with the updated models.
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="debateroom",
            name="defender_email",
            field=models.EmailField(blank=True, default="", max_length=254),
        ),
        migrations.RenameField(
            model_name="debateturn",
            old_name="turn_no",
            new_name="turn_number",
        ),
        migrations.AlterField(
            model_name="debateturn",
            name="speaker",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="turns",
                to="api.userprofile",
            ),
        ),
        migrations.AddField(
            model_name="debateturn",
            name="speaker_role",
            field=models.CharField(
                choices=[("ATTACKER", "Attacker"), ("DEFENDER", "Defender")],
                default="ATTACKER",
                max_length=10,
            ),
            preserve_default=False,
        ),
        migrations.AlterUniqueTogether(
            name="debateturn",
            unique_together={("room", "turn_number")},
        ),
    ]
