// Simple JSON schema-like validation for common endpoint payloads
// Prevents malformed or oversized payloads from causing issues

const schemas = {
  // /mine endpoint
  mine: {
    properties: {
      data: { type: 'array', maxItems: 100, optional: true },
      minerAddress: { type: 'string', maxLength: 200, optional: true },
    },
  },
  // /tx/new endpoint
  newTx: {
    properties: {
      fromAddress: { type: 'string', maxLength: 200, nullable: true },
      toAddress: { type: 'string', maxLength: 200 },
      amount: { type: ['number', 'string'], optional: true },
      timestamp: { type: 'number', optional: true },
      signature: { type: 'string', maxLength: 500, nullable: true },
    },
  },
  // /replace endpoint
  replace: {
    properties: {
      chain: { type: 'array', maxItems: 100000 },
    },
  },
  // /peer/connect endpoint
  peerConnect: {
    properties: {
      address: { type: 'string', maxLength: 500 },
    },
  },
  // /wallet/export endpoint
  walletExport: {
    properties: {
      privateKey: { type: 'string', maxLength: 200 },
      passphrase: { type: 'string', maxLength: 500 },
      options: { type: 'object', optional: true },
    },
  },
  // /wallet/import endpoint
  walletImport: {
    properties: {
      encrypted: { type: ['string', 'object'], maxLength: 5000 },
      passphrase: { type: 'string', maxLength: 500 },
    },
  },
};

function validatePayload(payload, schemaKey) {
  if (!schemas[schemaKey]) throw new Error('No schema defined for: ' + schemaKey);
  const schema = schemas[schemaKey];
  const props = schema.properties;

  for (const [field, rule] of Object.entries(props)) {
    const value = payload[field];

    // Check if field is optional
    if (rule.optional && value === undefined) continue;

    // Check if field is nullable
    if (rule.nullable && value === null) continue;

    // Type checking
    const allowedTypes = Array.isArray(rule.type) ? rule.type : [rule.type];
    const valueType = value === null ? 'null' : typeof value;
    if (!allowedTypes.includes(valueType)) {
      throw new Error(`Field "${field}" must be of type ${rule.type}, got ${valueType}`);
    }

    // String length checks
    if (valueType === 'string' && rule.maxLength && value.length > rule.maxLength) {
      throw new Error(`Field "${field}" exceeds max length of ${rule.maxLength}`);
    }

    // Array size checks
    if (Array.isArray(value) && rule.maxItems && value.length > rule.maxItems) {
      throw new Error(`Field "${field}" array exceeds max items of ${rule.maxItems}`);
    }
  }

  return true;
}

module.exports = { validatePayload, schemas };
