from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
import os
from io import BytesIO


def compute_moroccan_payroll(base: float, bonuses: float = 0, deductions: float = 0):
    """Approximate Moroccan CNSS + IR calculation."""
    gross = base + bonuses

    # CNSS employee part ≈ 4.48% (capped at 6 000 MAD/month gross)
    cnss_base = min(gross, 6000)
    cnss = round(cnss_base * 0.0448, 2)

    # Taxable income = gross - CNSS - professional deduction (20%, max 2500)
    prof_ded = min(gross * 0.20, 2500)
    taxable = gross - cnss - prof_ded

    # IR tranches marocaines 2024 (monthly)
    if taxable <= 2500:
        ir = 0
    elif taxable <= 4166:
        ir = taxable * 0.10 - 250
    elif taxable <= 5000:
        ir = taxable * 0.20 - 666.67
    elif taxable <= 6666:
        ir = taxable * 0.30 - 1166.67
    elif taxable <= 15000:
        ir = taxable * 0.34 - 1433.33
    else:
        ir = taxable * 0.38 - 2033.33

    ir = max(round(ir, 2), 0)
    net = round(gross - cnss - ir - deductions, 2)

    return {"cnss": cnss, "ir": ir, "net_salary": net}


def generate_payroll_pdf(record: dict) -> BytesIO:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []

    # Title
    elements.append(Paragraph(f"BULLETIN DE PAIE - {record['month']}/{record['year']}", styles['Title']))
    elements.append(Spacer(1, 20))

    # Employee Info
    emp = record.get('employees', {})
    emp_info = [
        [f"Nom: {emp.get('full_name', '—')}", f"Matricule: {record.get('employee_id', '—')[:8]}"],
        [f"Poste: {emp.get('position', '—')}", f"Département: {emp.get('department', '—')}"],
    ]
    t_emp = Table(emp_info, colWidths=[250, 250])
    t_emp.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(t_emp)
    elements.append(Spacer(1, 30))

    # Payroll Details
    data = [
        ['Désignation', 'Base', 'Gains', 'Retenues'],
        ['Salaire de Base', f"{record['base_salary']:.2f}", f"{record['base_salary']:.2f}", ""],
        ['Primes', "", f"{record.get('bonuses', 0):.2f}", ""],
        ['Retenues (CNSS/IR/Mutuelle)', "", "", f"{record.get('cnss', 0) + record.get('ir', 0) + record.get('deductions', 0):.2f}"],
        ['', '', '', ''],
        ['TOTAL NET À PAYER', '', '', f"{record['net_salary']:.2f} MAD"],
    ]
    
    t_payroll = Table(data, colWidths=[200, 100, 100, 100])
    t_payroll.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.lightgrey),
        ('TEXTCOLOR', (0,0), (-1,0), colors.black),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 11),
        ('BOTTOMPADDING', (0,0), (-1,0), 12),
        ('GRID', (0,0), (-1,-1), 1, colors.black),
        ('FONTNAME', (-1,-1), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (-1,-1), (-1,-1), 12),
        ('BACKGROUND', (-1,-1), (-1,-1), colors.whitesmoke),
    ]))
    elements.append(t_payroll)
    
    elements.append(Spacer(1, 40))
    elements.append(Paragraph("Signature Employeur", styles['Normal']))

    doc.build(elements)
    buffer.seek(0)
    return buffer
