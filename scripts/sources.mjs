export function externalSource(id) {
  if (['pdf','docx','pptx','xlsx','frontend-design'].includes(id)) return {repo:'anthropics/skills',paths:[`skills/${id}`],local:`external/${id==='frontend-design'?'frontend':'document'}/${id}`};
  if (['brainstorming','writing-plans'].includes(id)) return {repo:'obra/superpowers',paths:[`skills/${id}`],local:`external/development/${id}`};
  if (['grill-me','grilling'].includes(id)) return {repo:'mattpocock/skills',paths:[`skills/productivity/${id}`],local:`external/development/${id}`};
  if(id.startsWith('ponytail')) return {repo:'DietrichGebert/ponytail',paths:[`skills/${id}`],local:`external/development/${id}`};
  if(id==='taste') return {repo:'Leonxlnx/taste-skill',paths:['skills/taste-skill','skills/design-taste-frontend'],local:'external/frontend/taste'};
  if(id==='humanizer') return {repo:'blader/humanizer',paths:['skills/humanizer',''],rootFiles:['SKILL.md','references/','scripts/','assets/'],local:'external/writing/humanizer'};
  if(id.startsWith('korean-')) return {repo:'DaleSeo/korean-skills',paths:[`skills/${id.slice(7)}`],local:`external/writing/korean-skills/${id.slice(7)}`};
  if(id.startsWith('caveman')) return {repo:'JuliusBrussee/caveman',paths:[`skills/${id}`],local:`external/writing/${id}`};
  return {repo:'alexgreensh/token-optimizer',paths:[`plugins/token-optimizer/skills/${id}`],local:`external/development/${id}`};
}
