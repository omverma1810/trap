"""
Management command to promote a user to ADMIN role.

Usage:
    python manage.py promote_admin <email>
    python manage.py promote_admin --username <username>
"""

from django.core.management.base import BaseCommand, CommandError
from users.models import User


class Command(BaseCommand):
    help = 'Promote a user to ADMIN role'

    def add_arguments(self, parser):
        parser.add_argument(
            'email',
            nargs='?',
            type=str,
            help='Email of the user to promote'
        )
        parser.add_argument(
            '--username',
            type=str,
            help='Username of the user to promote (alternative to email)'
        )
        parser.add_argument(
            '--list',
            action='store_true',
            help='List all users with their roles'
        )

    def handle(self, *args, **options):
        # List all users
        if options['list']:
            users = User.objects.all().order_by('id')
            self.stdout.write("\nAll Users:")
            self.stdout.write("-" * 60)
            for user in users:
                self.stdout.write(
                    f"  ID: {user.id} | {user.email} | {user.username} | Role: {user.role}"
                )
            self.stdout.write("-" * 60)
            self.stdout.write(f"Total: {users.count()} users\n")
            return

        # Get user by email or username
        email = options['email']
        username = options['username']

        if not email and not username:
            raise CommandError('Please provide an email or --username')

        try:
            if email:
                user = User.objects.get(email=email)
            else:
                user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise CommandError(f'User not found')

        # Check current role
        if user.role == 'ADMIN':
            self.stdout.write(
                self.style.WARNING(f'User {user.email} is already an ADMIN')
            )
            return

        # Promote to admin
        old_role = user.role
        user.role = 'ADMIN'
        user.save()

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully promoted {user.email} from {old_role} to ADMIN'
            )
        )
