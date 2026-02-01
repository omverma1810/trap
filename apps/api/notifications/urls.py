"""
URL configuration for Notifications app.
"""

from django.urls import path
from . import views

urlpatterns = [
    # Notifications
    path('', views.NotificationListView.as_view(), name='notification-list'),
    path('<uuid:pk>/', views.NotificationDetailView.as_view(), name='notification-detail'),
    path('mark-read/', views.MarkNotificationsReadView.as_view(), name='notification-mark-read'),
    path('unread-count/', views.UnreadCountView.as_view(), name='notification-unread-count'),
    
    # Low Stock
    path('low-stock/', views.LowStockView.as_view(), name='low-stock'),
    
    # Settings
    path('settings/', views.NotificationSettingsView.as_view(), name='notification-settings'),
    
    # Email
    path('email/test/', views.TestEmailView.as_view(), name='email-test'),
    
    # WhatsApp
    path('whatsapp/invoice/', views.SendWhatsAppInvoiceView.as_view(), name='whatsapp-invoice'),
    path('whatsapp/send/', views.WhatsAppMessageView.as_view(), name='whatsapp-send'),
]
