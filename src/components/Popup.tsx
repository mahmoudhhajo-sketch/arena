import {useEffect,useRef,ReactNode} from 'react';
export function Popup({title,children,onClose,wide=false}:{title:string;children:ReactNode;onClose:()=>void;wide?:boolean}){const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{ref.current?.showModal();return ()=>ref.current?.close()},[]);return <dialog ref={ref} className={'retro-popup '+(wide?'wide':'')} onCancel={e=>{e.preventDefault();onClose()}}><header><b>{title}</b><button aria-label="Stäng popup" onClick={onClose}>×</button></header><div className="popup-content">{children}</div></dialog>}

