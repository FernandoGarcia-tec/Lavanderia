import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

export type AuditEntry = {
  actorUid?: string | null;
  actorEmail?: string | null;
  action: string; // create | update | delete | login | change_status etc
  resource: string; // e.g., 'inventory', 'users', 'services'
  resourceId?: string | null;
  before?: any;
  after?: any;
  meta?: any;
};

export async function writeAudit(firestore: any, entry: AuditEntry) {
  try {
    await addDoc(collection(firestore, 'audit_logs'), {
      ...entry,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    // Swallow errors to avoid breaking user flows; log to console for debugging
    // eslint-disable-next-line no-console
    console.error('writeAudit error', e);
  }
}
