import { createContext } from "react";

// On the lab's index the demos play with no one there. Skeletons load on their
// own anyway; hold buttons, told this, hold themselves
export const AutoplayContext = createContext(false);
