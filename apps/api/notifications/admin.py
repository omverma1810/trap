"""
Admin configuration for Notifications app.
"""

from django.contrib import admin
from .models import Notification, EmailNotification, WhatsAppNotification, NotificationSetting


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'notification_type', 'priority', 
        'is_read', 'product_name', 'warehouse_name', 'created_at'
    ]
    list_filter = ['notification_type', 'priority', 'is_read', 'created_at']
    search_fields = ['title', 'message', 'product_name', 'product_sku']
    readonly_fields = ['id', 'created_at', 'read_at']
    date_hierarchy = 'created_at'


@admin.register(EmailNotification)
class EmailNotificationAdmin(admin.ModelAdmin):
    list_display = ['to_email', 'subject', 'status', 'created_at', 'sent_at']
    list_filter = ['status', 'created_at']
    search_fields = ['to_email', 'subject', 'body']
    readonly_fields = ['id', 'created_at', 'sent_at']


@admin.register(WhatsAppNotification)
class WhatsAppNotificationAdmin(admin.ModelAdmin):
    list_display = ['phone_number', 'message_type', 'status', 'sale_invoice_number', 'created_at', 'sent_at']
    list_filter = ['message_type', 'status', 'created_at']
    search_fields = ['phone_number', 'message', 'sale_invoice_number']
    readonly_fields = ['id', 'created_at', 'sent_at']


@admin.register(NotificationSetting)
class NotificationSettingAdmin(admin.ModelAdmin):
    list_display = [
        'email_low_stock_alerts', 'email_daily_summary',
        'whatsapp_invoice_enabled', 'smtp_host', 'updated_at'
    ]
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Email Alerts', {
            'fields': ('email_low_stock_alerts', 'email_daily_summary', 'low_stock_email_recipients')
        }),
        ('SMTP Configuration', {
            'fields': ('smtp_host', 'smtp_port', 'smtp_username', 'smtp_password', 'smtp_use_tls', 'smtp_from_email')
        }),
        ('WhatsApp Configuration', {
            'fields': ('whatsapp_invoice_enabled', 'whatsapp_business_number')
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
