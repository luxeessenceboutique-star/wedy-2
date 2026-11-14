// Matching of a folder of employee documents to people and lost file records (src/lib/docRestore.ts).
//   node scripts/test-doc-restore.mts        (Node ≥ 22.18: runs the TypeScript directly)
// Fictional names; the spellings differ between the folders and Wedy on purpose, as they do in real exports.
import { buildPlan, bestPerson, fixMojibake, folderLabel, kindOf, personInName } from '../src/lib/docRestore.ts';

let fails = 0;
const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) { fails++; console.log('FAIL', what, '\n  got ', JSON.stringify(got), '\n  want', JSON.stringify(want)); }
  else console.log('PASS', what);
};

const people = ['Samir Bennani', 'Imad Kettani', 'Fatima-Zahra Alami', 'Youness El Idrissi', 'Rachid Lahlou', 'Rachida Lahlou', 'Nadia Tazi', 'Omar Fassi']
  .map((full_name, i) => ({ id: 'p' + i, full_name }));
const id = (n: string) => people.find(p => p.full_name === n)!.id;
const records = [
  { id: 'r1', employee_id: id('Nadia Tazi'), name: 'CIN Nadia Tazi.pdf', file_type: 'autre', available: false },
  { id: 'r2', employee_id: id('Nadia Tazi'), name: 'Contrat CDI Nadia Tazi.pdf', file_type: 'contrat', available: false },
  { id: 'r3', employee_id: id('Nadia Tazi'), name: 'Scan 0007.pdf', file_type: 'cv', available: false },
  { id: 'r4', employee_id: id('Samir Bennani'), name: 'CV Samir.pdf', file_type: 'cv', available: true },
  { id: 'r5', employee_id: id('Omar Fassi'), name: 'Contrat Omar Fassi.pdf', file_type: 'contrat', available: false },
  { id: 'r6', employee_id: id('Rachid Lahlou'), name: 'CIN Imad Kettani.pdf', file_type: 'cin', available: true },
];
const pick = (path: string, i = 0) => ({ key: 'k' + i + path, path, name: path.split('/').pop()!, size: 1 });
const picks = [
  'EMPLOYES (2)/EMPLOYES/Nadia Tazi/CIN Nadia Tazi.pdf',
  'EMPLOYES (2)/EMPLOYES/Nadia Tazi/Contrat CDI Nadia Tazi.pdf',
  'EMPLOYES (2)/EMPLOYES/Nadia Tazi/CV Nadia Tazi.pdf',
  'EMPLOYES (2)/EMPLOYES/Nadia Tazi/RIB Nadia Tazi.pdf',
  'EMPLOYES (2)/EMPLOYES/Samir Benani/CV Samir Benani.pdf',
  'EMPLOYES (2)/EMPLOYES/Samir Benani/CIN.pdf',
  'EMPLOYES (2)/EMPLOYES/Fatima Zahra ALAMI/Diplôme  Fatima Zahra Alami.pdf',
  'EMPLOYES (2)/EMPLOYES/Youness Elidrissi/Attestation de réussite Youness.pdf',
  'EMPLOYES (2)/EMPLOYES/Imad Kettani/CIN Samir Bennani.pdf',
  'EMPLOYES (2)/EMPLOYES/Quelqu un/CV.pdf',
].map(pick);

const plan = buildPlan(picks, people, records);
const row = (name: string, folder = '') => plan.items.find(i => i.pick.name === name && i.pick.path.includes(folder))!;

eq(row('CIN Nadia Tazi.pdf').action + ':' + row('CIN Nadia Tazi.pdf').recordId, 'restore:r1', 'a lost record gets its file back by name');
eq(row('Contrat CDI Nadia Tazi.pdf').recordId, 'r2', 'contract restored into its own record');
eq(row('CV Nadia Tazi.pdf').action + ':' + row('CV Nadia Tazi.pdf').recordId, 'restore:r3', 'a lost record of the same kind is used when no name matches');
eq([row('RIB Nadia Tazi.pdf').action, row('RIB Nadia Tazi.pdf').kind], ['add', 'rib'], 'a document with no record is added');
eq([row('CV Samir Benani.pdf').action, row('CV Samir Benani.pdf').personName], ['present', 'Samir Bennani'], 'a spelling slip in the folder still finds the person; an available CV is not sent twice');
eq([row('CIN.pdf').action, row('CIN.pdf').personName], ['add', 'Samir Bennani'], 'a file without a name takes the person of its folder');
eq([row('Diplôme  Fatima Zahra Alami.pdf').kind, row('Diplôme  Fatima Zahra Alami.pdf').personName], ['diplome', 'Fatima-Zahra Alami'], 'joined / hyphenated first names');
eq([row('Attestation de réussite Youness.pdf').kind, row('Attestation de réussite Youness.pdf').personName], ['diplome', 'Youness El Idrissi'], 'attestation de réussite = diploma; joined surname');
eq([row('CIN Samir Bennani.pdf').action, row('CIN Samir Bennani.pdf').namesOther], ['conflict', 'Samir Bennani'], 'a document naming someone else than its folder is not applied');
eq(row('CV.pdf', 'Quelqu').action, 'unmatched', 'an unknown folder is left for a manual choice');
eq(plan.stillLost.map(s => s.record.id), ['r5'], 'records nothing puts back are listed as still lost');
eq(plan.missing.find(m => m.personName === 'Nadia Tazi')?.kinds, ['diplome'], 'missing standard documents per person');
eq(plan.misfiled.map(m => [m.record.id, m.namesOther]), [['r6', 'Imad Kettani']], 'a record filed under the wrong person is reported');

const manual = buildPlan([pick('X/Quelqu un/CV.pdf')], people, records, { 'k0X/Quelqu un/CV.pdf': id('Omar Fassi') });
eq([manual.items[0].action, manual.items[0].personName], ['add', 'Omar Fassi'], 'a manual choice is applied');

eq(bestPerson('Rachid Lahlou', people)?.full_name, 'Rachid Lahlou', 'close names: the exact one wins');
eq(bestPerson('Lahlou', people), null, 'one word is not enough to pick someone');
const twins = [{ id: 'a', full_name: 'NADIA TAZI', status: 'active' }, { id: 'b', full_name: 'Tazi Nadia', status: 'intern' }, { id: 'c', full_name: 'Omar Fassi', status: 'intern' }, { id: 'd', full_name: 'Omar Fassi', status: 'intern' }];
eq(bestPerson('Nadia Tazi', twins)?.id, 'a', 'the same person as employee and as intern: the employee');
eq(bestPerson('Omar Fassi', twins), null, 'two homonyms with the same status: no guess');
const close = [{ id: 'x', full_name: 'EL ALAOUI Abdel ilah', status: 'active' }, { id: 'y', full_name: 'ABDEL ILAH ALAOUI', status: 'intern' }];
eq(bestPerson('Abdelilah Elalaoui', close)?.id, 'x', 'joined and reordered words find the exact person, not a near one');
eq(folderLabel('EMPLOYES (2)/EMPLOYES/CV.pdf'), '', 'generic containers are not people');
eq(kindOf('RELEVE D IDENTITE BANCAIRE.pdf'), 'rib', 'RIB spelled out');
eq(kindOf('x.pdf', 'certificat'), 'cin', 'legacy « certificat » type is the CIN');
eq(fixMojibake('DiplÃ´me'), 'Diplôme', 'names from zips without the UTF-8 flag are decoded');
eq(personInName('Contrat CDI Nadia Tazi.pdf'), 'nadia tazi', 'the person named by a file');

console.log(fails ? `${fails} failed` : 'all passed');
process.exit(fails ? 1 : 0);
