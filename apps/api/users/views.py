"""
Auth Views for TRAP Inventory System.

JWT-based authentication endpoints.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from drf_spectacular.utils import extend_schema

from .models import User
from .serializers import (
    UserSerializer,
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
