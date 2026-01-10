"""
Barcode generation utilities.
"""

import io
import base64
from barcode import Code128
from barcode.writer import ImageWriter


def generate_barcode(barcode_value: str) -> dict:
    """
    Generate a Code128 barcode image.
    
    Args:
        barcode_value: The value to encode in the barcode
        
    Returns:
        Dictionary with barcode data and base64 image
    """
    # Create barcode
    code = Code128(barcode_value, writer=ImageWriter())
    
    # Write to buffer
    buffer = io.BytesIO()
    code.write(buffer, options={
        'module_width': 0.4,
        'module_height': 15,
        'font_size': 10,
        'text_distance': 5,
        'quiet_zone': 6.5,
    })
    
    # Get base64 encoded image
    buffer.seek(0)
    image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    return {
        'barcode': barcode_value,
        'format': 'CODE128',
        'image': f'data:image/png;base64,{image_base64}',
    }


def save_barcode_image(barcode_value: str, filepath: str) -> str:
    """
    Generate and save a barcode image to a file.
    
    Args:
        barcode_value: The value to encode
        filepath: Path to save the image (without extension)
        
    Returns:
        Full path to the saved file
    """
    code = Code128(barcode_value, writer=ImageWriter())
    filename = code.save(filepath, options={
        'module_width': 0.4,
        'module_height': 15,
        'font_size': 10,
        'text_distance': 5,
        'quiet_zone': 6.5,
    })
    return filename
