import { createContext, useContext } from 'react';

// go('#write') | go('') moves between screens inside the app. It updates the address when the
// browser allows it, and always updates the screen itself, so it also works in sandboxed viewers.
export const NavContext = createContext({ go: () => {} });
export const useNav = () => useContext(NavContext);
