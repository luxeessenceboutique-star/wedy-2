"""The look of the e-mails Wedy sends to candidates (invitation, link before the interview, cancellation, test).

Written for e-mail clients, not browsers: tables and inline styles only (Gmail drops <style>, Outlook ignores
flex, rounded corners and gradients — each has a plain fallback), 600 px wide and fluid on a phone, the company's
logo as an inline image (cid:) because Gmail does not show data: images, and a hidden preheader for the inbox
preview."""
from __future__ import annotations

import base64
import html as _html
import re
from typing import Optional

LOGO_CID = "wedy-logo@wedy"
FONT = "'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
TEAL, TEAL_DARK, INK, MUTED, LINE = "#0e6f84", "#0b3f4c", "#0a1c24", "#5f7079", "#e7edf0"
TONES = {   # badge / notice colours
    "teal": ("#e4f2f4", "#0b5f72"), "green": ("#e1f5ec", "#0f6f49"), "amber": ("#fdf1dc", "#8a5207"), "red": ("#fbe9e6", "#a33a28"),
}
MONTHS_SHORT = ["JANV.", "FÉVR.", "MARS", "AVR.", "MAI", "JUIN", "JUIL.", "AOÛT", "SEPT.", "OCT.", "NOV.", "DÉC."]

e = _html.escape


def logo_image(assets: Optional[dict]) -> Optional[tuple[bytes, str]]:
    """The logo of Settings as (bytes, mime) for an inline image; None for none or for SVG (not shown by mail apps)."""
    src = (assets or {}).get("logo") if isinstance(assets, dict) else None
    m = re.match(r"data:(image/(?:png|jpe?g|gif|webp));base64,(.+)", src or "", re.S)
    if not m:
        return None
    try:
        return base64.b64decode(m.group(2)), m.group(1).replace("jpg", "jpeg")
    except Exception:
        return None


def _badge(text: str, tone: str) -> str:
    bg, fg = TONES.get(tone, TONES["teal"])
    return (f'<span style="display:inline-block;padding:5px 12px;border-radius:99px;background:{bg};color:{fg};'
            f'font:700 12px {FONT};letter-spacing:.02em">{e(text)}</span>')


def _date_block(day_number: str, month: str, long_day: str, hours: str, note: str, tone: str = "teal") -> str:
    bg, fg = TONES.get(tone, TONES["teal"])
    return f'''
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;background:{bg};border-radius:16px">
  <tr>
    <td width="78" valign="middle" style="padding:16px 0 16px 16px">
      <table role="presentation" width="62" cellpadding="0" cellspacing="0" style="border-collapse:separate;background:#ffffff;border-radius:12px;border:1px solid {LINE}">
        <tr><td align="center" style="padding:6px 0 0;font:700 11px {FONT};letter-spacing:.08em;color:{fg}">{e(month)}</td></tr>
        <tr><td align="center" style="padding:0 0 7px;font:800 26px/1.15 {FONT};color:{INK}">{e(day_number)}</td></tr>
      </table>
    </td>
    <td valign="middle" style="padding:14px 16px 14px 12px">
      <div style="font:700 17px/1.35 {FONT};color:{INK}">{e(long_day)}</div>
      <div style="font:800 22px/1.3 {FONT};color:{fg};margin-top:2px">{e(hours)}</div>
      {f'<div style="font:400 12.5px/1.4 {FONT};color:{MUTED};margin-top:3px">{e(note)}</div>' if note else ''}
    </td>
  </tr>
</table>'''


def _rows(rows: list[tuple[str, str]]) -> str:
    out = []
    for i, (label, value) in enumerate(rows):
        border = f"border-top:1px solid {LINE};" if i else ""
        out.append(f'<tr><td style="{border}padding:11px 0;font:600 11.5px {FONT};letter-spacing:.06em;text-transform:uppercase;color:{MUTED};width:120px;vertical-align:top">{e(label)}</td>'
                   f'<td style="{border}padding:11px 0;font:600 15px/1.45 {FONT};color:{INK}">{e(value)}</td></tr>')
    return f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">{"".join(out)}</table>' if out else ""


def _button(label: str, url: str) -> str:
    return f'''
<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;margin:4px 0 0">
  <tr><td bgcolor="{TEAL}" style="border-radius:12px;background:{TEAL};background-image:linear-gradient(135deg,{TEAL},#16b6c8)">
    <a href="{e(url)}" target="_blank" style="display:inline-block;padding:15px 30px;font:700 16px {FONT};color:#ffffff;text-decoration:none;border-radius:12px">{e(label)}&nbsp;&rarr;</a>
  </td></tr>
</table>
<p style="margin:10px 0 0;font:400 12px/1.5 {FONT};color:{MUTED}">Le bouton ne marche pas ? Ouvrez ce lien :
<a href="{e(url)}" style="color:{TEAL};word-break:break-all">{e(_short(url))}</a></p>'''


def _short(url: str) -> str:
    """« wedy.tython.ma/visio/m-076c…» — the address without its long access key (the link itself stays whole)."""
    bare = re.sub(r"^https?://", "", url).split("?")[0]
    return bare if len(bare) <= 46 else bare[:44] + "…"


def _notice(html_text: str, tone: str = "teal") -> str:
    bg, fg = TONES.get(tone, TONES["teal"])
    return (f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;background:{bg};border-radius:14px">'
            f'<tr><td style="padding:14px 16px;font:400 14px/1.55 {FONT};color:{fg}">{html_text}</td></tr></table>')


def _tips(title: str, items: list[str]) -> str:
    li = "".join(
        f'<tr><td width="26" valign="top" style="padding:5px 0"><span style="display:inline-block;width:18px;height:18px;line-height:18px;border-radius:50%;'
        f'background:{TONES["teal"][0]};color:{TEAL};font:700 11px/18px {FONT};text-align:center">&#10003;</span></td>'
        f'<td style="padding:5px 0;font:400 14px/1.5 {FONT};color:#33474f">{x}</td></tr>' for x in items)
    return (f'<div style="font:700 14px {FONT};color:{INK};margin:0 0 6px">{e(title)}</div>'
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">{li}</table>')


def _section(inner: str, top: int = 22) -> str:
    return f'<tr><td class="px" style="padding:{top}px 32px 0">{inner}</td></tr>'


def page(*, company: dict, has_logo: bool, preheader: str, badge: Optional[tuple[str, str]], title: str, subtitle: str = "",
         paragraphs: list[str] = (), date: Optional[dict] = None, rows: list[tuple[str, str]] = (),
         notice: Optional[tuple[str, str]] = None, button: Optional[tuple[str, str]] = None,
         tips: Optional[tuple[str, list[str]]] = None, closing: list[str] = (), kicker: str = "Recrutement") -> str:
    """One e-mail. `paragraphs`, `notice` text, `tips` items and `closing` are HTML (already escaped by the caller)."""
    name = (company.get("name") or "").strip() or "Wedy RH"
    address = ", ".join(x for x in [(company.get("address") or "").strip(), (company.get("city") or "").strip()] if x)
    brand = (f'<img src="cid:{LOGO_CID}" alt="{e(name)}" height="38" style="display:block;height:38px;max-width:180px;border:0">'
             if has_logo else f'<span style="font:800 20px {FONT};color:#ffffff;letter-spacing:-.01em">{e(name)}</span>')
    brand_cell = (f'<td valign="middle"><table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate">'
                  f'<tr><td bgcolor="#ffffff" style="background:#ffffff;border-radius:12px;padding:8px 12px">{brand}</td></tr></table></td>'
                  if has_logo else f'<td valign="middle">{brand}</td>')
    body = []
    head = (_badge(*badge) + '<div style="height:12px;line-height:12px">&nbsp;</div>') if badge else ""
    body.append(_section(
        f'{head}<h1 style="margin:0;font:800 26px/1.25 {FONT};color:{INK};letter-spacing:-.01em">{e(title)}</h1>'
        + (f'<p style="margin:8px 0 0;font:400 15px/1.5 {FONT};color:{MUTED}">{e(subtitle)}</p>' if subtitle else ""), top=30))
    if paragraphs:
        body.append(_section("".join(f'<p style="margin:0 0 12px;font:400 15px/1.65 {FONT};color:#33474f">{p}</p>' for p in paragraphs), top=20))
    if date:
        body.append(_section(_date_block(**date), top=6))
    if rows:
        body.append(_section(_rows(rows), top=16))
    if button:
        body.append(_section(_button(*button), top=22))
    if notice:
        body.append(_section(_notice(*notice), top=20))
    if tips:
        body.append(_section(_tips(*tips), top=22))
    if closing:
        body.append(_section(f'<p style="margin:0;font:400 15px/1.6 {FONT};color:#33474f">{"<br>".join(closing)}</p>', top=24))
    footer = (f'<div style="font:700 13px {FONT};color:{INK}">{e(name)}</div>'
              + (f'<div style="font:400 12.5px/1.5 {FONT};color:{MUTED};margin-top:2px">{e(address)}</div>' if address else "")
              + f'<div style="font:400 12.5px/1.5 {FONT};color:{MUTED};margin-top:8px">Une question ? Répondez simplement à cet e-mail.</div>')
    return f'''<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><title>{e(title)}</title>
<style>@media (max-width:620px){{.px{{padding-left:20px!important;padding-right:20px!important}}.card{{border-radius:0!important}}}}</style></head>
<body style="margin:0;padding:0;background:#eef3f5">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">{e(preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#eef3f5" style="background:#eef3f5">
<tr><td align="center" style="padding:28px 10px">
  <table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:separate;background:#ffffff;border-radius:22px;overflow:hidden;border:1px solid #dfe7ea">
    <tr><td bgcolor="{TEAL_DARK}" class="px" style="background:{TEAL_DARK};background-image:linear-gradient(135deg,{TEAL_DARK} 0%,{TEAL} 60%,#16b6c8 100%);padding:22px 32px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        {brand_cell}
        <td align="right" valign="middle" style="font:600 12px {FONT};letter-spacing:.12em;text-transform:uppercase;color:#cfeef3">{e(kicker)}</td>
      </tr></table>
    </td></tr>
    {"".join(body)}
    <tr><td class="px" style="padding:30px 32px 0"><div style="height:1px;line-height:1px;background:{LINE}">&nbsp;</div></td></tr>
    <tr><td class="px" style="padding:18px 32px 26px">{footer}</td></tr>
  </table>
  <p style="margin:14px 0 0;font:400 11.5px {FONT};color:#8a9ba3">Envoyé par {e(name)} avec Wedy RH</p>
</td></tr>
</table>
</body></html>'''


def month_short(month_index: int) -> str:
    return MONTHS_SHORT[month_index - 1]
