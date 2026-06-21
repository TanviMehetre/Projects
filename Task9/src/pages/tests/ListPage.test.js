import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import { IntlProvider } from "react-intl";
import { test, vi } from "vitest";
import { store } from "../../store/store";
import Root from "../Root";
import ListPage from "../ListPage";
import DetailsPage from "../DetailsPage";
import userEvent from "@testing-library/user-event";
import enMessages from "../../locales/en.json";
import { expect } from "chai";

function renderWithProviders(ui, { route = "/" } = {}) {
    return render(
        <Provider store={store}>
            <IntlProvider locale="en" messages={enMessages}>
                <MemoryRouter initialEntries={[route]}>
                    <Routes>
                        <Route path="/" element={<Root />}>
                            <Route index element={<ListPage />} />
                            <Route path="create" element={<DetailsPage key="create" />} />
                            <Route path="edit/:id" element={<DetailsPage key="edit" />} />
                            <Route path="view/:id" element={<DetailsPage key="view" />} />
                        </Route>
                    </Routes>
                </MemoryRouter>
            </IntlProvider>
        </Provider>
    );
}

describe("ListPage Component", () => {
    test("Get All Timelogs", async () => {
        renderWithProviders(<Root />, { route: "/" });
        const user = userEvent.setup();

        const navbar1 = await screen.findByText(/Clock Time/i);
        const navbar2 = await screen.findByText(/Timelog/i);
        const navbar3 = await screen.findByText(/Settings/i);
        const navbar4 = await screen.findByText(/Human Resources/i);
        const navbar5 = await screen.findByText(/Holiday/i);
        await user.click(navbar4);
        const navbar6 = await screen.findByText(/Employee/i);
        const navbar7 = await screen.findByText(/Review/i);
        const navbar8 = await screen.findByText(/Applicants/i);
        const navbar9 = await screen.findByText(/Time Summary/i);
        const navbar10 = await screen.findByText(/Project Time/i);
        const filter1 = await screen.findByText(/Projects/i);
        const filter2 = await screen.findByText(/Members/i);
        const filter3 = await screen.findByText(/Date Range/i);

        expect(navbar1).toBeInTheDocument();
        expect(navbar2).toBeInTheDocument();
        expect(navbar3).toBeInTheDocument();
        expect(navbar4).toBeInTheDocument();
        expect(navbar5).toBeInTheDocument();
        expect(navbar6).toBeInTheDocument();
        expect(navbar7).toBeInTheDocument();
        expect(navbar8).toBeInTheDocument();
        expect(navbar9).toBeInTheDocument();
        expect(navbar10).toBeInTheDocument();
        expect(filter1).toBeInTheDocument();
        expect(filter2).toBeInTheDocument();
        expect(filter3).toBeInTheDocument();

        const employee1 = await screen.findAllByText(/Ann Smith/i);
        const employee2 = await screen.findAllByText(/John Smith/i);
        const employee3 = screen.queryByText(/John Doe/i);
        const employee4 = await screen.findAllByText(/Tanvi Mehetre/i);
        const employee5 = screen.queryByText(/Peter White/i);

        expect(employee1.length).toBeGreaterThan(1);
        expect(employee2.length).toBeGreaterThan(1);
        expect(employee3).toBe(null);
        expect(employee4.length).toBeGreaterThan(1);
        expect(employee5).toBe(null);
        employee1.forEach((el) => expect(el).toBeVisible());
        employee2.forEach((el) => expect(el).toBeVisible());
        employee4.forEach((el) => expect(el).toBeVisible());
    });

    test("Filtering data on the list page", async () => {
        renderWithProviders(<Root />, { route: "/" });

        const user = userEvent.setup();

        const comboboxes = await screen.findAllByRole("combobox");

        const project = comboboxes[0];
        await user.type(project, "GEM - GoEmed Hosting Support");
        const projectOption = await screen.findAllByText("GEM - GoEmed Hosting Support");
        await user.click(projectOption[0]);
        await user.keyboard("{Enter}");

        const member = comboboxes[1];
        await user.type(member, "Tanvi Mehetre");
        const memberOption = await screen.findAllByText("Tanvi Mehetre");
        await user.click(memberOption[1]);
        await user.keyboard("{Enter}");

        const notSelectedProject = await screen.queryByText(/ACC - RI Digitization/i);
        expect(notSelectedProject).toBe(null);

        await screen.findAllByText(/GEM - GoEmed Hosting Support/i);

        const projectCells = await screen.findAllByText(/GEM - GoEmed Hosting Support/i);
        expect(projectCells).toHaveLength(1);

        const employeeCells = await screen.findAllByText(/Tanvi Mehetre/i);
        expect(employeeCells).toHaveLength(4);

        await waitFor(() => {
            expect(member).toHaveValue("Tanvi Mehetre");
        });
        await waitFor(() => {
            expect(project).toHaveValue("GEM - GoEmed Hosting Support");
        });

        expect(screen.queryByText(/John Smith/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/John Doe/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Ann Smith/i)).not.toBeInTheDocument();

        expect(screen.queryByText(/ACC - RI Digitization/i)).not.toBeInTheDocument();
    });
});
