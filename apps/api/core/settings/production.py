"""
Django production settings for TRAP Inventory API.
Optimized for Google Cloud Run + Cloud SQL.
"""

import os
import json
from .base import *

# ========================================
# SECURITY SETTINGS
# ========================================

# SECURITY: debug must be False in production
DEBUG = False

# Get allowed hosts from environment (filter empty strings)
ALLOWED_HOSTS = [
    host.strip() 
    for host in os.getenv('DJANGO_ALLOWED_HOSTS', '').split(',') 
    if host.strip()
]

# CSRF trusted origins (required for Cloud Run, must include scheme)
CSRF_TRUSTED_ORIGINS = [
    origin.strip() 
    for origin in os.getenv('CSRF_TRUSTED_ORIGINS', '').split(',') 
    if origin.strip()
]

# ========================================
# DATABASE - Google Cloud SQL
# ========================================

# Cloud SQL connection options:
# 1. Direct connection (private IP or Cloud SQL Proxy)
# 2. Unix socket (Cloud Run with Cloud SQL connector)

if os.getenv('CLOUD_SQL_CONNECTION_NAME'):
    # Cloud Run with Unix socket connection
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('POSTGRES_DB'),
            'USER': os.getenv('POSTGRES_USER'),
            'PASSWORD': os.getenv('POSTGRES_PASSWORD'),
            'HOST': f"/cloudsql/{os.getenv('CLOUD_SQL_CONNECTION_NAME')}",
            'PORT': '',
        }
    }
else:
    # Direct connection (development or Cloud SQL Proxy)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('POSTGRES_DB'),
            'USER': os.getenv('POSTGRES_USER'),
            'PASSWORD': os.getenv('POSTGRES_PASSWORD'),
            'HOST': os.getenv('POSTGRES_HOST', 'localhost'),
            'PORT': os.getenv('POSTGRES_PORT', '5432'),
            'CONN_MAX_AGE': 60,
            'OPTIONS': {
                'connect_timeout': 10,
            },
        }
    }

# ========================================
# CORS SETTINGS
# ========================================

CORS_ALLOWED_ORIGINS = [
    origin.strip() 
    for origin in os.getenv('CORS_ALLOWED_ORIGINS', '').split(',') 
    if origin.strip()
]
CORS_ALLOW_CREDENTIALS = True

# ========================================
# STATIC FILES (WhiteNoise)
# ========================================

# Insert WhiteNoise after SecurityMiddleware
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')

# Add request logging middleware
MIDDLEWARE.append('core.logging_middleware.RequestLoggingMiddleware')

# WhiteNoise configuration
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# ========================================
# HTTPS SECURITY
# ========================================

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Cloud Run terminates SSL, so we trust the proxy header
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Enable secure cookies
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True

# ========================================
# REST FRAMEWORK (Production)
# ========================================

# Only JSON renderer in production (no browsable API)
REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'] = [
    'core.renderers.CamelCaseJSONRenderer',
]

# ========================================
# STRUCTURED LOGGING (JSON)
# ========================================

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            '()': 'core.logging_formatter.JsonFormatter',
        },
        'standard': {
            'format': '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'gunicorn': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# ========================================
# ENVIRONMENT IDENTIFIER
# ========================================

ENVIRONMENT = 'production'

