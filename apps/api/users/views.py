"""
Auth Views for TRAP Inventory System.

JWT-based authentication endpoints.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from drf_spectacular.utils import extend_schema

from .models import User
from .permissions import IsAdmin
from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    UserListSerializer,
    ProfileUpdateSerializer,
    PasswordChangeSerializer,
    LoginSerializer,
    TokenResponseSerializer,
    RefreshTokenSerializer,
)


class LoginView(APIView):
    """
    Authenticate user and return JWT tokens.
    
    POST /api/v1/auth/login/
    """
    permission_classes = [AllowAny]
    
    @extend_schema(
        summary="Login",
        description="Authenticate with email and password to receive JWT tokens.",
        request=LoginSerializer,
        responses={
            200: TokenResponseSerializer,
            400: {"type": "object", "properties": {"error": {"type": "object"}}}
        },
        tags=['Authentication']
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    Logout user by blacklisting refresh token.
    
    POST /api/v1/auth/logout/
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Logout",
        description="Invalidate the refresh token.",
        request=RefreshTokenSerializer,
        responses={
            200: {"type": "object", "properties": {"message": {"type": "string"}}},
            400: {"type": "object", "properties": {"error": {"type": "object"}}}
        },
        tags=['Authentication']
    )
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)
        except TokenError:
            return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)


class RefreshView(APIView):
    """
    Refresh access token using refresh token.
    
    POST /api/v1/auth/refresh/
    """
    permission_classes = [AllowAny]
    
    @extend_schema(
        summary="Refresh Token",
        description="Get new access token using refresh token.",
        request=RefreshTokenSerializer,
        responses={
            200: {"type": "object", "properties": {"access": {"type": "string"}}},
            401: {"type": "object", "properties": {"error": {"type": "object"}}}
        },
        tags=['Authentication']
    )
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response({
                    'error': {
                        'code': 'INVALID_TOKEN',
                        'message': 'Refresh token is required'
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            
            token = RefreshToken(refresh_token)
            
            return Response({
                'access': str(token.access_token)
            }, status=status.HTTP_200_OK)
        except TokenError as e:
            return Response({
                'error': {
                    'code': 'INVALID_TOKEN',
                    'message': 'Invalid or expired refresh token'
                }
            }, status=status.HTTP_401_UNAUTHORIZED)


class MeView(APIView):
    """
    Get current authenticated user info.
    
    GET /api/v1/auth/me/
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Current User",
        description="Get the currently authenticated user's profile.",
        responses={
            200: UserSerializer,
            401: {"type": "object", "properties": {"error": {"type": "object"}}}
        },
        tags=['Authentication']
    )
    def get(self, request):
        return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)
    
    @extend_schema(
        summary="Update Profile",
        description="Update the currently authenticated user's profile.",
        request=ProfileUpdateSerializer,
        responses={
            200: UserSerializer,
            400: {"type": "object", "properties": {"error": {"type": "object"}}}
        },
        tags=['Authentication']
    )
    def patch(self, request):
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)


class PasswordChangeView(APIView):
    """
    Change current user's password.
    
    POST /api/v1/auth/password/change/
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Change Password",
        description="Change the current user's password.",
        request=PasswordChangeSerializer,
        responses={
            200: {"type": "object", "properties": {"message": {"type": "string"}}},
            400: {"type": "object", "properties": {"error": {"type": "object"}}}
        },
        tags=['Authentication']
    )
    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'message': 'Password changed successfully'}, status=status.HTTP_200_OK)


class UserListCreateView(ListCreateAPIView):
    """
    List all users or create a new user (admin only).
    
    GET  /api/v1/admin/users/
    POST /api/v1/admin/users/
    """
    permission_classes = [IsAdmin]
    queryset = User.objects.all().order_by('-date_joined')
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserListSerializer
    
    @extend_schema(
        summary="List Users",
        description="List all users in the system (admin only).",
        responses={200: UserListSerializer(many=True)},
        tags=['User Management']
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    @extend_schema(
        summary="Create User",
        description="Create a new user with email, password, and role (admin only).",
        request=UserCreateSerializer,
        responses={201: UserListSerializer},
        tags=['User Management']
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class UserDetailView(RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a user (admin only).
    
    GET    /api/v1/admin/users/{id}/
    PATCH  /api/v1/admin/users/{id}/
    DELETE /api/v1/admin/users/{id}/
    """
    permission_classes = [IsAdmin]
    queryset = User.objects.all()
    lookup_field = 'id'
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserUpdateSerializer
        return UserListSerializer
    
    @extend_schema(
        summary="Get User",
        description="Get a user's details (admin only).",
        responses={200: UserListSerializer},
        tags=['User Management']
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    @extend_schema(
        summary="Update User",
        description="Update a user's details including role and password (admin only).",
        request=UserUpdateSerializer,
        responses={200: UserListSerializer},
        tags=['User Management']
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)
    
    @extend_schema(
        summary="Delete User",
        description="Delete a user (admin only).",
        responses={204: None},
        tags=['User Management']
    )
    def delete(self, request, *args, **kwargs):
        user = self.get_object()
        if user.id == request.user.id:
            return Response(
                {'error': {'code': 'SELF_DELETE', 'message': 'Cannot delete yourself'}},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().delete(request, *args, **kwargs)
