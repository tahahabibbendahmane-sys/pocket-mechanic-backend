// List of makes that are primarily or exclusively electric
const EV_MAKES = ['Tesla', 'Rivian', 'Lucid', 'Polestar', 'NIO', 'XPeng', 'BYD', 'Fisker'];

// Keywords in model names that indicate EV
const EV_MODEL_KEYWORDS = ['electric', 'ev', 'e-tron', 'ioniq', 'bolt ev', 'leaf', 'model s', 'model 3', 'model x', 'model y', 'cybertruck', 'lightning', 'lyriq', 'blazer ev'];

export function isElectricVehicle(make: string, model: string): boolean {
  const makeLower = (make ?? '').toLowerCase();
  const modelLower = (model ?? '').toLowerCase();

  if (EV_MAKES.some(m => makeLower === m.toLowerCase())) return true;
  if (EV_MODEL_KEYWORDS.some(k => modelLower.includes(k))) return true;

  return false;
}

export function getEVMaintenanceNote(make: string, model: string): string {
  return `${make} ${model} is an electric vehicle. Oil changes, spark plugs, and serpentine belt services do not apply. Focus on battery health, tire rotation, brake fluid, cabin filter, and software updates.`;
}

