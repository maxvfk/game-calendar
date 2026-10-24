import {test,expect} from 'bun:test';
import {Window} from 'happy-dom';
import {act} from 'react';
import {CznCutoverHarness} from './helpers/czn-cutover-browser.tsx';
test('interactive React DOM harness: CZN chip in the real dailies strip, offline false, reload/update/export, retry and read-only fence',async()=>{
  const win=new Window({url:'http://localhost/'}),keys=['window','document','navigator','HTMLElement','Event','MouseEvent','IS_REACT_ACT_ENVIRONMENT'];
  const saved=new Map(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
  for(const key of keys)Object.defineProperty(globalThis,key,{configurable:true,writable:true,value:key==='IS_REACT_ACT_ENVIRONMENT'?true:(key==='window'?win:(win as any)[key])});
  const {createRoot}=await import('react-dom/client');const host=win.document.createElement('div');win.document.body.append(host);
  const root=createRoot(host as unknown as HTMLElement);
  const button=(text:string)=>Array.from(host.querySelectorAll('button')).find(b=>b.textContent?.includes(text))!;
  const click=async(text:string)=>{await act(async()=>{button(text).click();});};
  const chip=()=>host.querySelector('button[aria-label^="Chaos Zero Nightmare dailies"]') as unknown as HTMLButtonElement;
  const tap=async()=>{await act(async()=>{chip().click();});};
  try{
    await act(async()=>{root.render(<CznCutoverHarness store={win.localStorage}/>);});
    // One strip, CZN beside another game's chore, its own 18:00 UTC clock in the label.
    expect(host.textContent).toContain("Today's dailies · 0/2");
    expect(chip().getAttribute('aria-label')).toContain('resets 18:00 UTC');
    await tap();expect(chip().getAttribute('aria-pressed')).toBe('true');expect(host.textContent).toContain("Today's dailies · 1/2");
    await tap();expect(chip().getAttribute('aria-pressed')).toBe('false');
    await click('Sync synthetic');expect(host.textContent).toContain('pending retained');
    await click('Reload local');expect(host.textContent).toContain('2 new-policy changes pending');
    await click('Export CZN recovery');const exported=JSON.parse(host.querySelector('textarea')!.value);
    expect(JSON.stringify(exported)).toContain('"completed":false');
    await click('Check for app update');expect(host.textContent).toContain('2 new-policy changes pending');
    await click('Network: offline');await click('Sync synthetic');expect(host.textContent).toContain('0 new-policy changes pending');
    await click('Server: enabled');expect(chip().disabled).toBe(true);
    expect(host.textContent).toContain('Other games can sync');
    // A read-only CZN chip is still shown but has no past to fill in; the other game still does.
    await click('Catch up');expect(host.querySelectorAll('button[aria-label$=", done"],button[aria-label$=", not done"]').length).toBeGreaterThan(0);
    expect(host.textContent).not.toContain('Chaos Zero Nightmare');
  }finally{await act(async()=>root.unmount());await win.happyDOM.close();for(const key of keys){const value=saved.get(key);if(value)Object.defineProperty(globalThis,key,value);else Reflect.deleteProperty(globalThis,key);}}
});
