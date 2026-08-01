import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { IntlProvider } from "react-intl";
import { vi } from "vitest";
import userEvent from "@testing-library/user-event";
import enMessages from "../../locales/en.json";
import { store } from "../../store/store";
import DetailsPage from "../DetailsPage";
import ListPage from "../ListPage";
import { expect } from "chai";
import en from "../../locales/en.json";
import hi from "../../locales/hi.json";
import te from "../../locales/te.json";
import Root from "../Root";

const messages = { en, hi, te };

function renderWithProviders(ui, { route = "/", locale = "en", fallbacks = [] } = {}) {
    return render(
        <Provider store={store}>
            <IntlProvider locale={locale} messages={{ ...en, ...messages[fallbacks[1]], ...messages[fallbacks[0]], ...(messages[locale] || {}) }}>
                <MemoryRouter initialEntries={[route]}>
                    <Routes>
                        <Route path="/" element={<Root />}>
                            <Route path="/" element={<ListPage />} />
                            <Route path="/create" element={<DetailsPage key="create" />} />
                            <Route path="/edit/:id" element={<DetailsPage key="edit" />} />
                            <Route path="/view/:id" element={<DetailsPage key="view" />} />
                        </Route>
                    </Routes>
                </MemoryRouter>
            </IntlProvider>
        </Provider>
    );
}

describe("Internationalization and fallback behavior", () => {
    test("Renders Hindi strings", async () => {
        renderWithProviders(<Root />, { route: "/", locale: "hi" });
        expect(await screen.findByText("समय-सूची")).to.exist;
        expect(await screen.findAllByText(/तन्वी मेहेेत्रे/i)).to.exist;
        expect(await screen.findByText(/परियोजनाऐ/i)).to.exist;
        expect(await screen.findByText(/सदस्य/i)).to.exist;

        const user = userEvent.setup();

        const addIcon = await screen.findByTestId("AddCircleIcon");
        await user.click(addIcon);

        expect(await screen.findAllByText(/अगला दिन/i)).to.exist;
        expect(await screen.findByText(/चेतावनी: यदि आप रातभर काम कर रहे हैं, तो कृपया “अगला दिन” चेकबॉक्स को अवश्य चुनें।/i)).to.exist;
        expect(await screen.findByText(/मानव संसाधन/i)).to.exist;
        expect(await screen.findByText(/परियोजना समय सुची पर जाऐ।/i)).to.exist;

        const time_note = await screen.getByPlaceholderText("समय संबंधी टिप्पणी");
        await user.click(time_note);
        await userEvent.click(document.body);

        expect(await screen.findByText(/समय संबंधी टिप्पणी खाली नहीं होनी चाहिए।/i)).to.exist;

        expect(await screen.queryAllByText(/कुल समय/i)).to.exist;
    });

    test("Renders Telugu strings", async () => {
        renderWithProviders(<Root />, { route: "/", locale: "te" });
        await waitFor(() => expect(screen.findByText("కాలపట్టిక")).to.exist);
        await waitFor(() => expect(screen.findAllByText(/తన్వీ మెహెత్రే/i)).to.exist);
        await waitFor(() => expect(screen.findByText(/తేదీ పరిధి/i)).to.exist);
        await waitFor(() => expect(screen.findAllByText(/మొత్తం సమయం/i)).to.exist);

        const user = userEvent.setup();

        const bookIcons = await screen.findAllByTestId("MenuBookIcon");
        await waitFor(() => expect(bookIcons.length).toBeGreaterThan(0));

        await user.click(bookIcons[0]);
        const editOption = await screen.findByText(/సవరించు/i);
        await user.click(editOption);

        await waitFor(() => expect(screen.findAllByText(/తొలగించు/i)).to.exist);
        await waitFor(() => expect(screen.findByText(/హెచ్చరిక: మీరు రాత్రిపూట పని చేస్తుంటే, దయచేసి “తదుపరి రోజు” చెక్‌బాక్స్‌ని ఎంచుకోండి./i)).to.exist);
        await waitFor(() => expect(screen.findByText(/వీక్షణగా తెరవండి/i)).to.exist);
        await waitFor(() => expect(screen.findByText(/ప్రణాళికా సమయం/i)).to.exist);

        const total_time = await screen.getByPlaceholderText("0:00");
        await user.type(total_time, "09:00");
        await userEvent.click(document.body);

        await waitFor(() => expect(screen.findByText(/మొత్తం సమయం HH:MM ఆకృతిలో ఉండాలి./i)).to.exist);

        await waitFor(() => expect(screen.queryAllByText(/తేదీ/i)).to.exist);
    });

    test("Checks for fallbacks", async () => {
        renderWithProviders(<Root />, { route: "/", locale: "te", fallbacks: ["hi", "en"] });

        const timeSummary = await screen.queryByText("సమయం సారాంశం");
        expect(timeSummary).toBe(null);
        const timeSummaryHindi = await screen.findByText(/समय सारांश/i);
        expect(timeSummaryHindi).toBeInTheDocument();
        expect(await screen.findAllByText(/తన్వీ మెహెత్రే/i)).to.exist;
        expect(await screen.findByText(/తేదీ పరిధి/i)).to.exist;
        expect(await screen.findAllByText(/మొత్తం సమయం/i)).to.exist;

        const user = userEvent.setup();

        const bookIcons = await screen.findAllByTestId("MenuBookIcon");
        expect(bookIcons.length).toBeGreaterThan(0);

        await user.click(bookIcons[0]);
        const editOption = await screen.findByText(/సవరించు/i);
        await user.click(editOption);

        const name = await screen.findAllByText(/తన్వీ మెహెత్రే​/i);
        await user.click(name[0]);
        expect(await screen.findAllByText(/తన్వీ మెహెత్రే​/i)).to.exist;

        const timelog_id = await screen.getByDisplayValue("66");
        expect(timelog_id).toBeInTheDocument();

        const changePassword = await screen.queryByText("రహస్య పదాన్ని మార్చండి");
        expect(changePassword).toBe(null);
        const changePasswordHin = await screen.queryByText("गुप्त शब्द बदलें");
        expect(changePasswordHin).toBe(null);
        const changePasswordEng = await screen.findByText("Change Password");
        expect(changePasswordEng).toBeInTheDocument();

        expect(await screen.findByText(/హెచ్చరిక: మీరు రాత్రిపూట పని చేస్తుంటే, దయచేసి “తదుపరి రోజు” చెక్‌బాక్స్‌ని ఎంచుకోండి./i)).to.exist;
        expect(await screen.findByText(/समय-सूची संख्या/i)).to.exist;
        expect(await screen.findByText(/Settings/i)).to.exist;

        expect(await screen.queryAllByText(/Date/i)).to.exist;
        expect(await screen.findByText("अवकाश")).to.exist;
    });
});
