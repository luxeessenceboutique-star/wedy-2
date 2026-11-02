import { createContext } from 'react';

/** True below a <Page>: PageHeader then drops its legacy side padding (the page already pads). */
export const PageContext = createContext(false);
