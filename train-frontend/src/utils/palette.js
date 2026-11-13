export const LEG_COLORS = [
  '#1a56db', 
  '#0d9488', 
  '#7c3aed', 
  '#ea580c', 
  '#0284c7', 
  '#db2777', 
];

export function legColor(index) {
  return LEG_COLORS[Math.abs(index) % LEG_COLORS.length];
}
