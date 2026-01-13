"""
Invoice URL Configuration.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    GenerateInvoiceView,
    InvoiceViewSet,
)

router = DefaultRouter()
router.register(r'', InvoiceViewSet, basename='invoice')

urlpatterns = [
    # Generate invoice
    path('generate/', GenerateInvoiceView.as_view(), name='generate-invoice'),
    
    # Invoice list and details (read-only)
    path('', include(router.urls)),
]
