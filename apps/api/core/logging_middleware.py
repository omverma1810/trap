"""
Request logging middleware for production.
Logs all HTTP requests with timing and user information.
"""

import logging
import time
import uuid

logger = logging.getLogger('django.request')


class RequestLoggingMiddleware:
    """
    Middleware to log all incoming HTTP requests.
    Includes timing, status codes, and user information.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Generate request ID for tracing
        request_id = str(uuid.uuid4())[:8]
        request.request_id = request_id
        
        # Record start time
        start_time = time.time()
        
        # Process the request
        response = self.get_response(request)
        
        # Calculate duration
        duration_ms = (time.time() - start_time) * 1000
        
        # Get user info
        user_id = None
        if hasattr(request, 'user') and request.user.is_authenticated:
            user_id = request.user.id
        
        # Log the request
        log_message = f"{request.method} {request.path} {response.status_code}"
        
        # Create log record with extra fields
        extra = {
            'request_id': request_id,
            'method': request.method,
            'path': request.path,
            'status_code': response.status_code,
            'duration_ms': round(duration_ms, 2),
        }
        
        if user_id:
            extra['user_id'] = user_id
        
        # Choose log level based on status code
        if response.status_code >= 500:
            logger.error(log_message, extra=extra)
        elif response.status_code >= 400:
            logger.warning(log_message, extra=extra)
        else:
            logger.info(log_message, extra=extra)
        
        # Add request ID to response headers for debugging
        response['X-Request-ID'] = request_id
        
        return response
