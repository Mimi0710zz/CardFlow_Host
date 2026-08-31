export const DEFAULT_PROGRAM_PRIORITY=0;
export function getProgramPriority(program){
  if(!program)return DEFAULT_PROGRAM_PRIORITY;
  const value=Number(program.priority);
  return Number.isFinite(value)?value:DEFAULT_PROGRAM_PRIORITY;
}
