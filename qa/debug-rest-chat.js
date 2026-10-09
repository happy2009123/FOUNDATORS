// Decisive test: exact browser payload via Firestore REST with the exact
// captured ID token, with/without the giant data-URI avatars.
const TOKEN = process.env.B_TOKEN; // from debug-msg2 output (user B)
const A_UID = 'IoHhwE0DKAAgWpz4Ou7m5unPDzli';
const B_UID = 'RBSKDvJioB0E2xviEcRXrTXORhOE';
const CONV = `${A_UID}__${B_UID}`;
const AV = 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22160%22%20height%3D%22160%22%3E%0A%20%20%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%3EM%3C%2Ftext%3E%0A%3C%2Fsvg%3E';

function fields(withAvatars) {
  return {
    participants: { arrayValue: { values: [{ stringValue: B_UID }, { stringValue: A_UID }] } },
    participantNames: { mapValue: { fields: { [B_UID]: { stringValue: 'MsgBob' }, [A_UID]: { stringValue: 'MsgAlice' } } } },
    participantAvatars: { mapValue: { fields: { [B_UID]: { stringValue: withAvatars ? AV : '' }, [A_UID]: { stringValue: withAvatars ? AV : '' } } } },
    isGroup: { booleanValue: false },
    groupName: { stringValue: '' },
    lastMessage: { stringValue: 'REST probe payload' },
    createdAt: { timestampValue: new Date().toISOString() },
    lastMessageAt: { timestampValue: new Date().toISOString() },
  };
}

async function tryCreate(label, withAvatars, idSuffix) {
  const url = `http://localhost:8080/v1/projects/foundators-66eb7/databases/(default)/documents/chats?documentId=${CONV}${idSuffix}&currentDocument.exists=false`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN },
    body: JSON.stringify({ fields: fields(withAvatars) }),
  });
  const body = await r.text();
  console.log(`--- ${label} → HTTP ${r.status}`);
  console.log(body.slice(0, 900));
  if (r.ok) {
    // clean up so variants don't collide
    await fetch(`http://localhost:8080/v1/projects/foundators-66eb7/databases/(default)/documents/chats/${CONV}${idSuffix}?currentDocument.exists=true`, {
      method: 'DELETE', headers: { Authorization: 'Bearer ' + TOKEN },
    });
  }
}

(async () => {
  if (!TOKEN) { console.error('set B_TOKEN'); process.exit(1); }
  await tryCreate('with data-URI avatars', true, '');
  await tryCreate('with empty avatars', false, '');
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
