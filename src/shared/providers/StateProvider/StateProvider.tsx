import { createContext, useContext } from "react";

import { initialState } from "./constants";
import type { State } from "./types";

const StateContext = createContext<State>(initialState);

export const StateProvider = StateContext.Provider;

export const useStateContext = () => useContext(StateContext);
