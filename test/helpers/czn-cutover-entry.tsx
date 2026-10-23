import {createRoot} from 'react-dom/client';
import {CznCutoverHarness} from './czn-cutover-browser.tsx';
createRoot(document.getElementById('root')!).render(<CznCutoverHarness store={localStorage}/>);
