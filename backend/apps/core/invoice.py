"""
Generation de factures PDF pour Terre Noire Editions.
Charte : orange #E8601C, noir #0A0A0A, creme #FAFAF5, or #C8956C
"""
import io
import locale

from django.conf import settings
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, HRFlowable,
)


# Couleurs charte
TN_BLACK = colors.HexColor('#0A0A0A')
TN_ORANGE = colors.HexColor('#E8601C')
TN_GOLD = colors.HexColor('#C8956C')
TN_CREAM = colors.HexColor('#FAFAF5')
TN_GRAY = colors.HexColor('#6B6B6B')
TN_LIGHT = colors.HexColor('#F4F1EA')


def _fmt(n):
    """Formate un nombre en prix FCFA lisible."""
    return f"{float(n):,.0f}".replace(',', ' ')


def generate_order_invoice_pdf(order):
    """
    Genere une facture PDF pour une commande.
    Retourne un objet BytesIO contenant le PDF.
    """
    from apps.orders.models import Order

    order = Order.objects.prefetch_related('items__book__author', 'items__book__category').select_related('user').get(pk=order.pk)
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )

    styles = getSampleStyleSheet()

    # Styles personnalises
    s_title = ParagraphStyle('TnTitle', parent=styles['Heading1'], fontSize=22, textColor=TN_BLACK, spaceAfter=2, leading=26)
    s_subtitle = ParagraphStyle('TnSubtitle', parent=styles['Normal'], fontSize=10, textColor=TN_GOLD, spaceAfter=8, letterSpacing=2)
    s_normal = ParagraphStyle('TnNormal', parent=styles['Normal'], fontSize=10, textColor=TN_BLACK, leading=14)
    s_small = ParagraphStyle('TnSmall', parent=styles['Normal'], fontSize=9, textColor=TN_GRAY, leading=12)
    s_label = ParagraphStyle('TnLabel', parent=styles['Normal'], fontSize=8, textColor=TN_ORANGE, letterSpacing=1.5, spaceAfter=4)
    s_section = ParagraphStyle('TnSection', parent=styles['Heading3'], fontSize=12, textColor=TN_BLACK, spaceBefore=14, spaceAfter=6)
    s_footer = ParagraphStyle('TnFooter', parent=styles['Normal'], fontSize=8, textColor=TN_GRAY, alignment=TA_CENTER, leading=12)
    s_right = ParagraphStyle('TnRight', parent=s_normal, alignment=TA_RIGHT)

    elements = []

    # ─────────────────────────────────────────────
    # EN-TETE
    # ─────────────────────────────────────────────

    # Logo si disponible
    logo_path = getattr(settings, 'LOGO_PATH', None)
    header_parts = []
    if logo_path and logo_path.exists():
        try:
            img = Image(str(logo_path), width=16 * mm, height=16 * mm)
            header_parts.append(img)
        except Exception:
            pass

    # Bandeau entete : nom + facture n°
    header_data = [[
        Paragraph("TERRE NOIRE EDITIONS", ParagraphStyle('Brand', parent=s_title, fontSize=16, leading=20)),
        Paragraph(f"FACTURE N° {order.id:06d}", ParagraphStyle('InvNum', parent=s_normal, fontSize=12, textColor=TN_ORANGE, alignment=TA_RIGHT, fontName='Helvetica-Bold')),
    ]]
    header_table = Table(header_data, colWidths=[100 * mm, 74 * mm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 2 * mm))

    # Sous-titre
    elements.append(Paragraph("EDITIONS &middot; PORT-GENTIL, GABON", s_subtitle))

    # Barre orange
    elements.append(HRFlowable(width="100%", thickness=2, color=TN_ORANGE, spaceBefore=4, spaceAfter=10))

    # ─────────────────────────────────────────────
    # INFOS COMMANDE + CLIENT (2 colonnes)
    # ─────────────────────────────────────────────
    user = order.user
    client_name = user.get_full_name() or user.username
    phone = getattr(user, 'phone_number', '') or order.shipping_phone

    info_left = []
    MOIS_FR = ['', 'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
               'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre']
    d = order.created_at
    date_fr = f"{d.day} {MOIS_FR[d.month]} {d.year}"

    info_left.append(Paragraph("FACTURE", s_label))
    info_left.append(Paragraph(f"<b>Date :</b> {date_fr}", s_normal))
    info_left.append(Paragraph(f"<b>Heure :</b> {d.strftime('%H:%M')}", s_normal))
    info_left.append(Paragraph(f"<b>Statut :</b> {order.get_status_display()}", s_normal))
    if order.coupon_code:
        info_left.append(Paragraph(f"<b>Coupon :</b> {order.coupon_code}", s_normal))

    info_right = []
    info_right.append(Paragraph("CLIENT", s_label))
    info_right.append(Paragraph(f"<b>{client_name}</b>", s_normal))
    info_right.append(Paragraph(user.email or '', s_small))
    if phone:
        info_right.append(Paragraph(f"Tel : {phone}", s_small))

    info_data = [[
        [p for p in info_left],
        [p for p in info_right],
    ]]
    info_table = Table(info_data, colWidths=[90 * mm, 84 * mm])
    info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 6 * mm))

    # Adresse de livraison
    elements.append(Paragraph("ADRESSE DE LIVRAISON", s_label))
    addr_text = f"{order.shipping_address}"
    if order.shipping_city:
        addr_text += f", {order.shipping_city}"
    addr_text += f" — Tel : {order.shipping_phone}"
    elements.append(Paragraph(addr_text, s_normal))
    elements.append(Spacer(1, 8 * mm))

    # ─────────────────────────────────────────────
    # TABLEAU DES ARTICLES
    # ─────────────────────────────────────────────
    elements.append(Paragraph("ARTICLES COMMANDES", s_label))
    elements.append(Spacer(1, 2 * mm))

    col_widths = [8 * mm, 80 * mm, 30 * mm, 22 * mm, 34 * mm]
    data = [['#', 'Designation', 'Prix unit.', 'Qte', 'Total']]

    for idx, item in enumerate(order.items.all(), 1):
        total = float(item.price * item.quantity)
        author_name = ''
        if hasattr(item.book, 'author') and item.book.author:
            author_name = item.book.author.full_name
        title_text = item.book.title
        if author_name:
            title_text += f"<br/><font size='7' color='#6B6B6B'>{author_name}</font>"
        if hasattr(item, 'format_purchased') and item.format_purchased:
            title_text += f"<font size='7' color='#C8956C'> &middot; {item.format_purchased}</font>"

        data.append([
            str(idx),
            Paragraph(title_text, ParagraphStyle('Item', parent=s_normal, fontSize=9, leading=13)),
            f"{_fmt(item.price)} F",
            str(item.quantity),
            f"{_fmt(total)} F",
        ])

    table = Table(data, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        # Header
        ('BACKGROUND', (0, 0), (-1, 0), TN_BLACK),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('LEFTPADDING', (0, 0), (-1, 0), 8),
        ('RIGHTPADDING', (0, 0), (-1, 0), 8),
        # Body
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('LEFTPADDING', (0, 1), (-1, -1), 8),
        ('RIGHTPADDING', (0, 1), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, TN_CREAM]),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, colors.HexColor('#E0E0E0')),
        ('LINEBELOW', (0, -1), (-1, -1), 1, TN_BLACK),
        # Alignements
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 6 * mm))

    # ─────────────────────────────────────────────
    # TOTAUX
    # ─────────────────────────────────────────────
    subtotal = float(order.subtotal)
    shipping = float(order.shipping_cost)
    discount = float(order.discount_amount or 0)
    total = float(order.total_amount)

    totals_data = [
        ['Sous-total', f"{_fmt(subtotal)} FCFA"],
    ]
    if shipping > 0:
        totals_data.append(['Frais de livraison', f"{_fmt(shipping)} FCFA"])
    else:
        totals_data.append(['Frais de livraison', 'GRATUIT'])
    if discount > 0:
        totals_data.append(['Reduction', f"-{_fmt(discount)} FCFA"])
    totals_data.append(['', ''])  # separateur
    totals_data.append(['TOTAL TTC', f"{_fmt(total)} FCFA"])

    totals_table = Table(totals_data, colWidths=[120 * mm, 54 * mm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (-1, -2), TN_GRAY),
        # Ligne total final
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -1), (-1, -1), 13),
        ('TEXTCOLOR', (0, -1), (-1, -1), TN_BLACK),
        ('LINEABOVE', (0, -1), (-1, -1), 2, TN_ORANGE),
        ('TOPPADDING', (0, -1), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -2), 4),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 12 * mm))

    # ─────────────────────────────────────────────
    # MODE DE PAIEMENT
    # ─────────────────────────────────────────────
    elements.append(HRFlowable(width="100%", thickness=0.5, color=TN_GOLD, spaceBefore=2, spaceAfter=8))
    elements.append(Paragraph("MODES DE PAIEMENT ACCEPTES", s_label))
    elements.append(Paragraph(
        "Mobicash &middot; Airtel Money &middot; Especes &middot; Carte Visa",
        ParagraphStyle('Payment', parent=s_small, fontSize=9, textColor=TN_BLACK),
    ))
    elements.append(Spacer(1, 10 * mm))

    # ─────────────────────────────────────────────
    # PIED DE PAGE
    # ─────────────────────────────────────────────
    elements.append(HRFlowable(width="100%", thickness=1, color=TN_BLACK, spaceBefore=4, spaceAfter=10))
    elements.append(Paragraph("TERRE NOIRE EDITIONS", ParagraphStyle('FooterBrand', parent=s_footer, fontSize=10, textColor=TN_BLACK, fontName='Helvetica-Bold')))
    elements.append(Paragraph("Port-Gentil, Gabon &middot; olsenkampala@gmail.com &middot; Tél. +241 65 34 88 87 &middot; WhatsApp +241 76 59 35 35", s_footer))
    elements.append(Spacer(1, 4 * mm))
    elements.append(Paragraph(
        "&laquo; Demain s'ecrit aujourd'hui &raquo;",
        ParagraphStyle('Slogan', parent=s_footer, fontSize=8, textColor=TN_GOLD, fontName='Helvetica-Oblique'),
    ))
    elements.append(Spacer(1, 4 * mm))
    elements.append(Paragraph(
        "Merci pour votre confiance. Ce document fait office de facture.",
        ParagraphStyle('Legal', parent=s_footer, fontSize=7, textColor=TN_GRAY),
    ))

    doc.build(elements)
    buffer.seek(0)
    return buffer
