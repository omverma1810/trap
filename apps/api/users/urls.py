"""
Auth URL Configuration.
"""

from django.urls import path
from .views import LoginView, LogoutView, RefreshView, MeView, UserListCreateView, UserDetailView

urlpatterns = [
    path('login/', LoginView.as_view(), name='auth-login'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('refresh/', RefreshView.as_view(), name='auth-refresh'),
    path('me/', MeView.as_view(), name='auth-me'),
]

admin_urlpatterns = [
    path('users/', UserListCreateView.as_view(), name='admin-users-list'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='admin-users-detail'),
]
