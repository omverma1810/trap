"""
PDF Generator for Invoices.
Generates professional retail invoices with configurable business details.
"""

import os
from decimal import Decimal


def get_business_settings():
    """Get business settings for invoice branding."""
    try:
        from invoices.models import BusinessSettings
        return BusinessSettings.get_settings()
    except Exception:
        # Return defaults if settings not available
        class DefaultSettings:
            business_name = "TRAP INVENTORY"
            tagline = "Premium Apparel"
            address_line1 = ""
            address_line2 = ""
            city = ""
            state = ""
            pincode = ""
            phone = ""
            email = ""
            website = ""
            gstin = ""
            footer_text = "Thank you for shopping with us!"
            terms_text = "All items are non-refundable. Exchange within 7 days with receipt."
        return DefaultSettings()


def generate_pdf_simple(invoice, pdf_path: str):
    """
    Generate a professional PDF invoice using reportlab.
    Fallback when WeasyPrint is not available.
    """
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch, cm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
    except ImportError:
        # If reportlab not available, create a placeholder
        with open(pdf_path, 'w') as f:
            f.write(f"Invoice: {invoice.invoice_number}")
        return
    
    settings = get_business_settings()
    doc = SimpleDocTemplate(pdf_path, pagesize=A4, leftMargin=1.5*cm, rightMargin=1.5*cm, topMargin=1.5*cm, bottomMargin=1.5*cm)
    styles = getSampleStyleSheet()
    story = []
    
    # Custom styles
    brand_style = ParagraphStyle(
        'Brand',
        parent=styles['Heading1'],
        fontSize=28,
        alignment=TA_CENTER,
        textColor=colors.Color(0.776, 0.631, 0.357),  # Gold color #C6A15B
        spaceAfter=5
    )
    
    tagline_style = ParagraphStyle(
        'Tagline',
        parent=styles['Normal'],
        fontSize=10,
        alignment=TA_CENTER,
        textColor=colors.grey,
        spaceAfter=15
    )
    
    invoice_title_style = ParagraphStyle(
        'InvoiceTitle',
        parent=styles['Heading2'],
        fontSize=14,
        alignment=TA_CENTER,
        spaceAfter=20
    )
    
    section_header_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica-Bold',
        textColor=colors.grey,
        spaceBefore=10,
        spaceAfter=5
    )
    
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=9,
        alignment=TA_CENTER,
        textColor=colors.grey
    )
    
    # Header
    story.append(Paragraph(settings.business_name, brand_style))
    if settings.tagline:
        story.append(Paragraph(settings.tagline, tagline_style))
    
    # Address line
    address_parts = []
    if settings.address_line1:
        address_parts.append(settings.address_line1)
    if settings.city:
        city_state = settings.city
        if settings.state:
            city_state += f", {settings.state}"
        if settings.pincode:
            city_state += f" - {settings.pincode}"
        address_parts.append(city_state)
    if settings.phone:
        address_parts.append(f"Phone: {settings.phone}")
    if address_parts:
        story.append(Paragraph(" | ".join(address_parts), ParagraphStyle('Address', parent=styles['Normal'], fontSize=9, alignment=TA_CENTER, textColor=colors.grey)))
    
    story.append(Spacer(1, 0.5*cm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.Color(0.9, 0.9, 0.9)))
    story.append(Spacer(1, 0.3*cm))
    
    # Invoice Title
    story.append(Paragraph("TAX INVOICE", invoice_title_style))
    
    # Invoice details and customer in two columns
    left_col = [
        ['Invoice No:', invoice.invoice_number],
        ['Date:', invoice.invoice_date.strftime('%d %b %Y')],
        ['Payment:', invoice.sale.payment_method],
    ]
    
    right_col = [
        ['Bill To:'],
        [invoice.billing_name],
        [f'Phone: {invoice.billing_phone}'],
    ]
    
    detail_table = Table([
        [
            Table(left_col, colWidths=[3*cm, 5*cm]),
            Table(right_col, colWidths=[8*cm])
        ]
    ], colWidths=[8*cm, 9*cm])
    
    detail_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(detail_table)
    story.append(Spacer(1, 0.5*cm))
    
    # Line items
    items_data = [['#', 'Description', 'Qty', 'Rate', 'Amount']]
    
    for idx, item in enumerate(invoice.items.all(), 1):
        variant_str = f" ({item.variant_details})" if item.variant_details else ""
        items_data.append([
            str(idx),
            f"{item.product_name}{variant_str}",
            str(item.quantity),
            f"₹{item.unit_price:,.2f}",
            f"₹{item.line_total:,.2f}"
        ])
    
    items_table = Table(items_data, colWidths=[1*cm, 9*cm, 1.5*cm, 2.5*cm, 3*cm])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.15, 0.15, 0.18)),  # Dark header
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
        ('ALIGN', (0, 1), (0, -1), 'CENTER'),
        ('ALIGN', (1, 1), (1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, colors.Color(0.9, 0.9, 0.9)),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 0.3*cm))
    
    # Totals - right aligned
    totals_data = []
    totals_data.append(['', '', '', 'Subtotal:', f"₹{invoice.subtotal_amount:,.2f}"])
    
    if invoice.discount_type != 'NONE' and invoice.discount_amount > 0:
        if invoice.discount_type == 'PERCENTAGE':
            discount_label = f"Discount ({invoice.discount_value}%):"
        else:
            discount_label = "Discount:"
        totals_data.append(['', '', '', discount_label, f"-₹{invoice.discount_amount:,.2f}"])
    
    totals_data.append(['', '', '', 'Total Payable:', f"₹{invoice.total_amount:,.2f}"])
    
    totals_table = Table(totals_data, colWidths=[1*cm, 9*cm, 1.5*cm, 2.5*cm, 3*cm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (3, 0), (3, -1), 'RIGHT'),
        ('ALIGN', (4, 0), (4, -1), 'RIGHT'),
        ('FONTNAME', (3, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (3, -1), (-1, -1), 11),
        ('TEXTCOLOR', (3, -1), (-1, -1), colors.Color(0.776, 0.631, 0.357)),  # Gold
        ('LINEABOVE', (3, -1), (-1, -1), 1, colors.Color(0.15, 0.15, 0.18)),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(totals_table)
    story.append(Spacer(1, 1*cm))
    
    # Terms & Conditions
    if settings.terms_text:
        story.append(Paragraph("Terms & Conditions", section_header_style))
        story.append(Paragraph(settings.terms_text, ParagraphStyle('Terms', parent=styles['Normal'], fontSize=8, textColor=colors.grey)))
        story.append(Spacer(1, 0.5*cm))
    
    # Footer
    story.append(HRFlowable(width="100%", thickness=1, color=colors.Color(0.9, 0.9, 0.9)))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph(settings.footer_text, footer_style))
    if settings.website:
        story.append(Paragraph(settings.website, footer_style))
    
    doc.build(story)


def generate_pdf_weasyprint(invoice, pdf_path: str):
    """
    Generate professional PDF invoice using WeasyPrint with HTML template.
    """
    from weasyprint import HTML
    
    settings = get_business_settings()
    
    # Build HTML content
    items_html = ""
    for idx, item in enumerate(invoice.items.all(), 1):
        variant_str = f" ({item.variant_details})" if item.variant_details else ""
        items_html += f"""
            <tr>
                <td class="center">{idx}</td>
                <td>{item.product_name}{variant_str}</td>
                <td class="right">{item.quantity}</td>
                <td class="right">₹{item.unit_price:,.2f}</td>
                <td class="right">₹{item.line_total:,.2f}</td>
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
                <td colspan="4" class="right">{discount_label}:</td>
                <td class="right">-₹{invoice.discount_amount:,.2f}</td>
            </tr>
        """
    
    # Build address
    address_parts = []
    if settings.address_line1:
        address_parts.append(settings.address_line1)
    if settings.city:
        city_line = settings.city
        if settings.state:
            city_line += f", {settings.state}"
        if settings.pincode:
            city_line += f" - {settings.pincode}"
        address_parts.append(city_line)
    address_html = "<br>".join(address_parts) if address_parts else ""
    
    contact_parts = []
    if settings.phone:
        contact_parts.append(f"Phone: {settings.phone}")
    if settings.email:
        contact_parts.append(f"Email: {settings.email}")
    contact_html = " | ".join(contact_parts) if contact_parts else ""
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            @page {{ size: A4; margin: 1.5cm; }}
            body {{ font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; color: #333; font-size: 11px; }}
            .header {{ text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #C6A15B; }}
            .brand {{ margin: 0; color: #C6A15B; font-size: 28px; font-weight: bold; letter-spacing: 2px; }}
            .tagline {{ margin: 5px 0 0 0; color: #888; font-size: 12px; }}
            .address {{ color: #888; font-size: 10px; margin-top: 8px; }}
            .invoice-title {{ text-align: center; font-size: 14px; font-weight: bold; color: #333; margin: 20px 0; text-transform: uppercase; letter-spacing: 1px; }}
            .info-section {{ display: flex; justify-content: space-between; margin-bottom: 20px; }}
            .info-block {{ }}
            .info-block h4 {{ margin: 0 0 5px 0; color: #888; font-size: 10px; text-transform: uppercase; }}
            .customer-box {{ background: #f8f8f8; padding: 12px; border-radius: 4px; }}
            .items {{ width: 100%; border-collapse: collapse; margin-bottom: 15px; }}
            .items th {{ background: #1A1B23; color: white; padding: 10px 8px; text-align: left; font-size: 10px; text-transform: uppercase; }}
            .items td {{ padding: 10px 8px; border-bottom: 1px solid #eee; }}
            .items .center {{ text-align: center; }}
            .items .right {{ text-align: right; }}
            .totals {{ width: 100%; margin-top: 10px; }}
            .totals td {{ padding: 5px 8px; }}
            .totals .right {{ text-align: right; }}
            .totals .total-row {{ font-weight: bold; font-size: 14px; color: #C6A15B; border-top: 2px solid #1A1B23; }}
            .footer {{ text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; color: #888; font-size: 10px; }}
            .terms {{ margin-top: 20px; padding: 10px; background: #f8f8f8; border-radius: 4px; }}
            .terms h4 {{ margin: 0 0 5px 0; color: #888; font-size: 10px; text-transform: uppercase; }}
            .terms p {{ margin: 0; color: #666; font-size: 9px; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1 class="brand">{settings.business_name}</h1>
            <p class="tagline">{settings.tagline}</p>
            <p class="address">{address_html}</p>
            <p class="address">{contact_html}</p>
        </div>
        
        <div class="invoice-title">Tax Invoice</div>
        
        <table style="width: 100%; margin-bottom: 20px;">
            <tr>
                <td style="vertical-align: top; width: 50%;">
                    <div class="info-block">
                        <h4>Invoice Details</h4>
                        <p><strong>Invoice No:</strong> {invoice.invoice_number}</p>
                        <p><strong>Date:</strong> {invoice.invoice_date.strftime('%d %b %Y')}</p>
                        <p><strong>Payment:</strong> {invoice.sale.payment_method}</p>
                    </div>
                </td>
                <td style="vertical-align: top; width: 50%;">
                    <div class="customer-box">
                        <h4 style="margin: 0 0 8px 0; color: #888; font-size: 10px; text-transform: uppercase;">Bill To</h4>
                        <p style="margin: 0; font-weight: bold;">{invoice.billing_name}</p>
                        <p style="margin: 3px 0 0 0;">Phone: {invoice.billing_phone}</p>
                    </div>
                </td>
            </tr>
        </table>
        
        <table class="items">
            <thead>
                <tr>
                    <th style="width: 5%;">#</th>
                    <th style="width: 50%;">Description</th>
                    <th style="width: 10%; text-align: right;">Qty</th>
                    <th style="width: 15%; text-align: right;">Rate</th>
                    <th style="width: 20%; text-align: right;">Amount</th>
                </tr>
            </thead>
            <tbody>
                {items_html}
            </tbody>
        </table>
        
        <table class="totals">
            <tr>
                <td colspan="4" class="right">Subtotal:</td>
                <td class="right" style="width: 20%;">₹{invoice.subtotal_amount:,.2f}</td>
            </tr>
            {discount_html}
            <tr class="total">
                <td colspan="4" style="text-align: right;">Total Payable:</td>
                <td class="right total-row" style="width: 20%;">₹{invoice.total_amount:,.2f}</td>
            </tr>
        </table>
        
        <div class="terms">
            <h4>Terms & Conditions</h4>
            <p>{settings.terms_text}</p>
        </div>
        
        <div class="footer">
            <p>{settings.footer_text}</p>
            <p>{settings.website if settings.website else ''}</p>
        </div>
    </body>
    </html>
    """
    
    HTML(string=html_content).write_pdf(pdf_path)
