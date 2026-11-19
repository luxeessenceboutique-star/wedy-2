"""Smart template import: find the words of an uploaded document that change from one person to the next, and map
each of them to Wedy data.

What is detected, wherever it sits in the document (even split between two lines or two styles):
  - anything between square brackets: « [Nom et Prénom] », « [N° de CIN] », « [Salaire en lettres] », « [Hybride (…)] »
  - blanks: « CIN n° ________ », « né le ........ » (the words before the blank give its meaning)
  - « Monsieur/Madame », « M./Mme » → the civility of the person
  - {{variables}} already in the document are kept
  - in a document already filled for someone (an attestation written for « Mme LINA SAIDI »), the values that are
    the person's: the name after M. / Mme (not the signatory « Je soussignée, Mme … agissant en qualité de … »), the
    CIN, « né(e) le … à … », the position after « en qualité de », « depuis le … », « du … au … », the contract
    « à durée indéterminée (CDI) », the salary, and « Fait à …, le … » (the date of the day). The words written for a
    man or a woman (« employée », « née », « elle a ») become « employé(e) », « né(e) », « il/elle a ».

Each one is mapped to a Wedy field (name, CIN, address, position, dates, salary in figures / in words, duration…)
by its wording. What matches nothing becomes a custom field: its label and default value are kept with the template
(in an HTML comment at the top of the body) so the generation screen can ask for it by name.
"""
from __future__ import annotations

import html as _html
import json
import re
import unicodedata
from datetime import date, datetime, timedelta
from typing import Optional

ZERO_WIDTH = dict.fromkeys(map(ord, "​‌‍⁠﻿"), None)


def clean_text(s: str) -> str:
    return (s or "").translate(ZERO_WIDTH).replace(" ", " ")


def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", clean_text(s))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


# ── Wedy fields a placeholder can be mapped to ────────────────────────────────────────────────────────────

KNOWN_FIELDS: dict[str, str] = {
    "civility": "Civilité (Monsieur / Madame)",
    "civility_short": "Civilité abrégée (M. / Mme)",
    "full_name": "Nom et prénom",
    "cin": "N° de CIN",
    "address": "Adresse",
    "city": "Ville",
    "birth_date": "Date de naissance",
    "birth_place": "Lieu de naissance",
    "nationality": "Nationalité",
    "email": "E-mail",
    "phone": "Téléphone",
    "matricule": "Matricule",
    "cnss_number": "N° CNSS",
    "bank_account": "RIB / compte bancaire",
    "position": "Poste / mission",
    "department": "Département / service",
    "manager": "Encadrant / responsable",
    "school": "École / établissement",
    "contract_type": "Type de contrat",
    "contract_phrase": "Contrat en toutes lettres (« à durée indéterminée (CDI) »)",
    "hire_date": "Date d'embauche",
    "contract_start": "Date de début",
    "contract_end": "Date de fin",
    "duration": "Durée (calculée avec les dates)",
    "salary": "Salaire (avec MAD)",
    "salary_figures": "Salaire en chiffres",
    "salary_words": "Salaire en lettres",
    "work_mode": "Mode de travail",
    "today": "Date du jour",
    "today_long": "Date du jour en lettres (« 16 novembre 2026 »)",
    "company": "Nom de la société",
    "company_address": "Adresse de la société",
    "company_city": "Ville de la société",
}

# (pattern on the normalized label, field). First match wins: the precise wordings come before the general ones.
_RULES: list[tuple[str, str]] = [
    (r"\b(civilite|monsieur madame|madame monsieur|m mme|mr mme|mme m)\b", "civility"),
    (r"\ben lettres?\b|\btoutes lettres\b", "salary_words"),
    (r"\ben chiffres?\b", "salary_figures"),
    (r"\b(nom (et|&) prenoms?|prenoms? (et|&) nom|nom complet|nom du (salarie|stagiaire|beneficiaire|candidat)|stagiaire|salarie|interesse|beneficiaire)\b", "full_name"),
    (r"\b(cin|cni|carte nationale|piece d identite)\b", "cin"),
    (r"\blieu de naissance\b|\bne( e)? a\b|\bnee a\b", "birth_place"),
    (r"\bdate de naissance\b|\bne( e)? le\b|\bnee le\b", "birth_date"),
    (r"\b(adresse|domicile|residence|demeurant)\b", "address"),
    (r"\bville\b", "city"),
    (r"\bnationalite\b", "nationality"),
    (r"\b(e mail|email|courriel)\b", "email"),
    (r"\b(telephone|tel|gsm|portable)\b", "phone"),
    (r"\bmatricule\b", "matricule"),
    (r"\bcnss\b", "cnss_number"),
    (r"\b(rib|iban|compte bancaire)\b", "bank_account"),
    (r"\b(duree|periode de stage)\b", "duration"),
    (r"\b(date de debut|date d effet|prise d effet|debut du (contrat|stage)|a compter du)\b", "contract_start"),
    (r"\b(date de fin|date d echeance|fin du (contrat|stage)|date d expiration|echeance)\b", "contract_end"),
    (r"\b(date d embauche|date d entree|entree en (fonction|service))\b", "hire_date"),
    (r"\b(date de redaction|date de signature|date du jour|date d aujourd hui|fait le)\b|^date$", "today"),
    (r"\b(intitule du poste|poste|fonction|emploi|qualite|mission|profil)\b", "position"),
    (r"\b(departement|service|direction|pole|entite)\b", "department"),
    (r"\b(encadrant|tuteur|manager|responsable|superieur)\b", "manager"),
    (r"\b(ecole|etablissement|universite|institut|faculte)\b", "school"),
    (r"\b(type de contrat|nature du contrat)\b", "contract_type"),
    (r"\b(mode de travail|hybride|presentiel|teletravail|a distance)\b", "work_mode"),
    (r"\b(salaire|remuneration|montant|gratification|indemnite|brut|net)\b", "salary"),
    (r"\b(societe|entreprise|employeur)\b", "company"),
]


def map_label(label: str, after: str = "") -> Optional[str]:
    """The Wedy field a placeholder's wording designates, or None. `after` is the text right after it (« MAD »…)."""
    n = norm(label)
    if not n:
        return None
    for pat, key in _RULES:
        if re.search(pat, n):
            if key == "salary" and re.match(r"\s*(mad|dh|dhs|dirhams?)\b", norm(after)):
                return "salary_figures"  # « [Salaire] MAD »: the currency is already written
            return key
    return None


def slug_key(label: str) -> str:
    s = norm(label).replace(" ", "_")[:40].strip("_")
    return f"f_{s or 'champ'}"


# ── finding the placeholders in a text ────────────────────────────────────────────────────────────────────

_BRACKET = re.compile(r"\[([^\[\]\n]{1,90})\]")
_CURLY = re.compile(r"\{\{\s*([A-Za-z_]\w*)\s*\}\}")
_BLANK = re.compile(r"_{4,}|\.{6,}|…{3,}")
_CIVILITY = re.compile(r"\b(?:Monsieur\s*/\s*Madame|Madame\s*/\s*Monsieur|M\.?\s*/\s*Mme\.?|Mr\.?\s*/\s*Mme\.?)(?![\w/])", re.IGNORECASE)


KEEP = "__keep__"  # mapping value: leave the placeholder's text unchanged


def find_placeholders(text: str) -> list[dict]:
    """Every placeholder of a plain text, in order: {start, end, raw, label, kind}. Overlaps keep the first found."""
    found: list[dict] = []
    for m in _CURLY.finditer(text):
        found.append({"start": m.start(), "end": m.end(), "raw": m.group(0), "label": m.group(1), "kind": "variable"})
    for m in _BRACKET.finditer(text):
        label = clean_text(m.group(1)).strip()
        if label and not re.fullmatch(r"[\d\s.,/-]*", label):  # « [1] », « [12/2026] » are references, not fields
            found.append({"start": m.start(), "end": m.end(), "raw": m.group(0), "label": re.sub(r"\s+", " ", label), "kind": "bracket"})
    for m in _CIVILITY.finditer(text):
        found.append({"start": m.start(), "end": m.end(), "raw": m.group(0), "label": "Monsieur/Madame", "kind": "civility"})
    for m in _BLANK.finditer(text):
        before = text[max(0, m.start() - 40):m.start()]
        words = re.findall(r"[\wÀ-ÿ'°]+", before.split("\n")[-1])[-4:]
        label = " ".join(words).strip(" :") or "Champ à remplir"
        found.append({"start": m.start(), "end": m.end(), "raw": m.group(0), "label": label, "kind": "blank"})
    found.sort(key=lambda d: (d["start"], -(d["end"] - d["start"])))
    out, last_end = [], -1
    for d in found:
        if d["start"] >= last_end:
            out.append(d)
            last_end = d["end"]
    # the values of a filled document, where no placeholder already is
    taken = [(d["start"], d["end"]) for d in out]
    for v in find_values(text):
        if not any(v["start"] < e and s < v["end"] for s, e in taken):
            out.append(v)
            taken.append((v["start"], v["end"]))
    out.sort(key=lambda d: d["start"])
    return out


# ── the values of a document already filled for someone ──────────────────────────────────────────────────

_MONTHS = "janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[ée]cembre"
_DATE = rf"(?:\d{{1,2}}[/.-]\d{{1,2}}[/.-]\d{{2,4}}|\d{{1,2}}(?:er)?\s+(?i:{_MONTHS})\s+\d{{4}})"
_UP = "A-ZÀ-ÖØ-Þ"
_WORD = rf"[{_UP}][A-Za-zÀ-ÖØ-öø-ÿ'’\-]+"
_CIV_WORD = r"(?:M\.|Mr\.?|Mme\.?|Mlle\.?|Monsieur|Madame|Mademoiselle)"
_CIV_SLOT = r"(?:Monsieur\s*/\s*Madame|Madame\s*/\s*Monsieur|M\.?\s*/\s*Mme\.?|Mr\.?\s*/\s*Mme\.?)"
_PERSON = re.compile(rf"(?<![\w/])({_CIV_SLOT}|M\.|Mr\.|Mme\.|Mlle\.|Mr|Mme|Mlle|Monsieur|Madame|Mademoiselle)"
                     rf"(?:(?<=\.)[ \t]*|[ \t]*:[ \t]*|[ \t]+)({_WORD}(?:[ \t]+{_WORD}){{0,3}})")
_PLACE = rf"{_WORD}(?:[ \t-]+{_WORD}){{0,2}}"
_NOT_A_NAME = {"le", "la", "les", "directeur", "directrice", "gerant", "gerante", "president", "presidente", "responsable"}
_FEMININE = ("mme", "madame", "mlle", "mademoiselle")

# fields that are not Wedy data: asked when generating, with the example's value proposed
CUSTOM_VALUE_FIELDS = {"trial_period": "Période d'essai", "salary_net": "Salaire net"}
_KEEP_DEFAULT = {"trial_period", "work_mode"}   # the example's value is a good default for everyone
_UNIT = r"(?:jours?|mois|semaines?|ans?|ann[ée]es?)"
_STOP = (r"(?=\s+(?i:(?:depuis|[aà] compter|au sein|pour une|au service|au d[ée]partement|aupr[èe]s|jusqu|afin|pour|"
         r"selon|avec|dans|charg[ée]|rattach[ée]|et ce|sous)\b|du\s+\d)|\s*[,.;:\n(«»“”])")

# (pattern, [(field, hint) per group]) — the keywords are case-insensitive (and do without accents: scans), names and
# places start with a capital
_VALUE_RULES: list[tuple[str, list[tuple[str, str]]]] = [
    (r"(?i:\b(?:CIN|C\.I\.N\.?|carte d.identit[ée] nationale|carte nationale d.identit[ée]))(?:\s*(?i:n°|no\.?|num[ée]ro|:|°))*\s*[a-z]?\s*"
     r"([A-Z]{1,2}[ \t]?\d{3,8}|[A-Z][A-Z0-9]{1,2}\d{4,8})\b", [("cin", "CIN")]),
    (r"(?i:\b(?:demeurant|domicili[ée]e?|r[ée]sidant)\s+(?:[aà]u?x?\s+|:\s*)?)(.+?)"
     r"(?=\s*,\s*(?i:ci.apr|titulaire|n[ée]e?\b|de nationalit|immatricul|t[ée]l)|\s*[;\n]|\s*$)", [("address", "adresse")]),
    (rf"(?i:\b(?:prenant|prend|prendra)\s+effet\s+(?:le|[aà] compter du|[aà] partir du))\s+({_DATE})", [("contract_start", "prend effet le")]),
    (rf"(?i:\b[aà] partir du)\s+({_DATE})", [("contract_start", "à partir du")]),
    (rf"(?i:\b(?:d[ée]butera|commencera|d[ée]bute|commence)\s+le)\s+({_DATE})", [("contract_start", "débute le")]),
    (rf"(?i:\bdate (?:de d[ée]but|d.effet|d.entr[ée]e)\s*:?)\s*({_DATE})", [("contract_start", "date de début")]),
    (rf"(?i:\b(?:arrivant|arrivera|venant|viendra)\s+(?:automatiquement\s+)?[aà]\s+(?:son\s+)?[ée]ch[ée]ance\s+le)\s+({_DATE})",
     [("contract_end", "échéance le")]),
    (rf"(?i:\b(?:prendra fin|prend fin|se terminera|expirera|s.ach[eè]vera)\s+le)\s+({_DATE})", [("contract_end", "prend fin le")]),
    (rf"(?i:\bdate de fin\s*:?)\s*({_DATE})", [("contract_end", "date de fin")]),
    (rf"(?i:\b(?:pour une|d.une)\s+dur[ée]e\s+(?:d[ée]termin[ée]e\s+)?de|\bdur[ée]e du (?:contrat|stage)\s*(?:est de|:)?)\s+(\d+\s*{_UNIT})",
     [("duration", "durée")]),
    (rf"(?i:\bp[ée]riode d.essai\s+(?:de|d.une dur[ée]e de|est (?:fix[ée]e\s+)?[aà]|:)\s*)(\d+\s*{_UNIT}(?:\s+(?i:renouvelable)(?:\s+(?i:une fois))?)?)",
     [("trial_period", "période d'essai")]),
    (r"(?i:\bmode de travail\s+(?:en\s+)?)((?i:hybride|pr[ée]sentiel|t[ée]l[ée]travail|[aà] distance|remote)(?:\s*\([^)\n]{0,60}\))?)",
     [("work_mode", "mode de travail")]),
    (r"(?i:\ben\s+(?:sa\s+)?qualit[ée]\s+d[e'’])\s*[«“\"]\s*([^»”\"\n]{2,80}?)\s*[»”\"]", [("position", "poste")]),
    (r"(?i:\b(?:en (?:sa )?qualit[ée] d[e'’]|en tant que|au poste d[e'’]|occupe(?:ra)? (?:le poste|la fonction) d[e'’]|"
     r"exerce(?:ra)? (?:la fonction|les fonctions) d[e'’]))\s*(?![«“\"])(.+?)" + _STOP, [("position", "poste")]),
    (rf"(?i:\bn[ée]e?\s+le)\s+({_DATE})", [("birth_date", "né(e) le")]),
    (rf"(?i:\bn[ée]e?\s+le)\s+{_DATE}\s+(?i:à)\s+({_PLACE})", [("birth_place", "né(e) à")]),
    (r"(?i:\bCNSS\b)[^\d\n]{0,25}(\d{6,12})\b", [("cnss_number", "CNSS")]),
    (rf"(?i:\bdepuis le)\s+({_DATE})", [("hire_date", "depuis le")]),
    (rf"(?i:\b(?:embauch|recrut|engag)[ée]e?\s+(?:le|depuis le|à compter du))\s+({_DATE})", [("hire_date", "embauché(e) le")]),
    (rf"(?i:\bdu)\s+({_DATE})\s+(?i:au)\s+({_DATE})", [("contract_start", "du"), ("contract_end", "au")]),
    (rf"(?i:\b[aà] compter du)\s+({_DATE})", [("contract_start", "à compter du")]),
    (rf"(?i:\bdu)\s+({_DATE})\s+(?i:au)\s+(?!\d)", [("contract_start", "du")]),
    (rf"(?i:\bjusqu.au)\s+({_DATE})", [("contract_end", "jusqu'au")]),
    (rf"(?i:\b(?:fait|[ée]tabli|d[ée]livr[ée])e?(?:\s+en\s+(?:double|deux|trois|\w+)\s+(?:exemplaires?|originaux)(?:\s+originaux)?)?\s+[aà])\s+({_PLACE})\s*,?\s*(?i:le)\s+({_DATE})",
     [("company_city", "fait à"), ("today", "date du document")]),
    (rf"(?m)^[ \t]*({_PLACE})[ \t]*,[ \t]*(?i:le)[ \t]+({_DATE})", [("company_city", "fait à"), ("today", "date du document")]),
    (r"(?i:(à durée (?:in)?d[ée]termin[ée]e\s*\((?:CDI|CDD)\)))", [("contract_phrase", "contrat")]),
    (r"(?i:\bcontrat\s+(?:de type\s+)?)(CDI|CDD|ANAPEC)\b", [("contract_type", "contrat")]),
]


def _signatory(text: str, start: int, end: int) -> bool:
    """« Je soussignée, Mme HAJJI Samira, agissant en qualité de … »: the person who signs, not the one concerned."""
    before, after = norm(text[max(0, start - 50):start]), norm(text[end:end + 60])
    return bool(re.search(r"soussign", before) or re.match(r"(agissant|en sa qualite|directeur|directrice|gerant|gerante|president|presidente|drh)\b", after))


def parties(text: str) -> tuple[Optional[tuple[int, int]], Optional[tuple[int, int]]]:
    """In a contract « Entre les soussignés : <the employer>, d'une part, et <the employee>, d'autre part »:
    (the employer's block, the employee's block) as spans of the text, each None when not found.
    What is in the employer's block (company name, head office, RC, ICE, CNSS, its manager) never becomes a field."""
    one = re.search(r"(?i)\bd\W{0,2}\s?une\s+part\b", text)
    other = re.search(r"(?i)\bd\W{0,2}\s?autre\s+part\b", text)
    employer = employee = None
    if one:
        start = re.search(r"(?i)\bentre\s+(?:les\s+)?soussign", text)
        employer = (start.start() if start and start.start() < one.start() else 0, one.end())
        if other and other.start() > one.end():
            employee = (one.end(), other.start())
    else:   # « …, représentée par M. X, ci-après dénommée « l'Employeur » »: that sentence
        e = re.search(r"(?i)ci.apr[eè]s\s+(?:d[eé]nomm[eé]e?|appel[eé]e?|d[eé]sign[eé]e?)\s*[«\"“]?\s*l.\s*employeur", text)
        if e:
            employer = (max(text.rfind("\n\n", 0, e.start()), 0), e.end())
    return employer, employee


def _within(span: Optional[tuple[int, int]], pos: int) -> bool:
    return bool(span) and span[0] <= pos < span[1]


def company_people(text: str) -> set[str]:
    """The names of the people who act for the company (its manager « représentée par M. X », the one who signs for it)."""
    employer, _ = parties(text)
    names = set()
    for m in _PERSON.finditer(text):
        before = norm(text[max(0, m.start() - 40):m.start()])
        after = norm(text[m.end():m.end() + 40])
        if _within(employer, m.start()) or re.search(r"(represente e? par|represente par|soussigne e?)$", before) \
                or re.match(r"(agissant|directeur|directrice|gerant|gerante|president|presidente|drh|pdg|ceo)\b", after):
            names.add(norm(m.group(2)))
    return names


def find_person(text: str) -> Optional[dict]:
    """The person a filled document is about: {civility, name, feminine}, or None. In a contract: the employee, never
    the one who represents the company (« représentée par M. X, gérant »)."""
    employer, employee = parties(text)
    company = company_people(text)
    best = None
    for m in _PERSON.finditer(text):
        name = m.group(2).strip()
        if norm(name.split()[0]) in _NOT_A_NAME or len(norm(name)) < 3:
            continue
        if _within(employer, m.start()) or norm(name) in company or _signatory(text, m.start(), m.end()):
            continue
        score = 0
        if _within(employee, m.start()):
            score += 5
        if re.search(r"ci apres (denomme|appele|designe)e? (le|la|l) ?(salarie|employe|stagiaire|collaborat|beneficiaire)|titulaire de|"
                     r"demeurant|domicilie|\bne e? le\b|\bnee le\b", norm(text[m.end():m.end() + 160])):
            score += 3
        if best is None or score > best[0]:
            civ = m.group(1)
            slot = bool(re.match(_CIV_SLOT + "$", civ))
            best = (score, {"civility": civ, "name": name, "feminine": (not slot) and civ.lower().rstrip(".").startswith(_FEMININE)})
    return best[1] if best else None


_MONEY = re.compile(r"(\d[\d \u00a0\u202f.,]*\d|\d)\s*(MAD|DH|DHS|Dhs|dirhams?|Dirhams?)\b(\s*\(\s*([a-zà-ÿ][a-zà-ÿ \-]*?)\s*(?:dirhams?|DH|MAD)?\s*(?:bruts?|nets?)?\s*\))?")
_PAY_WORD = r"(salaire|r[ée]mun[ée]ration|gratification|indemnit[ée] (?:de stage|mensuelle))"


def _salaries(text: str) -> list[tuple[int, int, str, Optional[tuple[int, int]]]]:
    """The pay amounts: (start, end, « net » / « brut » / « », span of the amount in words or None)."""
    out = []
    for m in _MONEY.finditer(text):
        before = text[max(0, m.start() - 120):m.start()]
        sentence = re.split(r"\.(?:\s|$)", before)[-1]
        k = list(re.finditer(_PAY_WORD, sentence, re.I))
        if not k:
            continue
        tail = sentence[k[-1].start():]
        kind = "net" if re.search(r"\bnets?\b", tail, re.I) else "brut" if re.search(r"\bbruts?\b", tail, re.I) else ""
        out.append((m.start(1), m.end(1), kind, m.span(4) if m.group(4) else None))
    return out


def find_values(text: str) -> list[dict]:
    """The person's values in a filled document, as placeholders of kind « value » ({start, end, raw, label, kind, key}).
    `raw` names the value and its role (« LINA SAIDI (nom) »): the same town can be a birth place and the place of
    signature, each is a field of its own. In a contract, what belongs to the employer (its block « Entre les
    soussignés … d'une part », the one who represents it) stays as it is."""
    out: list[dict] = []
    employer, _ = parties(text)
    title = next((ln for ln in text.split("\n") if ln.strip()), "")
    is_contract = bool(re.search(r"\b(contrat|convention|avenant)\b", norm(title)))

    def add(start: int, end: int, key: str, hint: str):
        value = text[start:end].strip()
        if not value or _within(employer, start):
            return
        if is_contract and key in ("contract_phrase", "contract_type"):   # a CDD stays a CDD: it is the document itself
            return
        start = start + text[start:end].index(value)
        ph = {"start": start, "end": start + len(value), "raw": f"{value} ({hint})",
              "label": KNOWN_FIELDS.get(key) or CUSTOM_VALUE_FIELDS.get(key, hint), "kind": "value", "key": key}
        if key in _KEEP_DEFAULT:
            ph["default"] = value
        out.append(ph)

    person = find_person(text)
    if person:
        for m in re.finditer(r"(?<!\w)" + re.escape(person["name"]) + r"(?!\w)", text, re.IGNORECASE):
            add(m.start(), m.end(), "full_name", "nom")
            c = re.search(rf"(?<![\w/])({_CIV_WORD})[ \t]*:?[ \t]*$", text[max(0, m.start() - 16):m.start()])
            if c:
                cs = m.start() - len(c.group(0))
                long_form = c.group(1).lower().startswith(("monsieur", "madame", "mademoiselle"))
                add(cs, cs + len(c.group(1)), "civility" if long_form else "civility_short", "civilité")
    for pat, groups in _VALUE_RULES:
        for m in re.finditer(pat, text):
            for gi, (key, hint) in enumerate(groups, start=1):
                a, b = m.span(gi)
                if a < 0:
                    continue
                if key == "position":
                    if re.search(r"agissant\s*$", norm(text[max(0, m.start() - 30):m.start()])) or len(text[a:b]) > 80:
                        continue
                    if norm(text[a:b]) in ("", "stagiaire", "salarie", "employe"):
                        continue
                if key == "today" and re.search(r"[a-zA-Z]", text[a:b]):
                    key = "today_long"
                add(a, b, key, hint)
    # the pay: the gross one is Wedy's salary; a net one next to it is asked apart
    pay = _salaries(text)
    two = any(k == "net" for _, _, k, _ in pay) and any(k == "brut" for _, _, k, _ in pay)
    for a, b, kind, words in pay:
        key = "salary_net" if two and kind == "net" else "salary_figures"
        add(a, b, key, "salaire net" if key == "salary_net" else "salaire")
        if words and key == "salary_figures":
            add(words[0], words[1], "salary_words", "salaire en lettres")
    # the same position / CIN written again elsewhere (« exercera les fonctions de … »): the same field
    for key in ("position", "cin"):
        for v in {text[d["start"]:d["end"]] for d in out if d["key"] == key}:
            if len(v.strip()) < 4:
                continue
            for m in re.finditer(r"(?<!\w)" + re.escape(v) + r"(?!\w)", text, re.IGNORECASE):
                add(m.start(), m.end(), key, "poste" if key == "position" else "CIN")
    out.sort(key=lambda d: (d["start"], -(d["end"] - d["start"])))
    kept, last = [], -1
    for d in out:
        if d["start"] >= last:
            kept.append(d)
            last = d["end"]
    return kept


_GENDERED = r"(employ|salari|n|int[ée]ress|embauch|recrut|engag|affect|int[ée]gr|affili|domicili|attach)"
_SUBJECT_VERBS = (r"(a exerc[ée]|a fait preuve|a occup[ée]|a effectu[ée]|a su|a toujours|a [ée]t[ée]|s.est|occupe|exerce|assure|"
                  r"b[ée]n[ée]ficie|est employ|est titulaire|est inscrit|fait partie|a int[ée]gr[ée])")


def neutral_gender(html_body: str, feminine: bool) -> str:
    """The words written for the example person, made to fit anyone: « employée » / « employé » → « employé(e) »,
    « née » / « né » → « né(e) », « elle a exercé » → « il/elle a exercé », « du salarié » → « du/de la salarié(e) »,
    « un employé » → « un(e) employé(e) ». `agree` writes them back for the person at generation. Only the text
    changes, never the tags. (Documents often mix both forms: « Mme X, né le … »: both are made neutral.)"""
    noun = r"(salari[ée]e?|stagiaire|b[ée]n[ée]ficiaire|employ[ée]e?|int[ée]ress[ée]e?)"

    def fix(t: str) -> str:
        t = re.sub(r"\b(du|de la) " + noun + r"\b", lambda m: "du/de la " + m.group(2), t)
        t = re.sub(r"\b(au|à la) " + noun + r"\b", lambda m: "au/à la " + m.group(2), t)
        t = re.sub(r"(?<!de )(?<!à )\b(le|la) " + noun + r"\b", lambda m: "le/la " + m.group(2), t)
        t = re.sub(r"\b(un|une) " + noun + r"\b", lambda m: "un(e) " + m.group(2), t)
        t = re.sub(r"\b" + _GENDERED + r"ée(s?)\b", lambda m: m.group(1) + "é(e)" + m.group(2), t)
        t = re.sub(r"\b" + _GENDERED + r"é(s?)(?![\w(])", lambda m: m.group(1) + "é(e)" + m.group(2), t)
        t = re.sub(r"\binscrite?(?![\w(])", "inscrit(e)", t)
        # « ci-après dénommé « le Salarié » » (never the company: « dénommée « l'Employeur » » stays)
        t = re.sub(r"\b(d[ée]nomm|d[ée]sign)[ée]e?(?![\w(])(?=\s*[«\"“]?\s*(?:(?:le|la)\s+(?:salari|stagiaire|b[ée]n[ée]ficiaire|collaborat|employ[ée](?!ur))|l.\s*employ[ée](?!ur)))",
                   lambda m: m.group(1) + "é(e)", t, flags=re.I)
        if feminine:
            t = re.sub(r"\b(E|e)lle\s+" + _SUBJECT_VERBS, lambda m: ("Il/Elle " if m.group(1) == "E" else "il/elle ") + m.group(2), t)
        # « il a été convenu / il est entendu » speak of nobody: kept
        t = re.sub(r"\b(I|i)l\s+(?!a\s+[ée]t[ée]\s+(?:convenu|arr[êe]t[ée]|d[ée]cid[ée]|entendu|stipul[ée]|pr[ée]vu|expos[ée]))" + _SUBJECT_VERBS,
                   lambda m: ("Il/Elle " if m.group(1) == "I" else "il/elle ") + m.group(2), t)
        return t

    parts = _TAG.split(html_body)
    for i in range(0, len(parts), 2):
        parts[i] = fix(parts[i])
    return "".join(parts)


# ── several examples in one document (a PDF with one attestation per page, each for someone else) ───────────

PAGE_MARK = "<!--wedy-page-->"
_BLOCK_RE = re.compile(r"<(p|h[1-6]|ul|ol|table|div)\b[^>]*>.*?</\1>", re.S | re.I)


def _blocks(inner: str) -> list[tuple[int, int, str, bool]]:
    """Top-level blocks of a flowing body: (start, end, text, is only a picture)."""
    out = []
    for m in _BLOCK_RE.finditer(inner):
        html_part = m.group(0)
        text = clean_text(_html.unescape(re.sub(r"<[^>]+>", " ", html_part))).strip()
        out.append((m.start(), m.end(), text, not text and "<img" in html_part))
    return out


def split_examples(body: str) -> list[dict]:
    """The examples of a document that holds several (same title, someone else each time):
    [{index, person, title, html}] — or [] when it is one document (a contract over several pages stays whole)."""
    body = strip_meta(body or "")
    m = re.match(r"(\s*<div[^>]*>)(.*)(</div>\s*)$", body, re.S)
    head, inner, tail = m.groups() if m else ("", body, "")
    if PAGE_MARK in inner:
        parts = [p for p in inner.split(PAGE_MARK) if p.strip()]
    else:  # saved before pages were marked: cut where the title comes back
        blocks = _blocks(inner)
        titled = [b for b in blocks if b[2]]
        if not titled:
            return []
        title = norm(titled[0][2])
        starts = []
        for k, b in enumerate(blocks):
            if b[2] and norm(b[2]) == title:
                cut = blocks[k - 1][0] if k and blocks[k - 1][3] else b[0]   # the logo above the title goes with it
                starts.append(cut)
        if len(starts) < 2:
            return []
        starts[0] = 0
        parts = [inner[a:b] for a, b in zip(starts, starts[1:] + [len(inner)])]
    if len(parts) < 2:
        return []
    examples = []
    for i, part in enumerate(parts):
        plain = _text_runs(part)[2]
        person = find_person(plain)
        first = next((ln.strip() for ln in plain.split("\n") if ln.strip()), "")
        examples.append({"index": i, "person": person["name"] if person else None, "title": first[:80], "html": head + part + tail})
    people = {norm(e["person"]) for e in examples if e["person"]}
    titles = {norm(e["title"]) for e in examples}
    if len(people) >= 2 and len(titles) == 1:
        return examples
    return []


def pick_example(raw_html: str, example: Optional[int] = None) -> tuple[str, list[dict], Optional[int]]:
    """(the HTML to make the template from, the examples found [{index, person, title}], the one kept)."""
    examples = split_examples(raw_html)
    if not examples:
        return raw_html.replace(PAGE_MARK, ""), [], None
    i = example if example is not None and 0 <= example < len(examples) else 0
    meta = read_meta(raw_html)
    chosen = examples[i]["html"]
    if meta:
        chosen = f"<!--wedy-fields:{json.dumps(meta, ensure_ascii=False)}-->" + chosen
    return chosen, [{k: e[k] for k in ("index", "person", "title")} for e in examples], i


def resolve(ph: dict, text: str, mapping: Optional[dict] = None) -> str:
    """The variable a placeholder becomes: the user's choice, else the mapping by wording, else a custom field."""
    if mapping and ph["raw"] in mapping and mapping[ph["raw"]]:
        return re.sub(r"\W", "_", str(mapping[ph["raw"]]))[:48]
    if ph["kind"] == "variable":
        return ph["label"]
    if ph["kind"] == "value":
        return ph["key"]
    if ph["kind"] == "civility":  # « M./Mme » keeps the short form of the document
        return "civility" if re.match(r"(monsieur|madame)", ph["raw"], re.IGNORECASE) else "civility_short"
    return map_label(ph["label"], text[ph["end"]:ph["end"] + 12]) or slug_key(ph["label"])


# ── replacing them inside HTML (text split between tags is handled) ─────────────────────────────────────

_TAG = re.compile(r"(<[^>]+>)")
_BLOCK = re.compile(r"^</?(p|div|h[1-6]|li|ul|ol|tr|td|th|table|br|hr|section|article)\b", re.IGNORECASE)


def _text_runs(body: str):
    """(parts, runs, plain): parts = HTML split into tags / texts; runs = [(part index, start in plain, text)]."""
    parts = _TAG.split(body)
    runs, plain, skip = [], [], False
    pos = 0
    for i, part in enumerate(parts):
        if i % 2:  # a tag
            low = part.lower()
            if low.startswith("<style") or low.startswith("<script"):
                skip = True
            elif low.startswith("</style") or low.startswith("</script"):
                skip = False
            if _BLOCK.match(part):
                plain.append("\n")
                pos += 1
            continue
        if skip or not part:
            continue
        text = clean_text(_html.unescape(part))
        runs.append((i, pos, text))
        plain.append(text)
        pos += len(text)
    return parts, runs, "".join(plain)


def analyse_html(body: str, mapping: Optional[dict] = None) -> list[dict]:
    """The fields of an HTML body: [{placeholder, label, key, known, count, kind, default}] in order of appearance."""
    _, _, plain = _text_runs(body)
    fields: dict[str, dict] = {}
    for ph in find_placeholders(plain):
        if mapping and mapping.get(ph["raw"]) == KEEP:
            continue
        key = resolve(ph, plain, mapping)
        f = fields.setdefault(ph["raw"], {
            "placeholder": ph["raw"], "label": ph["label"], "key": key, "known": key in KNOWN_FIELDS,
            "count": 0, "kind": ph["kind"], "default": ph.get("default") or default_for(key, ph["label"]),
        })
        f["count"] += 1
    return list(fields.values())


def default_for(key: str, label: str) -> str:
    """A value to propose for a custom field: « [Hybride (présentiel et télétravail)] » proposes itself."""
    if key == "work_mode":
        return label
    return ""


def apply_fields(body: str, mapping: Optional[dict] = None) -> str:
    """Replace every placeholder of an HTML body by its {{variable}} (and drop the zero-width characters)."""
    parts, runs, plain = _text_runs(body)
    texts = {i: t for i, _, t in runs}
    starts = [(i, s, len(t)) for i, s, t in runs]

    def locate(off: int, end_side: bool):
        for i, s, n in starts:
            if s <= off < s + n or (end_side and off == s + n and n):
                return i, off - s
        return None

    for ph in reversed(find_placeholders(plain)):
        if mapping and mapping.get(ph["raw"]) == KEEP:
            continue  # the user wants this text left as it is
        a, b = locate(ph["start"], False), locate(ph["end"], True)
        if not a or not b:
            continue  # crosses a paragraph: left as text
        token = "{{" + resolve(ph, plain, mapping) + "}}"
        (ia, oa), (ib, ob) = a, b
        if ia == ib:
            texts[ia] = texts[ia][:oa] + token + texts[ia][ob:]
        else:
            texts[ia] = texts[ia][:oa] + token
            for i, _, _ in runs:
                if ia < i < ib:
                    texts[i] = ""
            texts[ib] = texts[ib][ob:]
    for i, t in texts.items():
        parts[i] = _html.escape(t, quote=False)
    return "".join(parts)


def build_template(raw_html: str, mapping: Optional[dict] = None) -> tuple[str, list[dict]]:
    """A document's HTML as a template: (body with {{fields}} and the custom fields' labels, fields found).
    Used for an uploaded document and to look again at a template already saved."""
    body = strip_meta(raw_html).replace(PAGE_MARK, "")
    fields = analyse_html(body, mapping)
    person = find_person(_text_runs(body)[2])
    out = apply_fields(body, mapping)
    if person and not any(f["key"] == "full_name" and mapping and mapping.get(f["placeholder"]) == KEEP for f in fields):
        if any(f["key"] == "full_name" for f in fields):
            out = neutral_gender(out, person["feminine"])
    out = re.sub(r"\{\{(civility|civility_short)\}\}(\{\{full_name\}\})", r"{{\1}} \2", out)   # « Mme.LINA » → « Mme X »
    out = re.sub(r"\b(CIN|C\.I\.N\.?)[a-z](\{\{cin\}\})", r"\1 : \2", out)   # a scan's stray letter between « CIN » and the number
    if not (mapping and mapping.get("__no_date__") == KEEP):
        out, n = re.subn(r"(\b[Ff]ait\b[^<>{}]{0,80}?\b[aà]\s+[^<>{},]{2,40},\s*le)\s*(?:\.{2,}|_{2,}|…+)?\s*(?=<)", r"\1 {{today}}", out)
        if n and not any(f["key"] == "today" for f in fields):
            fields.append({"placeholder": "(date du document)", "label": KNOWN_FIELDS["today"], "key": "today", "known": True,
                           "count": n, "kind": "value", "default": ""})
    old_meta = read_meta(raw_html)
    meta_fields = [{"key": k, "label": v.get("label", k), "default": v.get("default", "")} for k, v in old_meta.items()
                   if k not in {f["key"] for f in fields} and "{{" + k + "}}" in out]
    return with_meta(out, fields + meta_fields), fields


# ── field labels / defaults kept with the template ────────────────────────────────────────────────────────

_META = re.compile(r"^\s*<!--wedy-fields:(.*?)-->", re.DOTALL)


def with_meta(body: str, fields: list[dict]) -> str:
    """Put the labels / defaults of the custom fields at the top of the body (an HTML comment, invisible)."""
    meta = {f["key"]: {"label": f["label"], "default": f.get("default", "")} for f in fields
            if f["key"] not in KNOWN_FIELDS or f.get("default")}
    body = strip_meta(body)
    if not meta:
        return body
    return f"<!--wedy-fields:{json.dumps(meta, ensure_ascii=False)}-->" + body


def read_meta(body: str) -> dict:
    m = _META.match(body or "")
    if not m:
        return {}
    try:
        return json.loads(m.group(1))
    except ValueError:
        return {}


def strip_meta(body: str) -> str:
    return _META.sub("", body or "", count=1)


# ── values computed at generation ─────────────────────────────────────────────────────────────────────────

_UNITS = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze",
          "treize", "quatorze", "quinze", "seize"]
_TENS = {2: "vingt", 3: "trente", 4: "quarante", 5: "cinquante", 6: "soixante"}


def _below_100(n: int) -> str:
    if n <= 16:
        return _UNITS[n]
    if n < 20:
        return "dix-" + _UNITS[n - 10]
    t, u = divmod(n, 10)
    if t in (7, 9):  # soixante-dix…, quatre-vingt-dix…
        base = "soixante" if t == 7 else "quatre-vingt"
        rest = 10 + u
        if t == 7 and u == 1:
            return "soixante et onze"
        return f"{base}-{_below_100(rest)}"
    if t == 8:
        return "quatre-vingts" if u == 0 else f"quatre-vingt-{_UNITS[u]}"
    word = _TENS[t]
    if u == 0:
        return word
    if u == 1:
        return f"{word} et un"
    return f"{word}-{_UNITS[u]}"


def _below_1000(n: int, plural_ok: bool = True) -> str:
    h, r = divmod(n, 100)
    parts = []
    if h:
        parts.append("cent" if h == 1 else f"{_UNITS[h]} cent{'s' if (r == 0 and plural_ok) else ''}")
    if r:
        w = _below_100(r)
        if not plural_ok and w.endswith("quatre-vingts"):
            w = w[:-1]
        parts.append(w)
    return " ".join(parts) if parts else "zéro"


def number_to_french(n: int) -> str:
    """3500 → « trois mille cinq cents »; 80 000 → « quatre-vingt mille »; 1 200 000 → « un million deux cent mille »."""
    if n < 0:
        return "moins " + number_to_french(-n)
    if n < 1000:
        return _below_1000(n)
    words = []
    millions, rest = divmod(n, 1_000_000)
    if millions:
        words.append(f"{number_to_french(millions)} million{'s' if millions > 1 else ''}")
    thousands, rest = divmod(rest, 1000)
    if thousands:
        words.append("mille" if thousands == 1 else f"{_below_1000(thousands, plural_ok=False)} mille")
    if rest:
        words.append(_below_1000(rest))
    return " ".join(words)


def salary_figures(amount) -> str:
    """3500 → « 3 500 »; 3500.5 → « 3 500,50 » (French grouping, no currency)."""
    try:
        v = float(amount)
    except (TypeError, ValueError):
        return ""
    whole, cents = int(v), round((v - int(v)) * 100)
    s = f"{whole:,}".replace(",", " ")
    return f"{s},{cents:02d}" if cents else s


def salary_words(amount) -> str:
    try:
        v = float(amount)
    except (TypeError, ValueError):
        return ""
    whole, cents = int(v), round((v - int(v)) * 100)
    return number_to_french(whole) + (f" virgule {number_to_french(cents)}" if cents else "")


def _as_date(v) -> Optional[date]:
    if not v:
        return None
    if isinstance(v, date):
        return v
    s = str(v)[:10]
    for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    return None


def duration_text(start, end) -> str:
    """01/09/2026 → 31/12/2026 = « 4 mois »; 01/01 → 31/12 = « 1 an »; with the remaining days when it is not round."""
    a, b = _as_date(start), _as_date(end)
    if not a or not b or b < a:
        return ""
    b = b + timedelta(days=1)  # the end day is worked
    months = (b.year - a.year) * 12 + (b.month - a.month)
    if b.day < a.day:
        months -= 1
    y, m = a.year + (a.month - 1 + months) // 12, (a.month - 1 + months) % 12 + 1
    try:
        anchor = a.replace(year=y, month=m)
    except ValueError:  # 31 → a shorter month
        anchor = (date(y, m % 12 + 1, 1) if m < 12 else date(y + 1, 1, 1)) - timedelta(days=1)
    days = (b - anchor).days
    if days == 1:  # « du 19/08 au 19/11 » is 3 months too (end day not counted): one day off is a round duration
        days = 0
    parts = []
    if months >= 12 and months % 12 == 0:
        yrs = months // 12
        parts.append(f"{yrs} an{'s' if yrs > 1 else ''}")
    elif months:
        parts.append(f"{months} mois")
    if days > 0:
        parts.append(f"{days} jour{'s' if days > 1 else ''}")
    if not parts:
        return ""
    return " et ".join(parts)


# ── agreement with the civility (« intégré(e) », « il/elle ») ─────────────────────────────────────────────

_SHORT = {"monsieur": "M.", "madame": "Mme"}
_LONG = {"m.": "Monsieur", "m": "Monsieur", "mr": "Monsieur", "mr.": "Monsieur", "mme": "Madame", "mme.": "Madame"}


def civility_pair(civility: str = "", short: str = "") -> tuple[str, str]:
    """(Monsieur|Madame|"", M.|Mme|"") from whichever of the two was given."""
    c, s = (civility or "").strip(), (short or "").strip()
    if not c and s.lower() in _LONG:
        c = _LONG[s.lower()]
    if not s and c.lower() in _SHORT:
        s = _SHORT[c.lower()]
    return (c if c.lower() in _SHORT else "", s if s.lower().rstrip(".") in ("m", "mme", "mr") else "")


_PAIRS = [("il/elle", "il", "elle"), ("elle/il", "il", "elle"), ("le/la", "le", "la"), ("la/le", "le", "la"),
          ("lui/elle", "lui", "elle"), ("celui/celle", "celui", "celle"), ("du/de la", "du", "de la"), ("au/à la", "au", "à la")]


def agree(html: str, civility: str) -> str:
    """Write the text for a man or a woman: « intégré(e) » → intégré / intégrée, « il/elle » → il / elle.
    Only the written text is changed (not the tags), and only when the civility is known."""
    fem = {"monsieur": False, "madame": True}.get((civility or "").strip().lower())
    if fem is None:
        return html

    def fix(text: str) -> str:
        text = re.sub(r"(\w)\((e)\)(s?)(?!\w)", lambda m: m.group(1) + ("e" if fem else "") + m.group(3), text)
        for pair, masc, femi in _PAIRS:
            def repl(m, masc=masc, femi=femi):
                word = femi if fem else masc
                return word[0].upper() + word[1:] if m.group(0)[0].isupper() else word
            text = re.sub(r"\b" + re.escape(pair).replace("/", r"\s*/\s*") + r"\b", repl, text, flags=re.IGNORECASE)
        return text

    parts = _TAG.split(html)
    for i in range(0, len(parts), 2):
        parts[i] = fix(parts[i])
    return "".join(parts)
