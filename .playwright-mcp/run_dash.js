async (page) => {
  const J = b => ({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
  const ev = [['Mai',4,2,110],['Juin',6,1,115],['Juil.',3,3,115],['Août',7,2,120],['Sept.',8,1,127],['Oct.',6,2,131]].map((r, i) => ({ month: '2026-' + (i + 5), label: r[0], hires: r[1], departures: r[2], headcount: r[3] }));
  const inbox = [['leave','Congé annuel','Omar Alaoui','3 jours · 4 → 6 nov.'],['document','Attestation de salaire','Nadia Berrada','Pour dossier bancaire'],['leave','Congé annuel','Hind Tazi','2 jours · 10 → 11 nov.'],['document','Attestation de travail','Karim Bennani','Version arabe']]
    .map((r, i) => ({ kind: r[0], id: 'r' + i, employee_id: 'e' + i, employee_name: r[2], department: 'X', title: r[1], details: r[3], status: 'pending', state: 'pending', note: null, created_at: '2026-10-30T10:00:00Z' }));
  const docs = [['Attestation de travail','fr','Yasmine Benali'],['Contrat CDD','fr','Karim Bennani'],['شهادة الأجر','ar','Omar Alaoui'],['Work certificate','en','Mehdi Rami']]
    .map((r, i) => ({ id: 'd' + i, employee_id: 'e', template_id: 't', document_type: 'x', content: '', language: r[1], name: r[0], created_at: '2026-10-3' + (1 - i % 2) + 'T09:00:00Z', employees: { full_name: r[2], cin: 'X', department: 'Y' } }));
  const MOCK = {
    '/auth/me': { id: 'u1', email: 'salma.idrissi@tython.ma', full_name: 'Salma Idrissi', role_name: 'admin' },
    '/notifications': { data: [], unread_count: 3, count: 0 }, '/requests/inbox/count': { pending: 6 },
    '/requests/inbox': { data: inbox, counts: { total: 4, pending: 4, leave: 2, document: 2, other: 0 } },
    '/documents': { data: docs, count: 4 },
    '/dashboard/kpis': {
      period_days: 30, today: '2026-11-02', workday: true,
      workforce: { total: 128, active: 126, inactive: 2, interns: 9, interns_in_progress: 6 },
      today_status: { present: 117, on_leave: 5, absent: 4, late: null, late_available: false },
      requests: { pending: 6, pending_leave: 4, pending_document: 2, pending_other: 0, accepted: 18, refused: 3 },
      documents: { to_process: 7, pending_requests: 2, incomplete: 3, expired: 0, to_renew: 2 },
      attendance_rate: { rate: 96, absent_days: 5, capacity_days: 100 },
      by_department: [['Opérations',36],['Commercial',28],['Tech',24],['Finance',15],['Marketing',13],['RH',10]].map(r => ({ name: r[0], value: r[1] })),
      by_contract: [['CDI',84],['CDD',27],['Stage',9],['Freelance',6]].map(r => ({ name: r[0], value: r[1] })),
      expiring_contracts: { count: 3, expired: 1, items: [['Yasmine Benali',12],['Karim Bennani',19],['Hind Tazi',27]].map((r, i) => ({ id: 'e' + i, name: r[0], contract_end: '2026-11-20', days_left: r[1] })) },
      evolution: ev,
    },
  };
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await page.route(/localhost:5176\/api\//, r => { const p = new URL(r.request().url()).pathname.replace(/^\/api/, ''); return r.fulfill(J(MOCK[p] ?? [])); });
  await page.addInitScript(() => { localStorage.setItem('wedy_token', 't'); localStorage.setItem('wedy_lang', 'fr'); });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:5176/app');
  await page.waitForTimeout(3500);
  await page.screenshot({ path: '.playwright-mcp/ours-dash-1.png' });
  await page.evaluate(() => document.querySelector('.wy-shell-main').scrollTo(0, 760));
  await page.waitForTimeout(2200);
  await page.screenshot({ path: '.playwright-mcp/ours-dash-2.png' });
  await page.evaluate(() => document.querySelector('.wy-shell-main').scrollTo(0, 1500));
  await page.waitForTimeout(2200);
  await page.screenshot({ path: '.playwright-mcp/ours-dash-3.png' });
  return 'ok';
}
