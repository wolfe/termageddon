import csv
import random
from pathlib import Path

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction

from glossary.models import Domain, DomainExpert, Entry, EntryVersion, Term


class Command(BaseCommand):
    help = "Load test data from CSV file and create users, domains, entries"

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

            # Create domains from CSV
            unique_domains = set(row["domain"] for row in data)
            domains = {}
            for domain_name in unique_domains:
                domain, created = Domain.objects.get_or_create(
                    name=domain_name,
                    defaults={
                        "description": f"Terms related to {domain_name}",
                        "created_by": admin,
                    },
                )
                if created:
                    self.stdout.write(
                        self.style.SUCCESS(f"Created domain: {domain_name}")
                    )
                domains[domain_name] = domain

            # Assign specific users as domain experts for realistic demo
            # Maria Flores - Physics, Chemistry expert
            # Ben Carter - Chemistry, Biology expert  
            # Sofia Rossi - Computer Science, Graph Theory expert
            # Leo Schmidt - Biology, Geology expert
            # Kenji Tanaka - Physics, Geology expert
            
            domain_expert_assignments = {
                "Maria Flores": ["Physics", "Chemistry"],
                "Ben Carter": ["Chemistry", "Biology"], 
                "Sofia Rossi": ["Computer Science", "Graph Theory"],
                "Leo Schmidt": ["Biology", "Geology"],
                "Kenji Tanaka": ["Physics", "Geology"],
            }
            
            for author_name, domain_names in domain_expert_assignments.items():
                if author_name in users:
                    user = users[author_name]
                    for domain_name in domain_names:
                        if domain_name in domains:
                            DomainExpert.objects.get_or_create(
                                user=user,
                                domain=domains[domain_name],
                                defaults={
                                    "assigned_by": admin,
                                    "created_by": admin,
                                },
                            )
                            self.stdout.write(
                                self.style.SUCCESS(
                                    f"Assigned {author_name} as expert for {domain_name}"
                                )
                            )

            # Load entries from CSV
            entries_created = 0
            versions_created = 0

            for row in data:
                domain = domains[row["domain"]]
                author = users[row["author"]]

                # Get or create term
                term, _ = Term.objects.get_or_create(
                    text=row["term"], defaults={"created_by": admin}
                )

                # Get or create entry
                entry, entry_created = Entry.objects.get_or_create(
                    term=term,
                    domain=domain,
                    defaults={"created_by": admin},
                )
                if entry_created:
                    entries_created += 1

                # Check if this author already has an unpublished version for this entry
                existing_version = EntryVersion.objects.filter(
                    entry=entry,
                    author=author,
                    is_deleted=False,
                    is_published=False
                ).first()
                
                if existing_version:
                    # Update existing version instead of creating new one
                    existing_version.content = f"<p>{row['definition']}</p>"
                    existing_version.save()
                    version = existing_version
                else:
                    # Create new entry version
                    version = EntryVersion.objects.create(
                        entry=entry,
                        content=f"<p>{row['definition']}</p>",
                        author=author,
                        created_by=admin,
                    )
                versions_created += 1

                # Create realistic approval states
                all_users = list(users.values())
                potential_approvers = [u for u in all_users if u != author]
                approval_state = random.choices(
                    ['no_approvals', 'one_approval', 'two_approvals', 'published'],
                    weights=[20, 25, 35, 20]  # Most entries have 2 approvals, some published
                )[0]
                
                if approval_state == 'one_approval' and len(potential_approvers) >= 1:
                    approvers = random.sample(potential_approvers, 1)
                    version.approvers.add(*approvers)
                elif approval_state in ['two_approvals', 'published'] and len(potential_approvers) >= 2:
                    approvers = random.sample(potential_approvers, 2)
                    version.approvers.add(*approvers)
                    
                    # If published, mark as published and set as active version
                    if approval_state == 'published':
                        version.is_published = True
                        version.save()
                        entry.active_version = version
                        entry.save()

            self.stdout.write(self.style.SUCCESS(f"\nData loading complete!"))
            self.stdout.write(self.style.SUCCESS(f"Created {len(users)} users"))
            self.stdout.write(self.style.SUCCESS(f"Created {len(domains)} domains"))
            self.stdout.write(self.style.SUCCESS(f"Created {entries_created} entries"))
            self.stdout.write(
                self.style.SUCCESS(f"Created {versions_created} entry versions")
            )
            self.stdout.write(self.style.SUCCESS(f"\nLogin credentials:"))
            self.stdout.write(self.style.SUCCESS(f"  Superuser: admin / admin"))
            self.stdout.write(
                self.style.SUCCESS(
                    f"  Test users: <username> / <username> (e.g., maria.flores / maria.flores)"
                )
            )
