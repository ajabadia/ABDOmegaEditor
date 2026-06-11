/**
 * OMEGA Variant Parser (Era 7.2.3)
 * Unified logic to extract size and color information from industrial variant strings.
 */
 
export interface ParsedVariant {
  size: string;
  colorId: string;
}
 
export function parseVariant(variant: string | undefined): ParsedVariant {
  const v = variant || 'B_cyan';
  const parts = v.split('_');
  
  let size = parts[0] || 'B';
  
  // Industrial exceptions for specific millimetric sizes
  if (v.includes('_3mm')) size = 'D';
  if (v.includes('_5mm')) size = 'C';
  
  // Color extraction (filter out size and technical suffixes)
  const colorId = parts.length > 1 
    ? parts.filter(p => p !== size && p !== '3mm' && p !== '5mm').join('_') 
    : 'cyan';
    
  return { size, colorId };
}
