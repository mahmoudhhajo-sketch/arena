import {EditableText} from './PageTextEditor';
import {DIVISION_NAMES,childDivisions,parentDivision} from '../constants/leagues';

export function DivisionTree({current,onSelect}:{current:string;onSelect:(name:string)=>void}){
 const path=new Set<string>();let ancestor:string|null=current;while(ancestor){path.add(ancestor);ancestor=parentDivision(ancestor);}
 const node=(name:string)=><button className={'tree-node '+(name===current?'selected':path.has(name)?'ancestor':'')} aria-current={name===current?'page':undefined} onClick={()=>onSelect(name)}>{name}{name===current&&<small>Vald serie</small>}</button>;
 return <section><h3><EditableText id="copy-ea3ed57df0df48c4"/></h3><p><EditableText id="copy-c78c3656466ea6aa"/></p><p className="compact"><EditableText id="copy-3d1a15339f6c25ad"/></p><div className="division-tree"><div className="tree-root">{node(DIVISION_NAMES[0])}</div>{childDivisions(DIVISION_NAMES[0]).map(first=><div className="tree-branch" key={first}><div className="tree-parent">{node(first)}</div><div className="tree-children">{childDivisions(first).map(second=><div className="tree-column" key={second}>{node(second)}<div className="tree-leaves">{childDivisions(second).map(third=><div key={third}>{node(third)}</div>)}</div></div>)}</div></div>)}</div></section>;
}
