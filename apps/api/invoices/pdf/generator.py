"""
PDF Generator for Invoices.
Generates traditional Indian Tax Invoice (Tally-style) for EDIT - BY TRAP.

PHASE 14: INVOICE PDFs & COMPLIANCE
====================================
- Traditional Indian invoice format (matching customer_bill.pdf)
- Sl No. | Description | HSN/SAC | Quantity | Rate | per | Disc.% | Amount
- Amount in words (INR ... Only)
- Company bank details + Declaration + Authorised Signatory
- "This is a Computer Generated Invoice" footer
"""

import os
from decimal import Decimal


def get_business_settings():
    """Get business settings for invoice branding."""
    try:
        from invoices.models import BusinessSettings
        return BusinessSettings.get_settings()
    except Exception:
        class DefaultSettings:
            business_name = "EDIT - BY TRAP"
            tagline = ""
            address_line1 = "P No 385, Ground Floor, Film Nagar,"
            address_line2 = "Jubilee Hills, Hyderabad-500033"
            city = "Hyderabad"
            state = "Telangana"
            pincode = "500033"
            phone = ""
            email = ""
            website = ""
            gstin = "36AAXFT4221H1ZU"
            footer_text = ""
            terms_text = ""
        return DefaultSettings()


def amount_to_words(amount):
    """
    Convert a decimal/float amount to Indian English words.
    Example: 2500.50 → 'Two Thousand Five Hundred and Fifty Paise'
    """
    ones = [
        '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
        'Seventeen', 'Eighteen', 'Nineteen'
    ]
    tens_list = [
        '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty',
        'Sixty', 'Seventy', 'Eighty', 'Ninety'
    ]

    def two_dig(n):
        if n == 0:
            return ''
        if n < 20:
            return ones[n]
        return tens_list[n // 10] + (' ' + ones[n % 10] if n % 10 else '')

    def three_dig(n):
        if n == 0:
            return ''
        if n < 100:
            return two_dig(n)
        return ones[n // 100] + ' Hundred' + (' ' + two_dig(n % 100) if n % 100 else '')

    try:
        total = float(amount)
    except (TypeError, ValueError):
        return 'Zero'

    rupees = int(total)
    paise = round((total - rupees) * 100)

    if rupees == 0 and paise == 0:
        return 'Zero'

    parts = []
    crore = rupees // 10000000
    rupees %= 10000000
    lakh = rupees // 100000
    rupees %= 100000
    thousand = rupees // 1000
    rupees %= 1000
    remaining = rupees

    if crore:
        parts.append(three_dig(crore) + ' Crore')
    if lakh:
        parts.append(three_dig(lakh) + ' Lakh')
    if thousand:
        parts.append(three_dig(thousand) + ' Thousand')
    if remaining:
        parts.append(three_dig(remaining))

    result = ' '.join(parts)
    if paise:
        result += f' and {two_dig(paise)} Paise'

    return result


def generate_pdf_weasyprint(invoice, pdf_path: str):
    """
    Generate traditional Indian-style Tax Invoice PDF using WeasyPrint.

    Layout matches customer_bill.pdf (Tally-style):
    - Header: Company name + address (left) | Tax Invoice + details (right)
    - Buyer (Bill to) section
    - Items table: Sl No. | Description | HSN/SAC | Qty | Rate | per | Disc.% | Amount
    - Totals + E.&O.E.
    - Amount Chargeable in words
    - Bank details (left) | Declaration + Signature (right)
    - "This is a Computer Generated Invoice"
    """
    from html import escape
    from weasyprint import HTML

    settings = get_business_settings()

    def fmt_money(value):
        try:
            return f"{Decimal(value):,.2f}"
        except Exception:
            return "0.00"

    def clean(value):
        if value is None:
            return ''
        if hasattr(value, 'strftime'):
            return value.strftime('%d-%b-%y')
        return str(value).strip()

    # Brand identity and statutory details are fixed to match the approved bill format.
    biz_name = "EDIT - BY TRAP"
    addr1 = "P No 385, Ground Floor"
    addr2 = "Film Nagar, Jubilee Hills"
    addr3 = "Hyderabad-500033"
    gstin = "36AAXFT4221H1ZU"
    contact_html = (
        f'<div class="company-line">{escape(clean(settings.phone))}</div>'
        if clean(settings.phone) else ''
    )

    # Exact bank details from the provided bill template.
    bank_name = "ICICI Bank Account - OD"
    bank_acno = "041005006897"
    bank_ifsc = "ICIC0000410"

    payment_methods = []
    if hasattr(invoice.sale, 'payments'):
        for payment in invoice.sale.payments.all():
            if hasattr(payment, 'get_method_display'):
                payment_methods.append(payment.get_method_display())
            else:
                payment_methods.append(str(payment.method).replace('_', ' ').title())
    payment_terms = ', '.join(payment_methods) if payment_methods else 'Cash'

    invoice_date_str = invoice.invoice_date.strftime('%d-%b-%y')
    delivery_note = clean(getattr(invoice.sale, 'delivery_note', ''))
    reference_no_date = clean(getattr(invoice.sale, 'reference_no_date', ''))
    other_references = clean(getattr(invoice.sale, 'other_references', ''))
    buyers_order_no = clean(getattr(invoice.sale, 'buyers_order_no', ''))
    buyers_order_date = clean(getattr(invoice.sale, 'buyers_order_date', ''))
    dispatch_doc_no = clean(getattr(invoice.sale, 'dispatch_doc_no', ''))
    delivery_note_date = clean(getattr(invoice.sale, 'delivery_note_date', ''))
    dispatched_through = clean(getattr(invoice.sale, 'dispatched_through', ''))
    destination = clean(getattr(invoice.sale, 'destination', ''))
    terms_of_delivery = clean(getattr(invoice.sale, 'terms_of_delivery', ''))

    billing_name = clean(invoice.billing_name)
    billing_phone = clean(invoice.billing_phone)
    customer_identity = f"{billing_name} {billing_phone}".strip()
    if not customer_identity:
        customer_identity = "Walk-in Customer"

    customer_email = clean(getattr(invoice.sale, 'customer_email', ''))
    customer_address = clean(getattr(invoice.sale, 'customer_address', ''))
    buyer_email_html = (
        f'<div class="buyer-line">E-mail : {escape(customer_email)}</div>'
        if customer_email else ''
    )
    buyer_address_html = (
        f'<div class="buyer-line">{escape(customer_address)}</div>'
        if customer_address else ''
    )
    buyer_gstin_html = (
        f'<div class="buyer-line">GSTIN : {escape(clean(invoice.billing_gstin))}</div>'
        if clean(invoice.billing_gstin) else ''
    )

    items_rows_html = ""
    total_quantity = 0
    all_items = list(invoice.items.all())

    for idx, item in enumerate(all_items, 1):
        qty = int(item.quantity or 0)
        total_quantity += qty

        line_total = Decimal(item.line_total_with_gst or Decimal('0.00'))
        display_rate = (line_total / qty) if qty else Decimal(item.unit_price or Decimal('0.00'))

        variant_html = (
            f'<div class="item-subtext">({escape(clean(item.variant_details))})</div>'
            if clean(item.variant_details) else ''
        )
        sku_html = (
            f'<div class="item-subtext">SKU: {escape(clean(item.sku))}</div>'
            if clean(item.sku) else ''
        )

        items_rows_html += f"""
            <tr class="item-row">
                <td class="cell-center">{idx}</td>
                <td class="cell-left">{escape(clean(item.product_name))}{variant_html}{sku_html}</td>
                <td class="cell-center"></td>
                <td class="cell-center"><b>{qty} Nos</b></td>
                <td class="cell-right">{fmt_money(display_rate)}</td>
                <td class="cell-center">Nos</td>
                <td class="cell-center">&#8212;</td>
                <td class="cell-right"><b>{fmt_money(line_total)}</b></td>
            </tr>"""

    min_rows = max(8, len(all_items))
    for _ in range(min_rows - len(all_items)):
        items_rows_html += """
            <tr class="item-row filler-row">
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
            </tr>"""

    discount_row_html = ''
    if invoice.discount_type != 'NONE' and Decimal(invoice.discount_amount or 0) > 0:
        if invoice.discount_type == 'PERCENTAGE':
            discount_value = clean(invoice.discount_value) or '0'
            disc_label = f"Discount ({discount_value}%)"
        else:
            disc_label = 'Discount'
        discount_row_html = f"""
            <tr class="discount-row">
                <td colspan="7" class="cell-right">{escape(disc_label)}</td>
                <td class="cell-right">- &#8377; {fmt_money(invoice.discount_amount)}</td>
            </tr>"""

    grand_total = Decimal(invoice.total_amount or Decimal('0.00'))
    amount_words = amount_to_words(grand_total)

    html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
    @page {{
        size: A4;
        margin: 0.6cm;
    }}

    * {{
        box-sizing: border-box;
    }}

    body {{
        margin: 0;
        font-family: Arial, sans-serif;
        font-size: 10px;
        color: #111;
    }}

    .invoice-shell {{
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #444;
    }}

    .invoice-shell > tbody > tr > td {{
        border: 1px solid #444;
        vertical-align: top;
    }}

    .doc-title {{
        text-align: center;
        font-size: 15px;
        letter-spacing: 0.6px;
        font-weight: 700;
        padding: 6px 0;
    }}

    .company-col {{
        width: 52%;
        padding: 8px 9px;
    }}

    .meta-col {{
        width: 48%;
        padding: 0;
    }}

    .company-name {{
        font-size: 13px;
        font-weight: 700;
        margin-bottom: 3px;
        letter-spacing: 0.2px;
    }}

    .company-line {{
        font-size: 10px;
        line-height: 1.3;
    }}

    .meta-grid {{
        width: 100%;
        border-collapse: collapse;
    }}

    .meta-grid td {{
        border: 1px solid #888;
        padding: 4px 6px;
        vertical-align: top;
        width: 50%;
    }}

    .meta-label {{
        font-size: 8px;
        color: #222;
        margin-bottom: 1px;
    }}

    .meta-value {{
        font-size: 9px;
        font-weight: 600;
        min-height: 11px;
    }}

    .buyer-col {{
        padding: 6px 9px;
        min-height: 82px;
    }}

    .buyer-caption {{
        font-size: 8px;
        margin-bottom: 2px;
    }}

    .buyer-main {{
        font-size: 10px;
        font-weight: 700;
        margin-bottom: 6px;
    }}

    .buyer-line {{
        font-size: 9px;
        line-height: 1.3;
    }}

    .items-holder {{
        padding: 0;
    }}

    .items-grid {{
        width: 100%;
        border-collapse: collapse;
    }}

    .items-grid th,
    .items-grid td {{
        border: 1px solid #888;
        padding: 4px 5px;
        font-size: 9px;
    }}

    .items-grid th {{
        font-weight: 500;
        text-align: center;
    }}

    .cell-center {{
        text-align: center;
    }}

    .cell-right {{
        text-align: right;
        white-space: nowrap;
    }}

    .cell-left {{
        text-align: left;
    }}

    .item-subtext {{
        font-size: 8px;
        color: #555;
    }}

    .filler-row td {{
        height: 32px;
    }}

    .discount-row td {{
        font-size: 9px;
        padding-top: 3px;
        padding-bottom: 3px;
    }}

    .total-row td {{
        font-size: 10px;
        font-weight: 600;
        padding-top: 5px;
        padding-bottom: 5px;
    }}

    .words-row td {{
        padding: 4px 6px;
        vertical-align: top;
    }}

    .words-label {{
        font-size: 8px;
        margin-bottom: 2px;
    }}

    .words-value {{
        font-size: 10px;
        font-weight: 600;
    }}

    .eoe-cell {{
        text-align: right;
        font-size: 8px;
        font-style: italic;
    }}

    .declaration-col {{
        width: 52%;
        padding: 6px 9px;
        min-height: 86px;
        vertical-align: bottom;
    }}

    .section-title {{
        font-size: 9px;
        margin-bottom: 2px;
    }}

    .declaration-text {{
        font-size: 9px;
        line-height: 1.3;
    }}

    .bank-sign-col {{
        width: 48%;
        padding: 4px 6px 4px;
    }}

    .bank-title {{
        text-align: center;
        font-size: 10px;
        margin-bottom: 2px;
    }}

    .bank-grid {{
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 6px;
    }}

    .bank-grid td {{
        border: 0;
        font-size: 10px;
        padding: 0;
        line-height: 1.25;
    }}

    .bank-grid td:first-child {{
        width: 43%;
    }}

    .bank-grid td:nth-child(2) {{
        width: 5%;
        text-align: center;
    }}

    .sign-company {{
        text-align: right;
        font-size: 10px;
        margin-top: 3px;
        margin-bottom: 17px;
        font-weight: 600;
    }}

    .sign-label {{
        text-align: right;
        font-size: 10px;
    }}

    .computer-note {{
        text-align: center;
        font-size: 10px;
        padding: 6px 4px;
    }}
</style>
</head>
<body>
<table class="invoice-shell">
    <tr>
        <td colspan="2" class="doc-title">INVOICE</td>
    </tr>

    <tr>
        <td class="company-col">
            <div class="company-name">{escape(biz_name)}</div>
            <div class="company-line">{escape(addr1)}</div>
            <div class="company-line">{escape(addr2)}</div>
            <div class="company-line">{escape(addr3)}</div>
            <div class="company-line">GSTIN/UIN: {escape(gstin)}</div>
            <div class="company-line">State Name : Telangana, Code : 36</div>
            {contact_html}
        </td>

        <td class="meta-col">
            <table class="meta-grid">
                <tr>
                    <td>
                        <div class="meta-label">Invoice No.</div>
                        <div class="meta-value">{escape(clean(invoice.invoice_number))}</div>
                    </td>
                    <td>
                        <div class="meta-label">Dated</div>
                        <div class="meta-value">{escape(invoice_date_str)}</div>
                    </td>
                </tr>
                <tr>
                    <td>
                        <div class="meta-label">Delivery Note</div>
                        <div class="meta-value">{escape(delivery_note)}</div>
                    </td>
                    <td>
                        <div class="meta-label">Mode/Terms of Payment</div>
                        <div class="meta-value">{escape(payment_terms)}</div>
                    </td>
                </tr>
                <tr>
                    <td>
                        <div class="meta-label">Reference No. &amp; Date.</div>
                        <div class="meta-value">{escape(reference_no_date)}</div>
                    </td>
                    <td>
                        <div class="meta-label">Other References</div>
                        <div class="meta-value">{escape(other_references)}</div>
                    </td>
                </tr>
                <tr>
                    <td>
                        <div class="meta-label">Buyer&#39;s Order No.</div>
                        <div class="meta-value">{escape(buyers_order_no)}</div>
                    </td>
                    <td>
                        <div class="meta-label">Dated</div>
                        <div class="meta-value">{escape(buyers_order_date)}</div>
                    </td>
                </tr>
                <tr>
                    <td>
                        <div class="meta-label">Dispatch Doc No.</div>
                        <div class="meta-value">{escape(dispatch_doc_no)}</div>
                    </td>
                    <td>
                        <div class="meta-label">Delivery Note Date</div>
                        <div class="meta-value">{escape(delivery_note_date)}</div>
                    </td>
                </tr>
                <tr>
                    <td>
                        <div class="meta-label">Dispatched through</div>
                        <div class="meta-value">{escape(dispatched_through)}</div>
                    </td>
                    <td>
                        <div class="meta-label">Destination</div>
                        <div class="meta-value">{escape(destination)}</div>
                    </td>
                </tr>
                <tr>
                    <td colspan="2">
                        <div class="meta-label">Terms of Delivery</div>
                        <div class="meta-value">{escape(terms_of_delivery)}</div>
                    </td>
                </tr>
            </table>
        </td>
    </tr>

    <tr>
        <td colspan="2" class="buyer-col">
            <div class="buyer-caption">Buyer (Bill to)</div>
            <div class="buyer-main">{escape(customer_identity)}</div>
            {buyer_email_html}
            {buyer_address_html}
            {buyer_gstin_html}
            <div class="buyer-line">State Name : Telangana, Code : 36</div>
        </td>
    </tr>

    <tr>
        <td colspan="2" class="items-holder">
            <table class="items-grid">
                <thead>
                    <tr>
                        <th style="width:5%;">Sl<br>No.</th>
                        <th style="width:40%;">Description of Goods</th>
                        <th style="width:10%;">HSN/SAC</th>
                        <th style="width:10%;">Quantity</th>
                        <th style="width:11%;">Rate</th>
                        <th style="width:6%;">per</th>
                        <th style="width:8%;">Disc. %</th>
                        <th style="width:10%;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {items_rows_html}
                </tbody>
                <tfoot>
                    {discount_row_html}
                    <tr class="total-row">
                        <td></td>
                        <td class="cell-right">Total</td>
                        <td></td>
                        <td class="cell-center"><b>{total_quantity} Nos</b></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td class="cell-right"><b>&#8377; {fmt_money(grand_total)}</b></td>
                    </tr>
                    <tr class="words-row">
                        <td colspan="7">
                            <div class="words-label">Amount Chargeable (in words)</div>
                            <div class="words-value">INR {escape(amount_words)} Only</div>
                        </td>
                        <td class="eoe-cell">E. &amp; O.E</td>
                    </tr>
                </tfoot>
            </table>
        </td>
    </tr>

    <tr>
        <td class="declaration-col">
            <div class="section-title">Declaration</div>
            <div class="declaration-text">1) Prices are inclusive of taxes. 2) Subject to Hyderabad Jurisdiction. 3) Goods Once sold will not be taken back.</div>
        </td>
        <td class="bank-sign-col">
            <div class="bank-title">Company&#39;s Bank Details</div>
            <table class="bank-grid">
                <tr>
                    <td>Bank Name</td>
                    <td>:</td>
                    <td><b>{escape(bank_name)}</b></td>
                </tr>
                <tr>
                    <td>A/c No.</td>
                    <td>:</td>
                    <td><b>{escape(bank_acno)}</b></td>
                </tr>
                <tr>
                    <td>Branch &amp; IFS Code</td>
                    <td>:</td>
                    <td><b>{escape(bank_ifsc)}</b></td>
                </tr>
            </table>
            <div class="sign-company">for {escape(biz_name)}</div>
            <div class="sign-label">Authorised Signatory</div>
        </td>
    </tr>

    <tr>
        <td colspan="2" class="computer-note">This is a Computer Generated Invoice</td>
    </tr>
</table>
</body>
</html>"""

    HTML(string=html_content).write_pdf(pdf_path)


def generate_pdf_simple(invoice, pdf_path: str):
    """
    Generate traditional Indian-style Tax Invoice using ReportLab.
    Fallback when WeasyPrint is not available.
    """
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table,
            TableStyle, HRFlowable
        )
        from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
    except ImportError:
        with open(pdf_path, 'w') as f:
            f.write(f"Invoice: {invoice.invoice_number}\nTotal: {invoice.total_amount}")
        return

    settings = get_business_settings()
    doc = SimpleDocTemplate(
        pdf_path, pagesize=A4,
        leftMargin=1*cm, rightMargin=1*cm,
        topMargin=1*cm, bottomMargin=1*cm
    )
    styles = getSampleStyleSheet()
    story = []

    biz_name = settings.business_name
    gstin = settings.gstin if settings.gstin else "36AAXFT4221H1ZU"
    grand_total = invoice.total_amount
    amount_words = amount_to_words(grand_total)
    invoice_date_str = invoice.invoice_date.strftime('%d-%b-%Y')

    # Payment methods
    payment_methods = []
    if hasattr(invoice.sale, 'payments'):
        for payment in invoice.sale.payments.all():
            payment_methods.append(payment.method)
    payment_terms = ", ".join(payment_methods) if payment_methods else "Cash"

    # Header: business info (left) + invoice details (right)
    biz_info = Paragraph(
        f'<b><font size="14">{biz_name}</font></b><br/>'
        f'<font size="8">{settings.address_line1 or "P No 385, Ground Floor, Film Nagar,"}<br/>'
        f'{settings.address_line2 or "Jubilee Hills, Hyderabad-500033"}<br/>'
        f'<b>GSTIN/UIN :</b> {gstin}<br/>'
        f'<b>State Name :</b> Telangana, <b>Code :</b> 36</font>',
        ParagraphStyle('BizInfo', parent=styles['Normal'], leading=12)
    )
    inv_details = Paragraph(
        f'<b><font size="13">Tax Invoice</font></b><br/><br/>'
        f'<font size="8">'
        f'Invoice No. : <b>{invoice.invoice_number}</b><br/>'
        f'Dated : {invoice_date_str}<br/>'
        f'Mode/Terms : {payment_terms}'
        f'</font>',
        ParagraphStyle('InvDetails', parent=styles['Normal'], alignment=TA_CENTER, leading=12)
    )

    header_table = Table([[biz_info, inv_details]], colWidths=[10*cm, 8*cm])
    header_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('LINEAFTER', (0, 0), (0, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(header_table)

    # Buyer section
    customer_email = getattr(invoice.sale, 'customer_email', '') or ''
    customer_address = getattr(invoice.sale, 'customer_address', '') or ''
    buyer_text = (
        f'<font size="8" color="#555">Buyer (Bill to)</font><br/>'
        f'<b><font size="10">{invoice.billing_name}</font></b><br/>'
        f'<font size="8">Phone : {invoice.billing_phone}</font>'
    )
    if customer_email:
        buyer_text += f'<br/><font size="8">E-mail : {customer_email}</font>'
    if customer_address:
        buyer_text += f'<br/><font size="8">{customer_address}</font>'
    if invoice.billing_gstin:
        buyer_text += f'<br/><font size="8">GSTIN : {invoice.billing_gstin}</font>'
    buyer_text += '<br/><font size="8">State Name : Telangana, Code : 36</font>'

    buyer_para = Paragraph(buyer_text, ParagraphStyle('Buyer', parent=styles['Normal'], leading=13))
    buyer_table = Table([[buyer_para]], colWidths=[18*cm])
    buyer_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(buyer_table)

    # Items table
    items_data = [['Sl\nNo.', 'Description of Goods', 'HSN/\nSAC', 'Quantity', 'Rate', 'per', 'Disc.%', 'Amount']]

    for idx, item in enumerate(invoice.items.all(), 1):
        variant_str = f"\n({item.variant_details})" if item.variant_details else ""
        items_data.append([
            str(idx),
            f"{item.product_name}{variant_str}",
            '',
            f"{item.quantity} Nos",
            f"\u20b9{item.unit_price:,.2f}",
            'Nos',
            '\u2014',
            f"\u20b9{item.line_total_with_gst:,.2f}"
        ])

    # Blank filler rows
    for _ in range(max(0, 5 - len(list(invoice.items.all())))):
        items_data.append(['', '', '', '', '', '', '', ''])

    # Discount row
    if invoice.discount_type != 'NONE' and invoice.discount_amount > 0:
        if invoice.discount_type == 'PERCENTAGE':
            disc_label = f"Discount ({invoice.discount_value}%)"
        else:
            disc_label = "Discount"
        items_data.append(['', '', '', '', '', '', disc_label, f"-\u20b9{invoice.discount_amount:,.2f}"])

    # Total row
    items_data.append(['', '', '', '', '', '', 'Total', f"\u20b9{grand_total:,.2f}"])

    items_table = Table(
        items_data,
        colWidths=[0.8*cm, 6*cm, 1.2*cm, 1.8*cm, 2*cm, 0.9*cm, 1.2*cm, 3.1*cm]
    )
    total_rows = len(items_data)
    items_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.94, 0.94, 0.94)),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
        ('ALIGN', (3, 0), (3, -1), 'CENTER'),
        ('ALIGN', (4, 0), (4, -1), 'RIGHT'),
        ('ALIGN', (5, 0), (5, -1), 'CENTER'),
        ('ALIGN', (6, 0), (6, -1), 'CENTER'),
        ('ALIGN', (7, 0), (7, -1), 'RIGHT'),
        ('ALIGN', (6, total_rows - 1), (6, total_rows - 1), 'RIGHT'),
        ('FONTNAME', (0, total_rows - 1), (-1, total_rows - 1), 'Helvetica-Bold'),
        ('BACKGROUND', (0, total_rows - 1), (-1, total_rows - 1), colors.Color(0.97, 0.97, 0.97)),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(items_table)

    # E.&O.E. + grand total row
    eoe_table = Table(
        [['E.&O.E.', f"\u20b9{grand_total:,.2f}"]],
        colWidths=[9*cm, 9*cm]
    )
    eoe_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('LINEAFTER', (0, 0), (0, -1), 1, colors.black),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('FONTNAME', (1, 0), (1, 0), 'Helvetica-Bold'),
        ('ITALIC', (0, 0), (0, 0), 1),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(eoe_table)

    # Amount in words
    words_para = Paragraph(
        f'<b>Amount Chargeable (in words) :</b> '
        f'<i>INR {amount_words} Only</i>',
        ParagraphStyle('Words', parent=styles['Normal'], fontSize=9, leading=12)
    )
    words_table = Table([[words_para]], colWidths=[18*cm])
    words_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(words_table)

    # Bank details + Declaration
    bank_text = Paragraph(
        f'<b>Company\'s Bank Details</b><br/>'
        f'<font size="8">Bank Name : ICICI Bank Account - OD<br/>'
        f'A/c No. : 041005006897<br/>'
        f'Branch &amp; IFS Code : ICIC0000410</font>',
        ParagraphStyle('Bank', parent=styles['Normal'], leading=12)
    )
    decl_text = Paragraph(
        f'<i><font size="7" color="#555">'
        f'<u>Declaration</u><br/>'
        f'We declare that this invoice shows the actual price of the goods '
        f'described and that all particulars are true and correct.'
        f'</font></i><br/><br/>'
        f'<b>for {biz_name}</b>',
        ParagraphStyle('Decl', parent=styles['Normal'], alignment=TA_CENTER, leading=11)
    )
    bottom_table = Table([[bank_text, decl_text]], colWidths=[9*cm, 9*cm])
    bottom_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('LINEAFTER', (0, 0), (0, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 40),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(bottom_table)

    # Authorised signatory bar
    sign_table = Table(
        [['', 'Authorised Signatory']],
        colWidths=[9*cm, 9*cm]
    )
    sign_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('LINEAFTER', (0, 0), (0, -1), 1, colors.black),
        ('ALIGN', (1, 0), (1, 0), 'CENTER'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(sign_table)

    # Computer generated notice
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph(
        'This is a Computer Generated Invoice',
        ParagraphStyle(
            'Notice', parent=styles['Normal'],
            fontSize=8, alignment=TA_CENTER,
            fontName='Helvetica-Oblique', textColor=colors.grey
        )
    ))

    doc.build(story)
