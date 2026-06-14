/**
 * @purpose Proporciona definiciones del campo, funciones de recuperación de valor y un componente de renderizado de campo para su uso en el editor de manifestos OMEGA.
 * @lastUpdated 2026-06-14T16:49:48.248Z
 */

export type { FieldDef, FieldType, FieldOption } from './fieldDefs';
export { getFieldValue, buildPatch } from './fieldDefs';
export { FieldRenderer } from './FieldRenderer';
