"""
Barcode Utilities for TRAP Inventory System.

Provides Code128 barcode generation for products.
Barcodes are:
- Auto-generated on product creation if not provided
- Immutable once created
- Stored as both value and SVG image URL
"""

import os
import uuid
import time
import random
from pathlib import Path


def generate_barcode_value(prefix: str = "TRAP") -> str:
    """
    Generate a unique Code128-compatible barcode value.
    
    Format: {PREFIX}-{TIMESTAMP_PART}-{RANDOM_PART}
    Example: TRAP-168432-7X9K2
    
    Args:
        prefix: Barcode prefix (default: "TRAP")
    
    Returns:
        Unique barcode string (max 128 chars)
    """
    timestamp_part = str(int(time.time()))[-6:]  # Last 6 digits of timestamp
    random_part = ''.join(random.choices('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', k=5))
    
    barcode = f"{prefix}-{timestamp_part}-{random_part}"
    return barcode


def generate_sku(product_name: str, brand: str = "") -> str:
    """
    Generate a unique SKU based on product name and brand.
    
    Format: {BRAND_CODE}-{NAME_CODE}-{RANDOM}
    Example: TRP-TSHRT-A7K2
    
    Args:
        product_name: Product name
        brand: Brand name (optional)
    
    Returns:
        Unique SKU string (max 100 chars)
    """
    # Extract brand code (first 3 chars, uppercase)
    brand_code = ''.join(c for c in brand.upper() if c.isalnum())[:3] or "GEN"
    
    # Extract product code (first 5 consonants/chars)
    name_clean = ''.join(c for c in product_name.upper() if c.isalnum())
    name_code = name_clean[:5] if len(name_clean) >= 5 else name_clean.ljust(5, 'X')
    
    # Random suffix for uniqueness
    random_suffix = ''.join(random.choices('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', k=4))
    
    sku = f"{brand_code}-{name_code}-{random_suffix}"
    return sku


def generate_barcode_svg(barcode_value: str, output_dir: str = None) -> str:
    """
    Generate Code128 barcode as SVG and save to file.
    
    Args:
        barcode_value: The barcode value to encode
        output_dir: Directory to save SVG (default: media/barcodes)
    
    Returns:
        Relative URL path to the generated SVG file
    """
    try:
        import barcode
        from barcode.writer import SVGWriter
    except ImportError:
        # Fallback if python-barcode not installed
        return ""
    
    if output_dir is None:
        # Default to Django media directory
        from django.conf import settings
        output_dir = os.path.join(settings.MEDIA_ROOT, 'barcodes')
    
    # Ensure directory exists
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    filename = f"{barcode_value}_{uuid.uuid4().hex[:8]}"
    filepath = os.path.join(output_dir, filename)
    
    # Generate Code128 barcode
    code128 = barcode.get('code128', barcode_value, writer=SVGWriter())
    
    # Save barcode (adds .svg extension automatically)
    saved_path = code128.save(filepath, options={
        'module_width': 0.4,
        'module_height': 15.0,
        'font_size': 10,
        'text_distance': 5.0,
        'quiet_zone': 6.5,
    })
    
    # Return relative URL
    from django.conf import settings
    relative_path = os.path.relpath(saved_path, settings.MEDIA_ROOT)
    return f"/media/{relative_path}"


def validate_barcode_immutability(old_barcode: str, new_barcode: str) -> None:
    """
    Validate that barcode is not being changed.
    
    Args:
        old_barcode: Existing barcode value
        new_barcode: New barcode value being set
    
    Raises:
        ValueError: If attempting to change an existing barcode
    """
    if old_barcode and new_barcode and old_barcode != new_barcode:
        raise ValueError("Barcode cannot be modified after creation.")
