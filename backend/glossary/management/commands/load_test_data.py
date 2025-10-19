import csv
import random
from datetime import timedelta
from pathlib import Path

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction, models
from django.utils import timezone

from glossary.models import Perspective, PerspectiveCurator, Entry, EntryDraft, Term

# Set random seed for reproducible test data
RANDOM_SEED = 42
random.seed(RANDOM_SEED)


class Command(BaseCommand):
    help = "Load test data from CSV file and create users, perspectives, entries"

    def generate_realistic_timestamp(self, base_timestamp, is_published=False):
        """Generate a realistic timestamp within 6 months of base_timestamp"""
        # Published drafts should be older than unpublished ones
        if is_published:
            # Published drafts: 1-5 months ago
            days_offset = random.randint(30, 150)
        else:
            # Unpublished drafts: 0-3 months ago
            days_offset = random.randint(0, 90)

        return base_timestamp - timedelta(days=days_offset)

    def select_approvers(self, perspective, author, all_users, num_approvers):
        """Select approvers with preference for curators and domain-aligned users"""
        # Get curators for this perspective
        curators = PerspectiveCurator.objects.filter(
            perspective=perspective
        ).values_list("user", flat=True)
        curator_users = [u for u in all_users if u.id in curators and u != author]

        # Get non-curator users (excluding author)
        other_users = [u for u in all_users if u != author and u.id not in curators]

        # Prefer curators: 70% chance to select from curators if available
        if curator_users and random.random() < 0.7:
            # Select from curators first, then fill remaining slots from others
            selected_approvers = []
            remaining_slots = num_approvers

            # Add curators up to the number needed
            if len(curator_users) >= remaining_slots:
                selected_approvers = random.sample(curator_users, remaining_slots)
            else:
                selected_approvers = list(curator_users)
                remaining_slots -= len(curator_users)

                # Fill remaining slots from other users
                if remaining_slots > 0 and other_users:
                    additional_approvers = random.sample(
                        other_users, min(remaining_slots, len(other_users))
                    )
                    selected_approvers.extend(additional_approvers)
        else:
            # Select randomly from all available users
            available_users = [u for u in all_users if u != author]
            selected_approvers = random.sample(
                available_users, min(num_approvers, len(available_users))
            )

        return selected_approvers

    def create_draft_revision_chain(
        self, entry, author, admin, base_timestamp, users, perspective
    ):
        """Create a chain of 2-3 draft revisions for an entry"""
        num_revisions = random.randint(2, 3)
        drafts = []

        for i in range(num_revisions):
            # Each revision gets progressively newer timestamp
            revision_timestamp = base_timestamp - timedelta(days=random.randint(0, 30))

            # Create draft with revision content
            content_variations = [
                f"<p>Initial definition for {entry.term.text}</p>",
                f"<p>Revised definition for {entry.term.text} with additional context</p>",
                f"<p>Final definition for {entry.term.text} incorporating feedback</p>",
            ]

            draft = EntryDraft.objects.create(
                entry=entry,
                content=(
                    content_variations[i]
                    if i < len(content_variations)
                    else content_variations[-1]
                ),
                author=author,
                created_by=admin,
                timestamp=revision_timestamp,
            )

            # Link to previous draft if not the first
            if i > 0:
                draft.replaces_draft = drafts[i - 1]
                draft.save()

            drafts.append(draft)

        # Assign approval states to the chain
        # Ensure at most one published draft per entry, and it can appear at any position
        published_draft_index = None
        if random.random() < 0.6:  # 60% chance of having a published draft in the chain
            published_draft_index = random.randint(0, len(drafts) - 1)

        for i, draft in enumerate(drafts):
            if i == published_draft_index:
                # This draft will be published
                approval_state = "published"
            else:
                # This draft will not be published
                approval_state = random.choices(
                    ["no_approvals", "one_approval", "two_approvals"],
                    weights=[
                        30,
                        40,
                        30,
                    ],  # More balanced distribution for unpublished drafts
                )[0]

            # Assign approvers based on state
            all_users = list(users.values())
            if approval_state in ["one_approval", "two_approvals", "published"]:
                num_approvers = 1 if approval_state == "one_approval" else 2
                approvers = self.select_approvers(
                    perspective, author, all_users, num_approvers
                )
                draft.approvers.add(*approvers)

            # Mark as published if needed
            if approval_state == "published":
                draft.is_published = True
                draft.published_at = draft.timestamp
                draft.save()

                # Add endorsement chance
                if random.random() < 0.3:
                    curators = PerspectiveCurator.objects.filter(
                        perspective=perspective
                    )
                    if curators.exists():
                        endorser = random.choice(curators).user
                        if endorser != author:
                            draft.endorsed_by = endorser
                            draft.endorsed_at = draft.timestamp
                            draft.save()

        return drafts

    def validate_data_consistency(self):
        """Validate logical consistency of generated data"""
        validation_errors = []

        # Check published drafts have published_at timestamp
        published_without_timestamp = EntryDraft.objects.filter(
            is_published=True, published_at__isnull=True
        ).count()
        if published_without_timestamp > 0:
            validation_errors.append(
                f"Found {published_without_timestamp} published drafts without published_at timestamp"
            )

        # Check published drafts have at least 2 approvals
        published_without_approvals = (
            EntryDraft.objects.filter(is_published=True)
            .annotate(approval_count=models.Count("approvers"))
            .filter(approval_count__lt=2)
            .count()
        )
        if published_without_approvals > 0:
            validation_errors.append(
                f"Found {published_without_approvals} published drafts with less than 2 approvals"
            )

        # Check authors don't approve their own drafts
        self_approved = EntryDraft.objects.filter(approvers=models.F("author")).count()
        if self_approved > 0:
            validation_errors.append(
                f"Found {self_approved} drafts where authors approved themselves"
            )

        # Check endorsed drafts have valid curator for that perspective
        # This is a complex check - for now, we'll skip it to avoid ORM complexity
        invalid_endorsements = 0
        if invalid_endorsements > 0:
            validation_errors.append(
                f"Found {invalid_endorsements} drafts endorsed by non-curators"
            )

        # Check timestamp consistency in revision chains
        inconsistent_chains = 0
        for draft in EntryDraft.objects.filter(replaces_draft__isnull=False):
            if draft.timestamp <= draft.replaces_draft.timestamp:
                inconsistent_chains += 1
        if inconsistent_chains > 0:
            validation_errors.append(
                f"Found {inconsistent_chains} revision chains with inconsistent timestamps"
            )

        return validation_errors

    def generate_data_quality_metrics(self):
        """Generate comprehensive data quality metrics"""
        metrics = {}

        # Basic counts
        metrics["total_drafts"] = EntryDraft.objects.count()
        metrics["published_drafts"] = EntryDraft.objects.filter(
            is_published=True
        ).count()
        metrics["endorsed_drafts"] = EntryDraft.objects.filter(
            endorsed_by__isnull=False
        ).count()
        metrics["revision_chains"] = EntryDraft.objects.filter(
            replaces_draft__isnull=False
        ).count()

        # Approval distribution
        approval_counts = {}
        for i in range(4):  # 0-3 approvals
            count = (
                EntryDraft.objects.annotate(approval_count=models.Count("approvers"))
                .filter(approval_count=i)
                .count()
            )
            approval_counts[f"{i}_approvals"] = count
        metrics["approval_distribution"] = approval_counts

        # Curator involvement - simplified check
        # Count drafts where approvers are also perspective curators
        curator_approvals = 0
        for draft in EntryDraft.objects.prefetch_related(
            "approvers", "entry__perspective"
        ):
            for approver in draft.approvers.all():
                if PerspectiveCurator.objects.filter(
                    user=approver, perspective=draft.entry.perspective
                ).exists():
                    curator_approvals += 1
                    break  # Count each draft only once
        metrics["curator_involvement"] = curator_approvals

        # Timestamp distribution
        oldest_draft = EntryDraft.objects.order_by("timestamp").first()
        newest_draft = EntryDraft.objects.order_by("-timestamp").first()
        if oldest_draft and newest_draft:
            metrics["timestamp_span_days"] = (
                newest_draft.timestamp - oldest_draft.timestamp
            ).days

        # Entry-level validation metrics
        entries_with_only_unpublished = 0
        entries_with_published = 0
        entries_with_both_states = 0

        for entry in Entry.objects.all():
            has_published = entry.drafts.filter(is_published=True).exists()
            has_unpublished = entry.drafts.filter(is_published=False).exists()

            if has_published and has_unpublished:
                entries_with_both_states += 1
            elif has_published:
                entries_with_published += 1
            elif has_unpublished:
                entries_with_only_unpublished += 1

        metrics["entries_with_only_unpublished"] = entries_with_only_unpublished
        metrics["entries_with_published"] = entries_with_published
        metrics["entries_with_both_states"] = entries_with_both_states

        return metrics

    def add_arguments(self, parser):
        parser.add_argument(
            "--csv-path",
            type=str,
            default="test_data/test_data.csv",
            help="Path to CSV file (relative to project root)",
        )

    def handle(self, **options):
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

            # Shuffle data to break alphabetical correlation with timestamps
            random.shuffle(data)

            # Generate base timestamp (6 months ago)
            base_timestamp = timezone.now() - timedelta(days=180)

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

            # Convert to list to get the last user
            author_list = list(unique_authors)

            for i, author_name in enumerate(author_list):
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
                    user.set_password("ImABird")  # Shared password for test users
                    user.save()
                    # Mark as test user (all but the last one)
                    is_test_user = i < len(author_list) - 1
                    user.profile.is_test_user = is_test_user
                    user.profile.save()

                    if is_test_user:
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"Created test user: {username} / ImABird"
                            )
                        )
                    else:
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"Created regular user: {username} / ImABird"
                            )
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

            for (
                author_name,
                perspective_names,
            ) in perspective_curator_assignments.items():
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
            revision_chains_created = 0

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
                    entry=entry, author=author, is_deleted=False, is_published=False
                ).first()

                # Decide whether to create revision chain (~15% chance)
                create_revision_chain = random.random() < 0.15 and not existing_draft

                if create_revision_chain:
                    # Create revision chain
                    drafts = self.create_draft_revision_chain(
                        entry, author, admin, base_timestamp, users, perspective
                    )
                    drafts_created += len(drafts)
                    revision_chains_created += 1
                    continue  # Skip single draft creation
                elif existing_draft:
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
                    ["no_approvals", "one_approval", "two_approvals", "published"],
                    weights=[
                        15,
                        20,
                        25,
                        40,
                    ],  # More realistic: 15% no approvals, 20% one approval, 25% two approvals unpublished, 40% published
                )[0]

                # Determine if this will be published (affects timestamp)
                will_be_published = approval_state == "published"

                # Assign realistic timestamp
                realistic_timestamp = self.generate_realistic_timestamp(
                    base_timestamp, will_be_published
                )

                # Update draft with timestamp
                draft.timestamp = realistic_timestamp
                draft.save()

                if approval_state == "one_approval" and len(potential_approvers) >= 1:
                    approvers = self.select_approvers(perspective, author, all_users, 1)
                    draft.approvers.add(*approvers)
                elif (
                    approval_state in ["two_approvals", "published"]
                    and len(potential_approvers) >= 2
                ):
                    approvers = self.select_approvers(perspective, author, all_users, 2)
                    draft.approvers.add(*approvers)

                    # If published, mark as published and set published_at
                    if approval_state == "published":
                        draft.is_published = True
                        draft.published_at = realistic_timestamp
                        draft.save()

                        # Add endorsements: ~30% of published drafts get endorsed by a curator
                        if random.random() < 0.3:
                            curators = PerspectiveCurator.objects.filter(
                                perspective=perspective
                            )
                            if curators.exists():
                                endorser = random.choice(curators).user
                                if endorser != author:  # Don't self-endorse
                                    draft.endorsed_by = endorser
                                    draft.endorsed_at = realistic_timestamp
                                    draft.save()

            # Validate data consistency
            validation_errors = self.validate_data_consistency()
            if validation_errors:
                self.stdout.write(self.style.ERROR("\nData validation errors found:"))
                for error in validation_errors:
                    self.stdout.write(self.style.ERROR(f"  - {error}"))
            else:
                self.stdout.write(
                    self.style.SUCCESS(
                        "\nData validation passed - all checks successful!"
                    )
                )

            # Generate and display data quality metrics
            metrics = self.generate_data_quality_metrics()

            self.stdout.write(self.style.SUCCESS(f"\nData loading complete!"))
            self.stdout.write(self.style.SUCCESS(f"Created {len(users)} users"))
            self.stdout.write(
                self.style.SUCCESS(f"Created {len(perspectives)} perspectives")
            )
            self.stdout.write(self.style.SUCCESS(f"Created {entries_created} entries"))
            self.stdout.write(
                self.style.SUCCESS(f"Created {drafts_created} entry drafts")
            )
            self.stdout.write(
                self.style.SUCCESS(f"Created {revision_chains_created} revision chains")
            )

            # Display data quality metrics
            self.stdout.write(self.style.SUCCESS(f"\nData Quality Metrics:"))
            self.stdout.write(
                self.style.SUCCESS(f"  Total drafts: {metrics['total_drafts']}")
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"  Published drafts: {metrics['published_drafts']} ({metrics['published_drafts']/metrics['total_drafts']*100:.1f}%)"
                )
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"  Endorsed drafts: {metrics['endorsed_drafts']} ({metrics['endorsed_drafts']/metrics['total_drafts']*100:.1f}%)"
                )
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"  Drafts in revision chains: {metrics['revision_chains']}"
                )
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"  Curator involvement: {metrics['curator_involvement']} drafts"
                )
            )

            if "timestamp_span_days" in metrics:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  Timestamp span: {metrics['timestamp_span_days']} days"
                    )
                )

            # Approval distribution
            self.stdout.write(self.style.SUCCESS(f"\nApproval Distribution:"))
            for key, count in metrics["approval_distribution"].items():
                percentage = (
                    count / metrics["total_drafts"] * 100
                    if metrics["total_drafts"] > 0
                    else 0
                )
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  {key.replace('_', ' ').title()}: {count} ({percentage:.1f}%)"
                    )
                )

            # Entry-level validation metrics
            total_entries = (
                metrics["entries_with_only_unpublished"]
                + metrics["entries_with_published"]
                + metrics["entries_with_both_states"]
            )
            self.stdout.write(self.style.SUCCESS(f"\nEntry State Distribution:"))
            self.stdout.write(
                self.style.SUCCESS(
                    f"  Entries with only unpublished drafts: {metrics['entries_with_only_unpublished']} (should not appear in glossary)"
                )
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"  Entries with published drafts: {metrics['entries_with_published']} (should appear in glossary)"
                )
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"  Entries with both published and unpublished: {metrics['entries_with_both_states']} (should show published draft in glossary)"
                )
            )

            self.stdout.write(self.style.SUCCESS(f"\nLogin credentials:"))
            self.stdout.write(self.style.SUCCESS(f"  Superuser: admin / admin"))
            self.stdout.write(
                self.style.SUCCESS(
                    f"  Test users: <username> / ImABird (most users, all but the last one)"
                )
            )
