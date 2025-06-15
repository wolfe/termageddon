import csv
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User, Group
from glossary.models import Domain, Term, Definition

class Command(BaseCommand):
    help = 'Resets the database and optionally populates it from a CSV file.'

    def add_arguments(self, parser):
        parser.add_argument(
            'csv_file',
            nargs='?',
            type=str,
            help='The path to the CSV file to populate the database with.',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Resetting database...'))

        # Get or create the 'Test Users' group
        test_user_group, _ = Group.objects.get_or_create(name='Test Users')

        # Clear existing data
        self.stdout.write('Deleting all Definitions, Terms, Domains, and Test Users...')
        Definition.all_objects.all().delete()
        Term.all_objects.all().delete()
        Domain.all_objects.all().delete()
        User.objects.filter(groups=test_user_group).delete()
        self.stdout.write(self.style.SUCCESS('Database cleared.'))

        csv_file_path = options['csv_file']
        if not csv_file_path:
            self.stdout.write(self.style.SUCCESS('Database reset complete. No CSV file provided for populating.'))
            return

        self.stdout.write(f"Populating database from {csv_file_path}...")
        
        try:
            with open(csv_file_path, mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                
                users = {} # Cache for user objects
                domains = {} # Cache for domain objects
                terms = {} # Cache for term objects

                for row in reader:
                    domain_name = row['domain']
                    term_text = row['term']
                    definition_text = row['definition']
                    author_name = row['author']

                    # Get or create user
                    if author_name not in users:
                        username = author_name.replace(" ", "_").lower()
                        user, _ = User.objects.get_or_create(username=username)

                        # Set details, password, and group association
                        name_parts = author_name.split()
                        user.first_name = name_parts[0] if name_parts else ''
                        user.last_name = name_parts[-1] if len(name_parts) > 1 else ''
                        user.set_password('test')
                        user.save()
                        user.groups.add(test_user_group)
                        
                        users[author_name] = user
                    
                    user = users[author_name]

                    # Get or create domain
                    if domain_name not in domains:
                        domain, created = Domain.objects.get_or_create(
                            name=domain_name,
                            defaults={'created_by': user}
                        )
                        domains[domain_name] = domain
                    domain = domains[domain_name]

                    # Get or create term
                    if term_text not in terms:
                        term, created = Term.objects.get_or_create(
                            text=term_text,
                            defaults={'created_by': user}
                        )
                        terms[term_text] = term
                    term = terms[term_text]

                    # Create definition
                    Definition.objects.create(
                        term=term,
                        domain=domain,
                        definition_text=definition_text,
                        status='approved',
                        created_by=user,
                        updated_by=user
                    )
            
            # Ensure admin user exists and has a known password
            if not User.objects.filter(username='admin').exists():
                self.stdout.write("Creating default admin user...")
                admin_user = User.objects.create_superuser('admin', 'admin@example.com', 'admin')
                self.stdout.write(self.style.SUCCESS("Default admin user 'admin' with password 'admin' created."))
            
            self.stdout.write(self.style.SUCCESS(f'Successfully populated database from {csv_file_path}'))

        except FileNotFoundError:
            self.stderr.write(self.style.ERROR(f"Error: File not found at '{csv_file_path}'"))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"An error occurred: {e}")) 