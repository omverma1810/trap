"""
Management command to create an admin user.

Usage:
    python manage.py create_admin --email admin@example.com --password securepass
    python manage.py create_admin --email admin@example.com --password securepass --username admin
"""

from django.core.management.base import BaseCommand, CommandError
from users.models import User


class Command(BaseCommand):
    help = 'Create an admin user'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            required=True,
            help='Email for the admin user'
        )
        parser.add_argument(
            '--password',
            type=str,
            required=True,
            help='Password for the admin user'
        )
        parser.add_argument(
            '--username',
            type=str,
            help='Username (defaults to email prefix)'
        )
        parser.add_argument(
            '--first-name',
            type=str,
            default='Admin',
            help='First name'
        )
        parser.add_argument(
            '--last-name',
            type=str,
            default='User',
            help='Last name'
        )

    def handle(self, *args, **options):
        email = options['email']
        password = options['password']
        username = options['username'] or email.split('@')[0]
        first_name = options['first_name']
        last_name = options['last_name']

        # Check if user already exists
        if User.objects.filter(email=email).exists():
            raise CommandError(f'User with email {email} already exists')
        
        if User.objects.filter(username=username).exists():
            raise CommandError(f'User with username {username} already exists')

        # Create admin user
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role='ADMIN'
        )

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created admin user:\n'
                f'  Email: {user.email}\n'
                f'  Username: {user.username}\n'
                f'  Role: {user.role}'
            )
        )
