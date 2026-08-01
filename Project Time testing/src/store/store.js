import { configureStore } from "@reduxjs/toolkit";
import { projectTimeReducer } from "./slices/projectTimeSlice";
import { setupListeners } from "@reduxjs/toolkit/query";

export const store = configureStore({
    reducer: {
        projectTime: projectTimeReducer,
    },
});

setupListeners(store.dispatch);
export * from "./slices/projectTimeSlice";
