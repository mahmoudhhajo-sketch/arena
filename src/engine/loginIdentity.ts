export function loginCandidates<T extends {name?:string;managerName?:string;email?:string}>(accounts:T[], input:string):T[] {
  const key=input.trim().toLocaleLowerCase('sv-SE');
  return accounts.filter(a=>[a.name,a.managerName,a.email].some(value=>value?.trim().toLocaleLowerCase('sv-SE')===key));
}
