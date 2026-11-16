/** The Wedy presentation page (prospects) on « / ». Off by default: a company's own instance opens on its sign-in.
 *  Set VITE_SHOW_LANDING=true at build time to show it; it always stays reachable at /presentation. */
export const SHOW_LANDING = import.meta.env.VITE_SHOW_LANDING === 'true';
