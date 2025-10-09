from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import connection
from django.conf import settings


class Command(BaseCommand):
    help = "Reset test database by flushing and reloading test data"

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-flush",
            action="store_true",
            help="Skip database flush (useful for development)",
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("🔄 Resetting test database..."))
        
        try:
            # Flush database to remove all data
            if not options["skip_flush"]:
                self.stdout.write("🗑️  Flushing database...")
                call_command("flush", "--noinput")
                self.stdout.write(self.style.SUCCESS("✅ Database flushed"))
            
            # Load test data
            self.stdout.write("📊 Loading test data...")
            call_command("load_test_data")
            self.stdout.write(self.style.SUCCESS("✅ Test data loaded"))
            
            # Verify database state
            self.stdout.write("🔍 Verifying database state...")
            self.verify_database_state()
            
            self.stdout.write(self.style.SUCCESS("🎉 Database reset complete!"))
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"❌ Database reset failed: {str(e)}")
            )
            raise

    def verify_database_state(self):
        """Verify that the database has the expected test data"""
        from django.contrib.auth.models import User
        from glossary.models import Domain, Entry, EntryVersion
        
        # Check users
        user_count = User.objects.count()
        self.stdout.write(f"👥 Users: {user_count}")
        
        # Check domains
        domain_count = Domain.objects.count()
        self.stdout.write(f"🏷️  Domains: {domain_count}")
        
        # Check entries
        entry_count = Entry.objects.count()
        self.stdout.write(f"📝 Entries: {entry_count}")
        
        # Check versions
        version_count = EntryVersion.objects.count()
        self.stdout.write(f"📄 Versions: {version_count}")
        
        # Verify admin user exists
        admin_exists = User.objects.filter(username="admin").exists()
        if admin_exists:
            self.stdout.write(self.style.SUCCESS("✅ Admin user exists"))
        else:
            self.stdout.write(self.style.WARNING("⚠️  Admin user not found"))
        
        # Verify test users exist
        test_users = ["mariacarter", "bencarter", "sofiarossi", "leoschmidt", "kenjitanaka"]
        for username in test_users:
            if User.objects.filter(username=username).exists():
                self.stdout.write(f"✅ Test user {username} exists")
            else:
                self.stdout.write(self.style.WARNING(f"⚠️  Test user {username} not found"))
