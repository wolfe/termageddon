import csv
import random
from pathlib import Path

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction

from glossary.models import Perspective, PerspectiveCurator, Entry, EntryDraft, Term


class Command(BaseCommand):
    help = "Load test data from CSV file and create users, perspectives, entries"

    def add_arguments(self, parser):
        parser.add_argument(
            "--csv-path",
            type=str,
            default="test_data/test_data.csv",
            help="Path to CSV file (relative to project root)",
        )

    def handle(self, *args, **options):
        csv_path = options["csv_path"]

        # Navigate up from backend directory to project root
        project_root = Path(__file__).resolve().parent.parent.parent.parent.parent
        csv_file = project_root / csv_path

        if not csv_file.exists():
            self.stdout.write(self.style.ERROR(f"CSV file not found: {csv_file}"))
            return

        self.stdout.write(self.style.SUCCESS(f"Loading data from {csv_file}"))

        with transaction.atomic():
            # Create superuser
            admin, created = User.objects.get_or_create(
                username="admin",
                defaults={
                    "is_staff": True,
                    "is_superuser": True,
                    "first_name": "Admin",
                    "last_name": "User",
                },
            )
            if created:
                admin.set_password("admin")
                admin.save()
                self.stdout.write(
                    self.style.SUCCESS("Created superuser: admin / admin")
                )
            else:
                self.stdout.write(
                    self.style.WARNING("Superuser 'admin' already exists")
                )

            # Read CSV to extract unique authors
            with open(csv_file, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                data = list(reader)

            unique_authors = set(row["author"] for row in data)

            # Create user accounts for authors
            users = {}
            
            # Define specific user mappings for consistent usernames
            user_mappings = {
                "Maria Flores": ("mariacarter", "Maria", "Carter"),
                "Ben Carter": ("bencarter", "Ben", "Carter"),
                "Sofia Rossi": ("sofiarossi", "Sofia", "Rossi"),
                "Leo Schmidt": ("leoschmidt", "Leo", "Schmidt"),
                "Kenji Tanaka": ("kenjitanaka", "Kenji", "Tanaka"),
                "Aisha Khan": ("aishakhan", "Aisha", "Khan"),
                "Samuel Greene": ("samuelgreene", "Samuel", "Greene"),
                "Ivan Petrov": ("ivanpetrov", "Ivan", "Petrov"),
                "Chloe Dubois": ("chloedubois", "Chloe", "Dubois"),
            }
            
            for author_name in unique_authors:
                if author_name in user_mappings:
                    username, first_name, last_name = user_mappings[author_name]
                else:
                    # Fallback for any other authors
                    username = author_name.lower().replace(" ", "")
                    first_name, *last_parts = author_name.split()
                    last_name = " ".join(last_parts) if last_parts else ""

                user, created = User.objects.get_or_create(
                    username=username,
                    defaults={
                        "first_name": first_name,
                        "last_name": last_name,
                    },
                )
                if created:
                    user.set_password(username)  # Password = username
                    user.save()
                    self.stdout.write(
                        self.style.SUCCESS(f"Created user: {username} / {username}")
                    )
                users[author_name] = user

            # Create perspectives from CSV
            unique_perspectives = set(row["perspective"] for row in data)
            perspectives = {}
            for perspective_name in unique_perspectives:
                perspective, created = Perspective.objects.get_or_create(
                    name=perspective_name,
                    defaults={
                        "description": f"Terms related to {perspective_name}",
                        "created_by": admin,
                    },
                )
                if created:
                    self.stdout.write(
                        self.style.SUCCESS(f"Created perspective: {perspective_name}")
                    )
                perspectives[perspective_name] = perspective

            # Assign specific users as perspective curators for realistic demo
            # Maria Flores - Physics, Chemistry curator
            # Ben Carter - Chemistry, Biology curator  
            # Sofia Rossi - Computer Science, Graph Theory curator
            # Leo Schmidt - Biology, Geology curator
            # Kenji Tanaka - Physics, Geology curator
            
            perspective_curator_assignments = {
                "Maria Flores": ["Physics", "Chemistry"],
                "Ben Carter": ["Chemistry", "Biology"], 
                "Sofia Rossi": ["Computer Science", "Graph Theory"],
                "Leo Schmidt": ["Biology", "Geology"],
                "Kenji Tanaka": ["Physics", "Geology"],
            }
            
            for author_name, perspective_names in perspective_curator_assignments.items():
                if author_name in users:
                    user = users[author_name]
                    for perspective_name in perspective_names:
                        if perspective_name in perspectives:
                            PerspectiveCurator.objects.get_or_create(
                                user=user,
                                perspective=perspectives[perspective_name],
                                defaults={
                                    "assigned_by": admin,
                                    "created_by": admin,
                                },
                            )
                            self.stdout.write(
                                self.style.SUCCESS(
                                    f"Assigned {author_name} as curator for {perspective_name}"
                                )
                            )

            # Load entries from CSV
            entries_created = 0
            drafts_created = 0

            for row in data:
                perspective = perspectives[row["perspective"]]
                author = users[row["author"]]

                # Get or create term
                term, _ = Term.objects.get_or_create(
                    text=row["term"], defaults={"created_by": admin}
                )

                # Get or create entry
                entry, entry_created = Entry.objects.get_or_create(
                    term=term,
                    perspective=perspective,
                    defaults={"created_by": admin},
                )
                if entry_created:
                    entries_created += 1

                # Check if this author already has an unpublished draft for this entry
                existing_draft = EntryDraft.objects.filter(
                    entry=entry,
                    author=author,
                    is_deleted=False,
                    is_published=False
                ).first()
                
                if existing_draft:
                    # Update existing draft instead of creating new one
                    existing_draft.content = f"<p>{row['definition']}</p>"
                    existing_draft.save()
                    draft = existing_draft
                else:
                    # Create new entry draft
                    draft = EntryDraft.objects.create(
                        entry=entry,
                        content=f"<p>{row['definition']}</p>",
                        author=author,
                        created_by=admin,
                    )
                drafts_created += 1

                # Create realistic approval states
                all_users = list(users.values())
                potential_approvers = [u for u in all_users if u != author]
                approval_state = random.choices(
                    ['no_approvals', 'one_approval', 'two_approvals', 'published'],
                    weights=[20, 25, 35, 20]  # Most entries have 2 approvals, some published
                )[0]
                
                if approval_state == 'one_approval' and len(potential_approvers) >= 1:
                    approvers = random.sample(potential_approvers, 1)
                    draft.approvers.add(*approvers)
                elif approval_state in ['two_approvals', 'published'] and len(potential_approvers) >= 2:
                    approvers = random.sample(potential_approvers, 2)
                    draft.approvers.add(*approvers)
                    
                    # If published, mark as published
                    if approval_state == 'published':
                        draft.is_published = True
                        draft.save()

            self.stdout.write(self.style.SUCCESS(f"\nData loading complete!"))
            self.stdout.write(self.style.SUCCESS(f"Created {len(users)} users"))
            self.stdout.write(self.style.SUCCESS(f"Created {len(perspectives)} perspectives"))
            self.stdout.write(self.style.SUCCESS(f"Created {entries_created} entries"))
            self.stdout.write(
                self.style.SUCCESS(f"Created {drafts_created} entry drafts")
            )
            self.stdout.write(self.style.SUCCESS(f"\nLogin credentials:"))
            self.stdout.write(self.style.SUCCESS(f"  Superuser: admin / admin"))
            self.stdout.write(
                self.style.SUCCESS(
                    f"  Test users: <username> / <username> (e.g., maria.flores / maria.flores)"
                )
            )
