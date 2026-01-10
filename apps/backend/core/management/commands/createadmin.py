"""
Custom management command to create a superuser with role.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Create a superuser with admin role'

    def add_arguments(self, parser):
        parser.add_argument('--email', default='admin@trap.com')
        parser.add_argument('--password', default='admin123')
        parser.add_argument('--username', default='admin')

    def handle(self, *args, **options):
        email = options['email']
        password = options['password']
        username = options['username']

        if User.objects.filter(email=email).exists():
            self.stdout.write(self.style.WARNING(f'User {email} already exists'))
            return

        user = User.objects.create_superuser(
            email=email,
            username=username,
            password=password,
            first_name='Admin',
            last_name='User',
            role='admin'
        )
        self.stdout.write(self.style.SUCCESS(f'Superuser {email} created successfully!'))
