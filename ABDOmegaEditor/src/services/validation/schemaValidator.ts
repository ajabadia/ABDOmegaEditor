import AJV from 'ajv';
import type { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import era6Schema from '../../data/omega-schema.json';
import era7Schema from '../../data/omega-schema-v7.json';
import type { ValidationIssue } from '@/types/validation';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';

const ajv = new AJV({ 
  allErrors: true,
  strict: false,
  verbose: true
});

addFormats(ajv);

const validateV6 = ajv.compile(era6Schema);
const validateV7 = ajv.compile(era7Schema);

export class SchemaValidator {
  static validate(manifest: OMEGA_Manifest): ValidationIssue[] {
    const isV7 = manifest.schemaVersion?.startsWith('7') || manifest.schemaVersion === '7.0';
    const validator = isV7 ? validateV7 : validateV6;
    
    validator(manifest);
    
    return (validator.errors || []).map((err: ErrorObject) => {
      let message = err.message || 'Invalid value';
      
      if (err.keyword === 'additionalProperties') {
        const prop = err.params?.additionalProperty;
        message = `Unrecognized property found: '${prop}'. Remove it to satisfy OMEGA compliance.`;
      }
      
      if (err.keyword === 'enum') {
        const allowed = err.params?.allowedValues?.join(', ');
        message = `Invalid choice. Expected one of: [${allowed}]`;
      }

      if (err.keyword === 'type') {
        message = `Data type mismatch. Expected ${err.params?.type} but found something else.`;
      }

      return {
        path: err.instancePath || '',
        message: message,
        keyword: err.keyword || 'schema',
        severity: 'error'
      };
    });
  }
}
