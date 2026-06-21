import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Provider } from "react-redux";
import { store } from "./store/store";
import { IntlProvider } from "react-intl";
import en from "./locales/en.json";
import hi from "./locales/hi.json";
import te from "./locales/te.json";
import "./index.css";

const messages = { en, hi, te };

const language = navigator.language.split(/[-_]/)[0];
const fallback1 = navigator.languages[1].split(/[-_]/)[0];
const fallback2 = navigator.languages[2].split(/[-_]/)[0];

ReactDOM.createRoot(document.getElementById("root")).render(
    <Provider store={store}>
        <IntlProvider locale={language} messages={{ ...en, ...messages[fallback2], ...messages[fallback1], ...(messages[language] || {}) }}>
            <App />
        </IntlProvider>
    </Provider>
);
