"""
PDF Generator for Invoices.
Generates non-GST retail invoices.
"""

import os
from decimal import Decimal


def generate_pdf_simple(invoice, pdf_path: str):
    """
    Generate a simple PDF invoice using reportlab.
    Fallback when WeasyPrint is not available.
    """
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch, cm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.enums import TA_CENTER, TA_RIGHT
    except ImportError:
        # If reportlab not available, create a placeholder
        with open(pdf_path, 'w') as f:
            f.write(f"Invoice: {invoice.invoice_number}")
        return
    
    doc = SimpleDocTemplate(pdf_path, pagesize=A4)
    styles = getSampleStyleSheet()
    story = []
    
    # Custom styles
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=24,
        alignment=TA_CENTER,
        spaceAfter=20
    )
    
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontSize=12,
        alignment=TA_CENTER,
        spaceAfter=10
    )
    
    right_style = ParagraphStyle(
        'Right',
        parent=styles['Normal'],
        alignment=TA_RIGHT
    )
    
    # Title
    story.append(Paragraph("TRAP INVENTORY", title_style))
    story.append(Paragraph("Tax Invoice", header_style))
    story.append(Spacer(1, 0.5*cm))
    
    # Invoice details
    invoice_info = [
        ['Invoice Number:', invoice.invoice_number],
        ['Date:', invoice.invoice_date.strftime('%d-%m-%Y')],
        ['Sale Reference:', invoice.sale.sale_number],
    ]
    
    info_table = Table(invoice_info, colWidths=[3*cm, 6*cm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 0.5*cm))
    
    # Customer details
    customer_info = [
        ['Bill To:'],
        [invoice.billing_name],
        [f'Phone: {invoice.billing_phone}'],
    ]
    
    customer_table = Table(customer_info, colWidths=[10*cm])
    customer_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ]))
    story.append(customer_table)
    story.append(Spacer(1, 0.5*cm))
    
    # Line items
    items_data = [['#', 'Item', 'Qty', 'Unit Price', 'Total']]
    
    for idx, item in enumerate(invoice.items.all(), 1):
        variant_str = f" ({item.variant_details})" if item.variant_details else ""
        items_data.append([
            str(idx),
            f"{item.product_name}{variant_str}",
            str(item.quantity),
            f"₹{item.unit_price}",
            f"₹{item.line_total}"
        ])
    
    items_table = Table(items_data, colWidths=[1*cm, 8*cm, 2*cm, 3*cm, 3*cm])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (1, 1), (1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    story.append(items_table)
    story.append(Spacer(1, 0.5*cm))
    
    # Totals
    totals_data = [
        ['Subtotal:', f"₹{invoice.subtotal_amount}"]
    ]
    
    if invoice.discount_type != 'NONE' and invoice.discount_amount > 0:
        if invoice.discount_type == 'PERCENTAGE':
            discount_label = f"Discount ({invoice.discount_value}%):"
        else:
            discount_label = "Discount:"
        totals_data.append([discount_label, f"-₹{invoice.discount_amount}"])
    
    totals_data.append(['Total Payable:', f"₹{invoice.total_amount}"])
    
    totals_table = Table(totals_data, colWidths=[12*cm, 5*cm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -1), (-1, -1), 12),
        ('LINEABOVE', (0, -1), (-1, -1), 1, colors.black),
    ]))
    story.append(totals_table)
    story.append(Spacer(1, 1*cm))
    
    # Footer
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=10,
        alignment=TA_CENTER,
        textColor=colors.grey
    )
    story.append(Paragraph("Thank you for your purchase!", footer_style))
    story.append(Paragraph("Visit us again!", footer_style))
    
    doc.build(story)


def generate_pdf_weasyprint(invoice, pdf_path: str):
    """
    Generate PDF invoice using WeasyPrint with HTML template.
    """
    from weasyprint import HTML
    
    # Build HTML content
    items_html = ""
    for idx, item in enumerate(invoice.items.all(), 1):
        variant_str = f" ({item.variant_details})" if item.variant_details else ""
        items_html += f"""
            <tr>
                <td>{idx}</td>
                <td>{item.product_name}{variant_str}</td>
                <td>{item.quantity}</td>
                <td>₹{item.unit_price}</td>
                <td>₹{item.line_total}</td>
            </tr>
        """
    
    discount_html = ""
    if invoice.discount_type != 'NONE' and invoice.discount_amount > 0:
        if invoice.discount_type == 'PERCENTAGE':
            discount_label = f"Discount ({invoice.discount_value}%)"
        else:
            discount_label = "Discount"
        discount_html = f"""
            <tr>
                <td colspan="4" style="text-align: right;">{discount_label}:</td>
                <td>-₹{invoice.discount_amount}</td>
            </tr>
        """
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; }}
            .header {{ text-align: center; margin-bottom: 30px; }}
            .header h1 {{ margin: 0; color: #333; }}
            .header h2 {{ margin: 5px 0; color: #666; font-size: 16px; }}
            .info {{ margin-bottom: 20px; }}
            .info table {{ width: 100%; }}
            .customer {{ margin-bottom: 20px; padding: 10px; background: #f5f5f5; }}
            .items {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; }}
            .items th {{ background: #333; color: white; padding: 10px; text-align: left; }}
            .items td {{ padding: 8px; border-bottom: 1px solid #ddd; }}
            .totals {{ width: 100%; }}
            .totals td {{ padding: 5px; }}
            .totals .total {{ font-weight: bold; font-size: 16px; border-top: 2px solid #333; }}
            .footer {{ text-align: center; margin-top: 40px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>TRAP INVENTORY</h1>
            <h2>Tax Invoice</h2>
        </div>
        
        <div class="info">
            <table>
                <tr>
                    <td><strong>Invoice Number:</strong> {invoice.invoice_number}</td>
                    <td style="text-align: right;"><strong>Date:</strong> {invoice.invoice_date.strftime('%d-%m-%Y')}</td>
                </tr>
                <tr>
                    <td><strong>Sale Reference:</strong> {invoice.sale.sale_number}</td>
                    <td></td>
                </tr>
            </table>
        </div>
        
        <div class="customer">
            <strong>Bill To:</strong><br>
            {invoice.billing_name}<br>
            Phone: {invoice.billing_phone}
        </div>
        
        <table class="items">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                {items_html}
            </tbody>
        </table>
        
        <table class="totals">
            <tr>
                <td colspan="4" style="text-align: right;">Subtotal:</td>
                <td>₹{invoice.subtotal_amount}</td>
            </tr>
            {discount_html}
            <tr class="total">
                <td colspan="4" style="text-align: right;">Total Payable:</td>
                <td>₹{invoice.total_amount}</td>
            </tr>
        </table>
        
        <div class="footer">
            <p>Thank you for your purchase!</p>
            <p>Visit us again!</p>
        </div>
    </body>
    </html>
    """
    
    HTML(string=html_content).write_pdf(pdf_path)
