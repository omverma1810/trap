"""
PDF Generator for Invoices.
Generates professional, legally compliant retail invoices.

PHASE 14: INVOICE PDFs & COMPLIANCE
====================================
- GST breakdown per line item
- Professional layout with GSTIN
- "Computer-generated invoice" footer
- Authorized signatory placeholder
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


def generate_pdf_weasyprint(invoice, pdf_path: str):
    """
    Generate professional PDF invoice using WeasyPrint with HTML template.
    
    PHASE 14 REQUIREMENTS:
    - GST columns in line items
    - GST breakdown in totals
    - Seller and buyer GSTIN
    - Computer-generated footer
    """
    from weasyprint import HTML
    
    settings = get_business_settings()
    
    # Build HTML for line items with GST
    items_html = ""
    for idx, item in enumerate(invoice.items.all(), 1):
        variant_str = f" ({item.variant_details})" if item.variant_details else ""
        items_html += f"""
            <tr>
                <td class="center">{idx}</td>
                <td>{item.product_name}{variant_str}<br><small class="sku">SKU: {item.sku}</small></td>
                <td class="right">{item.quantity}</td>
                <td class="right">₹{item.unit_price:,.2f}</td>
                <td class="right">₹{item.taxable_amount:,.2f}</td>
                <td class="right">{item.gst_percentage}%</td>
                <td class="right">₹{item.gst_amount:,.2f}</td>
                <td class="right">₹{item.line_total_with_gst:,.2f}</td>
            </tr>
        """
    
    # Build discount row
    discount_html = ""
    if invoice.discount_type != 'NONE' and invoice.discount_amount > 0:
        if invoice.discount_type == 'PERCENTAGE':
            discount_label = f"Discount ({invoice.discount_value}%)"
        else:
            discount_label = "Discount"
        discount_html = f"""
            <tr>
                <td colspan="7" class="right">{discount_label}:</td>
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
    
    # Seller GSTIN
    seller_gstin_html = f"<strong>GSTIN:</strong> {settings.gstin}" if settings.gstin else ""
    
    # Buyer info
    buyer_gstin_html = f"<p>GSTIN: {invoice.billing_gstin}</p>" if invoice.billing_gstin else ""
    
    # Payment info from sale
    payment_methods = []
    if hasattr(invoice.sale, 'payments'):
        for payment in invoice.sale.payments.all():
            payment_methods.append(f"{payment.method}: ₹{payment.amount:,.2f}")
    payment_html = ", ".join(payment_methods) if payment_methods else "N/A"
    
    # Calculate discounted subtotal
    discounted_subtotal = invoice.subtotal_amount - invoice.discount_amount
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            @page {{ size: A4; margin: 1.5cm; }}
            body {{ font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; color: #333; font-size: 10px; }}
            .header {{ text-align: center; margin-bottom: 15px; padding-bottom: 12px; border-bottom: 2px solid #C6A15B; }}
            .brand {{ margin: 0; color: #C6A15B; font-size: 24px; font-weight: bold; letter-spacing: 2px; }}
            .tagline {{ margin: 3px 0 0 0; color: #888; font-size: 11px; }}
            .address {{ color: #888; font-size: 9px; margin-top: 6px; }}
            .gstin {{ color: #333; font-size: 10px; margin-top: 4px; font-weight: bold; }}
            .invoice-title {{ text-align: center; font-size: 13px; font-weight: bold; color: #333; margin: 15px 0; text-transform: uppercase; letter-spacing: 1px; }}
            .info-table {{ width: 100%; margin-bottom: 15px; }}
            .info-block {{ vertical-align: top; }}
            .info-block h4 {{ margin: 0 0 4px 0; color: #888; font-size: 9px; text-transform: uppercase; }}
            .info-block p {{ margin: 2px 0; font-size: 10px; }}
            .customer-box {{ background: #f8f8f8; padding: 10px; border-radius: 4px; }}
            .items {{ width: 100%; border-collapse: collapse; margin-bottom: 12px; }}
            .items th {{ background: #1A1B23; color: white; padding: 8px 5px; text-align: left; font-size: 9px; text-transform: uppercase; }}
            .items td {{ padding: 8px 5px; border-bottom: 1px solid #eee; font-size: 9px; }}
            .items .center {{ text-align: center; }}
            .items .right {{ text-align: right; }}
            .sku {{ color: #888; font-size: 8px; }}
            .totals {{ width: 100%; margin-top: 8px; }}
            .totals td {{ padding: 4px 5px; font-size: 10px; }}
            .totals .right {{ text-align: right; }}
            .totals .total-row {{ font-weight: bold; font-size: 12px; color: #C6A15B; border-top: 2px solid #1A1B23; }}
            .totals .gst-row {{ background: #f8f9fa; }}
            .footer {{ text-align: center; margin-top: 25px; padding-top: 12px; border-top: 1px solid #eee; color: #888; font-size: 9px; }}
            .terms {{ margin-top: 15px; padding: 8px; background: #f8f8f8; border-radius: 4px; }}
            .terms h4 {{ margin: 0 0 4px 0; color: #888; font-size: 9px; text-transform: uppercase; }}
            .terms p {{ margin: 0; color: #666; font-size: 8px; }}
            .signatory {{ margin-top: 30px; text-align: right; }}
            .signatory-line {{ border-top: 1px solid #333; width: 150px; display: inline-block; margin-top: 40px; }}
            .signatory-text {{ font-size: 9px; color: #666; }}
            .computer-generated {{ text-align: center; font-size: 8px; color: #888; margin-top: 15px; font-style: italic; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1 class="brand">{settings.business_name}</h1>
            <p class="tagline">{settings.tagline}</p>
            <p class="address">{address_html}</p>
            <p class="address">{contact_html}</p>
            <p class="gstin">{seller_gstin_html}</p>
        </div>
        
        <div class="invoice-title">Tax Invoice</div>
        
        <table class="info-table">
            <tr>
                <td class="info-block" style="width: 50%;">
                    <h4>Invoice Details</h4>
                    <p><strong>Invoice No:</strong> {invoice.invoice_number}</p>
                    <p><strong>Date:</strong> {invoice.invoice_date.strftime('%d %b %Y')}</p>
                    <p><strong>Payment:</strong> {payment_html}</p>
                </td>
                <td class="info-block" style="width: 50%;">
                    <div class="customer-box">
                        <h4 style="margin: 0 0 6px 0; color: #888; font-size: 9px; text-transform: uppercase;">Bill To</h4>
                        <p style="margin: 0; font-weight: bold;">{invoice.billing_name}</p>
                        <p style="margin: 2px 0 0 0;">Phone: {invoice.billing_phone}</p>
                        {buyer_gstin_html}
                    </div>
                </td>
            </tr>
        </table>
        
        <table class="items">
            <thead>
                <tr>
                    <th style="width: 4%;">#</th>
                    <th style="width: 28%;">Description</th>
                    <th style="width: 6%; text-align: right;">Qty</th>
                    <th style="width: 12%; text-align: right;">Rate</th>
                    <th style="width: 14%; text-align: right;">Taxable</th>
                    <th style="width: 8%; text-align: right;">GST%</th>
                    <th style="width: 12%; text-align: right;">GST</th>
                    <th style="width: 16%; text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
                {items_html}
            </tbody>
        </table>
        
        <table class="totals">
            <tr>
                <td colspan="7" class="right">Subtotal:</td>
                <td class="right" style="width: 16%;">₹{invoice.subtotal_amount:,.2f}</td>
            </tr>
            {discount_html}
            <tr class="gst-row">
                <td colspan="7" class="right">Total GST:</td>
                <td class="right" style="width: 16%;">₹{invoice.gst_total:,.2f}</td>
            </tr>
            <tr class="total-row">
                <td colspan="7" style="text-align: right; padding-top: 8px;">Grand Total:</td>
                <td class="right" style="width: 16%; padding-top: 8px;">₹{invoice.total_amount:,.2f}</td>
            </tr>
        </table>
        
        <div class="terms">
            <h4>Terms & Conditions</h4>
            <p>{settings.terms_text}</p>
        </div>
        
        <div class="signatory">
            <div class="signatory-line"></div>
            <div class="signatory-text">Authorized Signatory</div>
        </div>
        
        <div class="computer-generated">
            This is a computer-generated invoice and does not require a physical signature.
        </div>
        
        <div class="footer">
            <p>{settings.footer_text}</p>
            <p>{settings.website if settings.website else ''}</p>
        </div>
    </body>
    </html>
    """
    
    HTML(string=html_content).write_pdf(pdf_path)


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
            f.write(f"Invoice: {invoice.invoice_number}\nTotal: ₹{invoice.total_amount}")
        return
    
    settings = get_business_settings()
    doc = SimpleDocTemplate(pdf_path, pagesize=A4, leftMargin=1*cm, rightMargin=1*cm, topMargin=1*cm, bottomMargin=1*cm)
    styles = getSampleStyleSheet()
    story = []
    
    # Custom styles
    brand_style = ParagraphStyle(
        'Brand',
        parent=styles['Heading1'],
        fontSize=24,
        alignment=TA_CENTER,
        textColor=colors.Color(0.776, 0.631, 0.357),  # Gold color #C6A15B
        spaceAfter=3
    )
    
    tagline_style = ParagraphStyle(
        'Tagline',
        parent=styles['Normal'],
        fontSize=9,
        alignment=TA_CENTER,
        textColor=colors.grey,
        spaceAfter=10
    )
    
    invoice_title_style = ParagraphStyle(
        'InvoiceTitle',
        parent=styles['Heading2'],
        fontSize=12,
        alignment=TA_CENTER,
        spaceAfter=15
    )
    
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        alignment=TA_CENTER,
        textColor=colors.grey
    )
    
    # Header
    story.append(Paragraph(settings.business_name, brand_style))
    if settings.tagline:
        story.append(Paragraph(settings.tagline, tagline_style))
    
    # Address and GSTIN
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
        story.append(Paragraph(" | ".join(address_parts), ParagraphStyle('Address', parent=styles['Normal'], fontSize=8, alignment=TA_CENTER, textColor=colors.grey)))
    if settings.gstin:
        story.append(Paragraph(f"GSTIN: {settings.gstin}", ParagraphStyle('GSTIN', parent=styles['Normal'], fontSize=9, alignment=TA_CENTER, fontName='Helvetica-Bold')))
    
    story.append(Spacer(1, 0.4*cm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.Color(0.776, 0.631, 0.357)))
    story.append(Spacer(1, 0.2*cm))
    
    # Invoice Title
    story.append(Paragraph("TAX INVOICE", invoice_title_style))
    
    # Invoice details
    detail_data = [
        [f"Invoice No: {invoice.invoice_number}", f"Bill To: {invoice.billing_name}"],
        [f"Date: {invoice.invoice_date.strftime('%d %b %Y')}", f"Phone: {invoice.billing_phone}"],
    ]
    if invoice.billing_gstin:
        detail_data.append(["", f"GSTIN: {invoice.billing_gstin}"])
    
    detail_table = Table(detail_data, colWidths=[9*cm, 9*cm])
    detail_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(detail_table)
    story.append(Spacer(1, 0.4*cm))
    
    # Line items with GST
    items_data = [['#', 'Description', 'Qty', 'Rate', 'Taxable', 'GST%', 'GST', 'Total']]
    
    for idx, item in enumerate(invoice.items.all(), 1):
        variant_str = f"\n({item.variant_details})" if item.variant_details else ""
        items_data.append([
            str(idx),
            f"{item.product_name}{variant_str}",
            str(item.quantity),
            f"₹{item.unit_price:,.2f}",
            f"₹{item.taxable_amount:,.2f}",
            f"{item.gst_percentage}%",
            f"₹{item.gst_amount:,.2f}",
            f"₹{item.line_total_with_gst:,.2f}"
        ])
    
    items_table = Table(items_data, colWidths=[0.6*cm, 5.5*cm, 1*cm, 2*cm, 2.2*cm, 1.2*cm, 2*cm, 2.5*cm])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.15, 0.15, 0.18)),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
        ('ALIGN', (0, 1), (0, -1), 'CENTER'),
        ('ALIGN', (1, 1), (1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, colors.Color(0.9, 0.9, 0.9)),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 0.2*cm))
    
    # Totals
    totals_data = [['', '', '', '', '', '', 'Subtotal:', f"₹{invoice.subtotal_amount:,.2f}"]]
    
    if invoice.discount_type != 'NONE' and invoice.discount_amount > 0:
        if invoice.discount_type == 'PERCENTAGE':
            discount_label = f"Discount ({invoice.discount_value}%):"
        else:
            discount_label = "Discount:"
        totals_data.append(['', '', '', '', '', '', discount_label, f"-₹{invoice.discount_amount:,.2f}"])
    
    totals_data.append(['', '', '', '', '', '', 'Total GST:', f"₹{invoice.gst_total:,.2f}"])
    totals_data.append(['', '', '', '', '', '', 'Grand Total:', f"₹{invoice.total_amount:,.2f}"])
    
    totals_table = Table(totals_data, colWidths=[0.6*cm, 5.5*cm, 1*cm, 2*cm, 2.2*cm, 1.2*cm, 2*cm, 2.5*cm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (6, 0), (6, -1), 'RIGHT'),
        ('ALIGN', (7, 0), (7, -1), 'RIGHT'),
        ('FONTNAME', (6, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (6, -1), (-1, -1), 10),
        ('TEXTCOLOR', (6, -1), (-1, -1), colors.Color(0.776, 0.631, 0.357)),
        ('LINEABOVE', (6, -1), (-1, -1), 1, colors.Color(0.15, 0.15, 0.18)),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('BACKGROUND', (6, -2), (-1, -2), colors.Color(0.97, 0.97, 0.97)),
    ]))
    story.append(totals_table)
    story.append(Spacer(1, 0.8*cm))
    
    # Terms
    if settings.terms_text:
        story.append(Paragraph("<b>Terms & Conditions:</b>", ParagraphStyle('TermsHeader', parent=styles['Normal'], fontSize=8, textColor=colors.grey)))
        story.append(Paragraph(settings.terms_text, ParagraphStyle('Terms', parent=styles['Normal'], fontSize=7, textColor=colors.grey)))
        story.append(Spacer(1, 0.4*cm))
    
    # Authorized Signatory
    signatory_table = Table([['', 'Authorized Signatory']], colWidths=[14*cm, 4*cm])
    signatory_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('FONTSIZE', (1, 0), (1, 0), 8),
        ('TEXTCOLOR', (1, 0), (1, 0), colors.grey),
        ('LINEABOVE', (1, 0), (1, 0), 0.5, colors.black),
        ('TOPPADDING', (1, 0), (1, 0), 30),
    ]))
    story.append(Spacer(1, 0.5*cm))
    story.append(signatory_table)
    
    # Computer Generated Notice
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph("This is a computer-generated invoice and does not require a physical signature.", 
                          ParagraphStyle('Notice', parent=styles['Normal'], fontSize=7, alignment=TA_CENTER, textColor=colors.grey, fontName='Helvetica-Oblique')))
    
    # Footer
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.Color(0.9, 0.9, 0.9)))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph(settings.footer_text, footer_style))
    if settings.website:
        story.append(Paragraph(settings.website, footer_style))
    
    doc.build(story)
