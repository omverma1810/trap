"""
JSON logging formatter for production.
Outputs structured JSON logs for Cloud Logging integration.
"""

import json
import logging
from datetime import datetime


class JsonFormatter(logging.Formatter):
    """
    Custom JSON formatter for structured logging.
    Compatible with Google Cloud Logging.
    """
    
    def format(self, record: logging.LogRecord) -> str:
        """Format the log record as a JSON string."""
        log_data = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'severity': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
        }
        
        # Add source location for debugging
        if record.pathname:
            log_data['sourceLocation'] = {
                'file': record.pathname,
                'line': record.lineno,
                'function': record.funcName,
            }
        
        # Add exception info if present
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)
        
        # Add any extra fields
        if hasattr(record, 'request_id'):
            log_data['requestId'] = record.request_id
        if hasattr(record, 'user_id'):
            log_data['userId'] = record.user_id
        if hasattr(record, 'duration_ms'):
            log_data['durationMs'] = record.duration_ms
        if hasattr(record, 'status_code'):
            log_data['statusCode'] = record.status_code
        if hasattr(record, 'method'):
            log_data['httpMethod'] = record.method
        if hasattr(record, 'path'):
            log_data['path'] = record.path
        
        return json.dumps(log_data)
