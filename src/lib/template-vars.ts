export interface TemplateVars {
  name?:string|null;login?:string;email?:string|null;
  company?:string|null;location?:string|null;bio?:string|null;
  htmlUrl?:string|null;sender?:string;companyName?:string;
}
export function substituteTemplate(template:string,vars:TemplateVars):string{
  return template
    .replace(/\{\{name\}\}/g,vars.name??vars.login??"")
    .replace(/\{\{login\}\}/g,vars.login??"")
    .replace(/\{\{email\}\}/g,vars.email??"")
    .replace(/\{\{company\}\}/g,vars.company??vars.companyName??"")
    .replace(/\{\{location\}\}/g,vars.location??"")
    .replace(/\{\{bio\}\}/g,vars.bio??"")
    .replace(/\{\{profileUrl\}\}/g,vars.htmlUrl??"")
    .replace(/\{\{sender\}\}/g,vars.sender??"")
    .replace(/\{\{date\}\}/g,new Date().toLocaleDateString())
    .replace(/\{\{year\}\}/g,new Date().getFullYear().toString());
}