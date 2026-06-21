import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { IntlProvider } from "react-intl";
import { test, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import enMessages from "../../locales/en.json";
import { store } from "../../store/store";
import DetailsPage from "../DetailsPage";
import ListPage from "../ListPage";
import Root from "../Root";
import { expect } from "chai";
import { server } from "../../mocks/server";
import { http, HttpResponse } from "msw";

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

describe("DetailsPage Component", () => {
    test("Creating a new timelog with the time duration", async () => {
        renderWithProviders(<Root />, { route: "/" });
        const user = userEvent.setup();

        const addIcon = await screen.findByTestId("AddCircleIcon");
        await user.click(addIcon);

        const saveButton = await screen.findByText(/Save/i);
        expect(saveButton).toBeInTheDocument();

        const deleteButton = await screen.queryByText(/Delete/i);
        expect(deleteButton).not.toBeInTheDocument();

        const viewButton = await screen.queryByText(/Switch To View/i);
        expect(viewButton).not.toBeInTheDocument();

        const projectTimeButton = await screen.queryByText(/Go To: Project Time List/i);
        expect(projectTimeButton).toBeInTheDocument();

        const timelog_id = await screen.getByDisplayValue("#");
        expect(timelog_id).toBeInTheDocument();
        const comboboxes = await screen.getAllByRole("combobox");

        const employee = comboboxes[0];
        await user.type(employee, "Tanvi Mehetre");
        const option = await screen.findAllByText("Tanvi Mehetre");
        await user.click(option[1]);

        const project = comboboxes[1];
        await user.type(project, "GEM - GoEmed Hosting Support");
        const option2 = await screen.findByText("GEM - GoEmed Hosting Support");
        await user.click(option2);

        const task = comboboxes[2];
        await user.type(task, "DEV - Development");
        const option3 = await screen.findByText("DEV - Development");
        await user.click(option3);

        const dateInput = await screen.getByTestId("entry-date");
        const input = dateInput.querySelector("input");

        await user.type(input, "10/25/2025");
        await user.tab();

        const time_note = await screen.getByPlaceholderText("Time Note");
        await user.type(time_note, "Project Meeting");
        const time_from = await screen.getByPlaceholderText("Time From");
        await user.type(time_from, "08:00");
        const time_to = await screen.getByPlaceholderText("Time To");
        await user.type(time_to, "10:00");

        expect(employee).toHaveValue("Tanvi Mehetre");
        expect(project).toHaveValue("GEM - GoEmed Hosting Support");
        expect(task).toHaveValue("DEV - Development");
        expect(input).toHaveValue("10/25/2025");
        expect(time_note).toHaveValue("Project Meeting");
        expect(time_from).toHaveValue("08:00");
        expect(time_to).toHaveValue("10:00");

        await user.click(saveButton);
        const deleteButtonAfterNav = await screen.findByText(/Delete/i);
        expect(deleteButtonAfterNav).toBeInTheDocument();
        const message = await screen.findByTestId("message-render");
        expect(message).toHaveTextContent("Project Time recorded successfully.");
    }, 10000);

    test("Editing an existing time log with total time", async () => {
        renderWithProviders(<Root />, { route: "/" });

        const bookIcons = await screen.findAllByTestId("MenuBookIcon");
        expect(bookIcons.length).toBeGreaterThan(0);
        const user = userEvent.setup();

        await user.click(bookIcons[0]);
        const editOption = await screen.findByText(/edit/i);
        await user.click(editOption);

        const deleteButton = await screen.findByText(/Delete/i);
        expect(deleteButton).toBeInTheDocument();

        const saveButton = await screen.getByText(/Save/i);
        expect(saveButton).toBeInTheDocument();

        const textarea = await screen.getByPlaceholderText(/Time Note/i);

        expect(textarea).toHaveValue("Project Meeting");
        const timelog_id = await screen.getByDisplayValue("66");
        expect(timelog_id).toBeInTheDocument();

        const comboboxes = await screen.getAllByRole("combobox");

        await waitFor(() => {
            expect(comboboxes[0]).toHaveValue("Ann Smith");
        });
        await waitFor(() => {
            expect(comboboxes[1]).toHaveValue("ACC - RI Digitization");
        });
        await waitFor(() => {
            expect(comboboxes[2]).toHaveValue("SUPPORT - Support");
        });

        const comboboxesNew = await screen.getAllByRole("combobox");

        const employee = comboboxesNew[0];
        await user.type(employee, "Ann Smith");
        const option = await screen.findAllByText("Ann Smith");
        await user.click(option[1]);

        const project = comboboxesNew[1];
        await user.type(project, "GEM - GoEmed Hosting Support");
        const option2 = await screen.findByText("GEM - GoEmed Hosting Support");
        await user.click(option2);

        const task = comboboxesNew[2];
        await user.type(task, "DEV - Development");
        const option3 = await screen.findByText("DEV - Development");
        await user.click(option3);

        const dateInput = await screen.getByDisplayValue("10/01/2025");
        expect(dateInput).toBeInTheDocument();

        const time_note = await screen.getByDisplayValue("Project Meeting");
        await user.clear(time_note);
        await user.type(time_note, "Review Meeting");
        const timeFrom = await screen.getByDisplayValue("00:00");
        const timeTo = await screen.getByDisplayValue("23:59");
        const totalTime = await screen.getByDisplayValue("06:00");

        expect(time_note).toBeInTheDocument();
        expect(timeFrom).toBeInTheDocument();
        expect(timeTo).toBeInTheDocument();
        expect(totalTime).toBeInTheDocument();

        await user.clear(timeFrom);
        await user.clear(timeTo);
        await user.clear(totalTime);
        await user.type(totalTime, "05:00");

        await user.click(saveButton);
        const message = await screen.findByTestId("message-render");
        expect(message).toHaveTextContent("Project Time edited successfully.");
        expect(timeFrom).toHaveValue("00:00");
        expect(timeTo).toHaveValue("23:59");
        expect(time_note).toHaveValue("Review Meeting");
    }, 10000);

    test("Check for clicking save on not having any time filled.", async () => {
        renderWithProviders(<Root />, { route: "/" });

        const bookIcons = await screen.findAllByTestId("MenuBookIcon");
        expect(bookIcons.length).toBeGreaterThan(0);
        const user = userEvent.setup();

        await user.click(bookIcons[0]);
        const editOption = await screen.findByText(/edit/i);
        await user.click(editOption);

        const deleteButton = await screen.findByText(/Delete/i);
        expect(deleteButton).toBeInTheDocument();

        const saveButton = await screen.getByText(/Save/i);
        expect(saveButton).toBeInTheDocument();

        const textarea = await screen.getByPlaceholderText(/Time Note/i);

        expect(textarea).toHaveValue("Project Meeting");
        const timelog_id = await screen.getByDisplayValue("66");
        expect(timelog_id).toBeInTheDocument();

        const comboboxes = await screen.getAllByRole("combobox");

        await waitFor(() => {
            expect(comboboxes[0]).toHaveValue("Ann Smith");
        });
        await waitFor(() => {
            expect(comboboxes[1]).toHaveValue("ACC - RI Digitization");
        });
        await waitFor(() => {
            expect(comboboxes[2]).toHaveValue("SUPPORT - Support");
        });

        const comboboxesNew = await screen.getAllByRole("combobox");

        const employee = comboboxesNew[0];
        await user.type(employee, "Ann Smith");
        const option = await screen.findAllByText("Ann Smith");
        await user.click(option[1]);

        const project = comboboxesNew[1];
        await user.type(project, "GEM - GoEmed Hosting Support");
        const option2 = await screen.findByText("GEM - GoEmed Hosting Support");
        await user.click(option2);

        const task = comboboxesNew[2];
        await user.type(task, "DEV - Development");
        const option3 = await screen.findByText("DEV - Development");
        await user.click(option3);

        const dateInput = await screen.getByDisplayValue("10/01/2025");
        expect(dateInput).toBeInTheDocument();

        const time_note = await screen.getByDisplayValue("Project Meeting");
        await user.clear(time_note);
        await user.type(time_note, "Review Meeting");
        const timeFrom = await screen.getByDisplayValue("00:00");
        const timeTo = await screen.getByDisplayValue("23:59");
        const totalTime = await screen.getByDisplayValue("06:00");

        expect(time_note).toBeInTheDocument();
        expect(timeFrom).toBeInTheDocument();
        expect(timeTo).toBeInTheDocument();
        expect(totalTime).toBeInTheDocument();

        await user.clear(timeFrom);
        await user.clear(timeTo);
        await user.clear(totalTime);

        await user.click(saveButton);
        const message = await screen.findByTestId("message-render");
        expect(message).toHaveTextContent("Please enter either Total Time or Time Duration.");
    });

    test("Check for clicking save on having time duration and total time filled.", async () => {
        renderWithProviders(<Root />, { route: "/" });

        const bookIcons = await screen.findAllByTestId("MenuBookIcon");
        expect(bookIcons.length).toBeGreaterThan(0);
        const user = userEvent.setup();

        await user.click(bookIcons[0]);
        const editOption = await screen.findByText(/edit/i);
        await user.click(editOption);

        const deleteButton = await screen.findByText(/Delete/i);
        expect(deleteButton).toBeInTheDocument();

        const saveButton = await screen.getByText(/Save/i);
        expect(saveButton).toBeInTheDocument();

        const textarea = await screen.getByPlaceholderText(/Time Note/i);

        expect(textarea).toHaveValue("Project Meeting");
        const timelog_id = await screen.getByDisplayValue("66");
        expect(timelog_id).toBeInTheDocument();

        const comboboxes = await screen.getAllByRole("combobox");

        await waitFor(() => {
            expect(comboboxes[0]).toHaveValue("Ann Smith");
        });
        await waitFor(() => {
            expect(comboboxes[1]).toHaveValue("ACC - RI Digitization");
        });
        await waitFor(() => {
            expect(comboboxes[2]).toHaveValue("SUPPORT - Support");
        });

        const comboboxesNew = await screen.getAllByRole("combobox");

        const employee = comboboxesNew[0];
        await user.type(employee, "Ann Smith");
        const option = await screen.findAllByText("Ann Smith");
        await user.click(option[1]);

        const project = comboboxesNew[1];
        await user.type(project, "GEM - GoEmed Hosting Support");
        const option2 = await screen.findByText("GEM - GoEmed Hosting Support");
        await user.click(option2);

        const task = comboboxesNew[2];
        await user.type(task, "DEV - Development");
        const option3 = await screen.findByText("DEV - Development");
        await user.click(option3);

        const dateInput = await screen.getByDisplayValue("10/01/2025");
        expect(dateInput).toBeInTheDocument();

        const time_note = await screen.getByDisplayValue("Project Meeting");
        await user.clear(time_note);
        await user.type(time_note, "Review Meeting");
        const timeFrom = await screen.getByDisplayValue("00:00");
        const timeTo = await screen.getByDisplayValue("23:59");
        const totalTime = await screen.getByDisplayValue("06:00");

        expect(time_note).toBeInTheDocument();
        expect(timeFrom).toBeInTheDocument();
        expect(timeTo).toBeInTheDocument();
        expect(totalTime).toBeInTheDocument();

        await user.clear(timeFrom);
        await user.type(timeFrom, "05:00");
        await user.clear(timeTo);
        await user.type(timeTo, "07:00");
        await user.clear(totalTime);
        await user.type(totalTime, "03:00");

        await user.click(saveButton);
        const message = await screen.findByTestId("message-render");
        expect(message).toHaveTextContent("Please enter only either Total Time or Time Duration.");
    });

    test("Renders view mode and checks for the displayed values", async () => {
        renderWithProviders(<Root />, { route: "/" });

        const bookIcons = await screen.findAllByTestId("MenuBookIcon");
        expect(bookIcons.length).toBeGreaterThan(0);
        const user = userEvent.setup();

        await user.click(bookIcons[0]);
        const viewOption = await screen.findByText(/view/i);
        await user.click(viewOption);

        const switchButton = await screen.findByText(/Switch to Update/i);
        expect(switchButton).toBeInTheDocument();

        const saveButton = await screen.queryByText(/Save/i);
        expect(saveButton).not.toBeInTheDocument();

        const textarea = await screen.getByPlaceholderText(/Time Note/i);

        expect(textarea).toHaveValue("Project Meeting");
        expect(textarea).toBeDisabled();
        const timelog_id = await screen.getByDisplayValue("66");
        expect(timelog_id).toBeInTheDocument();
        expect(timelog_id).toBeDisabled();

        const comboboxes = await screen.getAllByRole("combobox");

        await waitFor(() => {
            expect(comboboxes[0]).toHaveValue("Ann Smith");
            expect(comboboxes[0]).toBeDisabled();
        });
        await waitFor(() => {
            expect(comboboxes[1]).toHaveValue("ACC - RI Digitization");
            expect(comboboxes[1]).toBeDisabled();
        });
        await waitFor(() => {
            expect(comboboxes[2]).toHaveValue("SUPPORT - Support");
            expect(comboboxes[2]).toBeDisabled();
        });

        const dateInput = await screen.getByDisplayValue("10/01/2025");
        expect(dateInput).toBeInTheDocument();
        expect(dateInput).toBeDisabled();

        const time_note = await screen.getByDisplayValue("Project Meeting");
        const timeFrom = await screen.getByDisplayValue("00:00");
        const timeTo = await screen.getByDisplayValue("23:59");
        const totalTime = await screen.getByDisplayValue("06:00");

        expect(time_note).toBeInTheDocument();
        expect(time_note).toBeDisabled();
        expect(timeFrom).toBeInTheDocument();
        expect(timeFrom).toBeDisabled();
        expect(timeTo).toBeInTheDocument();
        expect(timeTo).toBeDisabled();
        expect(totalTime).toBeInTheDocument();
        expect(totalTime).toBeDisabled();
    });

    test("Creating a new timelog with the time duration and  overnight entry", async () => {
        renderWithProviders(<Root />, { route: "/" });
        const user = userEvent.setup();

        const addIcon = await screen.findByTestId("AddCircleIcon");
        await user.click(addIcon);

        const saveButton = await screen.findByText(/Save/i);
        expect(saveButton).toBeInTheDocument();

        const deleteButton = await screen.queryByText(/Delete/i);
        expect(deleteButton).not.toBeInTheDocument();

        const viewButton = await screen.queryByText(/Switch To View/i);
        expect(viewButton).not.toBeInTheDocument();

        const projectTimeButton = await screen.queryByText(/Go To: Project Time List/i);
        expect(projectTimeButton).toBeInTheDocument();

        const timelog_id = await screen.getByDisplayValue("#");
        expect(timelog_id).toBeInTheDocument();
        const comboboxes = await screen.getAllByRole("combobox");

        const employee = comboboxes[0];
        await user.type(employee, "John Smith");
        const option = await screen.findByText("John Smith");
        await user.click(option);

        const project = comboboxes[1];
        await user.type(project, "ACC - RI Digitization");
        const option2 = await screen.findByText("ACC - RI Digitization");
        await user.click(option2);

        const task = comboboxes[2];
        await user.type(task, "DEV - Development");
        const option3 = await screen.findByText("DEV - Development");
        await user.click(option3);

        const dateInput = await screen.getByTestId("entry-date");
        const input = dateInput.querySelector("input");

        await user.type(input, "10/23/2025");
        await user.tab();

        const time_note = await screen.getByPlaceholderText("Time Note");
        await user.clear(time_note);
        await user.type(time_note, "Project Meeting");
        const time_from = await screen.getByPlaceholderText("Time From");
        await user.clear(time_from);
        await user.type(time_from, "23:00");
        const time_to = await screen.getByPlaceholderText("Time To");
        await user.clear(time_to);
        await user.type(time_to, "01:00");

        expect(employee).toHaveValue("John Smith");
        expect(project).toHaveValue("ACC - RI Digitization");
        expect(task).toHaveValue("DEV - Development");
        expect(input).toHaveValue("10/23/2025");
        expect(time_note).toHaveValue("Project Meeting");
        expect(time_from).toHaveValue("23:00");
        expect(time_to).toHaveValue("01:00");

        const warningBeforeCheck = await screen.findByTestId("warning-render");
        expect(warningBeforeCheck).toHaveTextContent("Warning: Make sure to check the Next Day checkbox if working overnight.");

        const nextDay = await screen.getByRole("checkbox", { name: /Next Day/i });
        await userEvent.click(nextDay);
        const warning = await screen.queryByTestId("warning-render");
        expect(warning).toBe(null);

        await user.click(saveButton);
        const deleteButtonAfterNav = await screen.findByText(/Delete/i);
        expect(deleteButtonAfterNav).toBeInTheDocument();
        const message = await screen.findByTestId("message-render");
        expect(message).toHaveTextContent("Project Time recorded successfully.");
    });

    test("Testing edit on no changes made.", async () => {
        renderWithProviders(<Root />, { route: "/" });

        const bookIcons = await screen.findAllByTestId("MenuBookIcon");
        expect(bookIcons.length).toBeGreaterThan(0);
        const user = userEvent.setup();

        await user.click(bookIcons[0]);
        const editOption = await screen.findByText(/edit/i);
        await user.click(editOption);

        const deleteButton = await screen.findByText(/Delete/i);
        expect(deleteButton).toBeInTheDocument();

        const saveButton = await screen.getByText(/Save/i);
        expect(saveButton).toBeInTheDocument();

        const textarea = await screen.getByPlaceholderText(/Time Note/i);
        expect(textarea).toHaveValue("Project Meeting");
        const timelog_id = await screen.getByDisplayValue("66");
        expect(timelog_id).toBeInTheDocument();

        const comboboxes = await screen.getAllByRole("combobox");

        await waitFor(() => {
            expect(comboboxes[0]).toHaveValue("Ann Smith");
        });
        await waitFor(() => {
            expect(comboboxes[1]).toHaveValue("ACC - RI Digitization");
        });
        await waitFor(() => {
            expect(comboboxes[2]).toHaveValue("SUPPORT - Support");
        });

        const dateInput = await screen.getByDisplayValue("10/01/2025");
        expect(dateInput).toBeInTheDocument();

        const time_note = await screen.getByPlaceholderText(/Time Note/i);
        expect(time_note).toHaveValue("Project Meeting");
        const timeFrom = await screen.getByPlaceholderText(/Time From/i);
        expect(timeFrom).toHaveValue("00:00");
        const timeTo = await screen.getByPlaceholderText(/Time To/i);
        expect(timeTo).toHaveValue("23:59");
        const totalTime = await screen.getByPlaceholderText(/0:00/i);
        expect(totalTime).toHaveValue("06:00");

        expect(time_note).toBeInTheDocument();
        expect(timeFrom).toBeInTheDocument();
        expect(timeTo).toBeInTheDocument();
        expect(totalTime).toBeInTheDocument();

        await user.click(saveButton);
        const message = await screen.findByTestId("message-render");
        expect(message).toHaveTextContent("No changes were made to the the project time entry.");
    });

    test("Editing a timelog with the next day enabled.", async () => {
        renderWithProviders(<Root />, { route: "/" });

        const bookIcons = await screen.findAllByTestId("MenuBookIcon");
        expect(bookIcons.length).toBeGreaterThan(0);
        const user = userEvent.setup();

        await user.click(bookIcons[1]);
        const editOption = await screen.findByText(/edit/i);
        await user.click(editOption);

        const saveButton = await screen.findByText(/Save/i);
        expect(saveButton).toBeInTheDocument();

        const deleteButton = await screen.queryByText(/Delete/i);
        expect(deleteButton).toBeInTheDocument();

        const timelog_id = await screen.getByDisplayValue("86");

        expect(timelog_id).toBeInTheDocument();
        const comboboxes = await screen.getAllByRole("combobox");

        const employee = comboboxes[0];
        await user.type(employee, "John Smith");
        const option = await screen.findByText("John Smith");
        await user.click(option);

        const project = comboboxes[1];
        await user.type(project, "ACC - RI Digitization");
        const option2 = await screen.findByText("ACC - RI Digitization");
        await user.click(option2);

        const task = comboboxes[2];
        await user.type(task, "SUPPORT - Support");
        const option3 = await screen.findByText("SUPPORT - Support");
        await user.click(option3);

        const dateInput = await screen.getByTestId("entry-date");
        const input = dateInput.querySelector("input");

        await user.type(input, "10/15/2025");
        await user.tab();

        const time_note = await screen.getByPlaceholderText("Time Note");
        await user.clear(time_note);
        await user.type(time_note, "Project Meeting");
        const time_from = await screen.getByPlaceholderText("Time From");
        await user.clear(time_from);
        await user.type(time_from, "23:30");
        const time_to = await screen.getByPlaceholderText("Time To");
        await user.clear(time_to);
        await user.type(time_to, "01:30");

        expect(employee).toHaveValue("John Smith");
        expect(project).toHaveValue("ACC - RI Digitization");
        expect(task).toHaveValue("SUPPORT - Support");
        expect(input).toHaveValue("10/15/2025");
        expect(time_note).toHaveValue("Project Meeting");
        expect(time_from).toHaveValue("23:30");
        expect(time_to).toHaveValue("01:30");

        const total_time = await screen.getByPlaceholderText("0:00");
        await user.clear(total_time);

        const nextDay = await screen.getByRole("checkbox", { name: /Next Day/i });
        const warning = await screen.queryByTestId("warning-render");
        expect(warning).toBe(null);

        await user.click(saveButton);
        const deleteButtonAfterNav = await screen.findByText(/Delete/i);
        expect(deleteButtonAfterNav).toBeInTheDocument();
        const message = await screen.findByTestId("message-render");
        expect(message).toHaveTextContent("Project Time edited successfully.");
    }, 10000);

    test("Editing an existing time log with total time exceeding 16 hours for one day", async () => {
        renderWithProviders(<Root />, { route: "/" });

        const bookIcons = await screen.findAllByTestId("MenuBookIcon");
        expect(bookIcons.length).toBeGreaterThan(0);
        const user = userEvent.setup();

        await user.click(bookIcons[0]);
        const editOption = await screen.findByText(/edit/i);
        await user.click(editOption);

        const deleteButton = await screen.findByText(/Delete/i);
        expect(deleteButton).toBeInTheDocument();

        const saveButton = await screen.getByText(/Save/i);
        expect(saveButton).toBeInTheDocument();

        const textarea = await screen.getByPlaceholderText(/Time Note/i);

        expect(textarea).toHaveValue("Project Meeting");
        const timelog_id = await screen.getByDisplayValue("66");
        expect(timelog_id).toBeInTheDocument();

        const comboboxes = await screen.getAllByRole("combobox");

        await waitFor(() => {
            expect(comboboxes[0]).toHaveValue("Ann Smith");
        });
        await waitFor(() => {
            expect(comboboxes[1]).toHaveValue("ACC - RI Digitization");
        });
        await waitFor(() => {
            expect(comboboxes[2]).toHaveValue("SUPPORT - Support");
        });

        const comboboxesNew = await screen.getAllByRole("combobox");

        const employee = comboboxesNew[0];
        await user.type(employee, "Ann Smith");
        const option = await screen.findAllByText("Ann Smith");
        await user.click(option[1]);

        const project = comboboxesNew[1];
        await user.type(project, "GEM - GoEmed Hosting Support");
        const option2 = await screen.findByText("GEM - GoEmed Hosting Support");
        await user.click(option2);

        const task = comboboxesNew[2];
        await user.type(task, "DEV - Development");
        const option3 = await screen.findByText("DEV - Development");
        await user.click(option3);

        const dateInput = await screen.getByDisplayValue("10/01/2025");
        expect(dateInput).toBeInTheDocument();

        const time_note = await screen.getByDisplayValue("Project Meeting");
        await user.clear(time_note);
        await user.type(time_note, "Review Meeting");
        const timeFrom = await screen.getByDisplayValue("00:00");
        const timeTo = await screen.getByDisplayValue("23:59");
        const totalTime = await screen.getByDisplayValue("06:00");

        expect(time_note).toBeInTheDocument();
        expect(timeFrom).toBeInTheDocument();
        expect(timeTo).toBeInTheDocument();
        expect(totalTime).toBeInTheDocument();

        await user.clear(timeFrom);
        await user.clear(timeTo);
        await user.clear(totalTime);
        await user.type(totalTime, "18:00");

        await user.click(saveButton);
        const message = await screen.findByTestId("message-render");
        expect(message).toHaveTextContent("Total time exceeds 16 hours for this date.");
        expect(timeFrom).toHaveValue("00:00");
        expect(timeTo).toHaveValue("23:59");
    });

    test("Checking formik and yup validations", async () => {
        renderWithProviders(<Root />, { route: "/" });
        const user = userEvent.setup();

        const addIcon = await screen.findByTestId("AddCircleIcon");
        await user.click(addIcon);

        const saveButton = await screen.findByText(/Save/i);
        expect(saveButton).toBeInTheDocument();

        const deleteButton = await screen.queryByText(/Delete/i);
        expect(deleteButton).not.toBeInTheDocument();

        const viewButton = await screen.queryByText(/Switch To View/i);
        expect(viewButton).not.toBeInTheDocument();

        const projectTimeButton = await screen.queryByText(/Go To: Project Time List/i);
        expect(projectTimeButton).toBeInTheDocument();

        const timelog_id = await screen.getByDisplayValue("#");
        expect(timelog_id).toBeInTheDocument();

        await user.click(saveButton);

        const validationEmployee = await screen.getByText("Employee name should not be empty.");
        const validationProject = await screen.getByText("Project name should not be empty.");
        const validationTask = await screen.getByText("Task name should not be empty.");
        const validationDate = await screen.getByText("Date should not be empty.");
        const validationTimeNote = await screen.getByText("Time Note should not be empty.");

        expect(validationEmployee).toBeInTheDocument();
        expect(validationProject).toBeInTheDocument();
        expect(validationTask).toBeInTheDocument();
        expect(validationDate).toBeInTheDocument();
        expect(validationTimeNote).toBeInTheDocument();

        const time_from = await screen.getByPlaceholderText("Time From");
        await user.clear(time_from);
        await user.type(time_from, "25:30");
        const time_to = await screen.getByPlaceholderText("Time To");
        await user.clear(time_to);
        await user.type(time_to, "01:300");
        const total_time = await screen.getByPlaceholderText("0:00");
        await user.clear(total_time);
        await user.type(total_time, "27:300");

        const validationTimeFrom = await screen.getByText("Time From must be in HH:MM format");
        const validationTimeTo = await screen.getByText("Time To must be in HH:MM format");
        const validationTotalTime = await screen.getByText("Total Time must be in HH:MM format");

        expect(validationTimeFrom).toBeInTheDocument();
        expect(validationTimeTo).toBeInTheDocument();
        expect(validationTotalTime).toBeInTheDocument();
    });

    test("Deleting an entry", async () => {
        renderWithProviders(<Root />, { route: "/" });

        const bookIcons = await screen.findAllByTestId("MenuBookIcon");
        expect(bookIcons.length).toBeGreaterThan(0);
        const user = userEvent.setup();

        await user.click(bookIcons[2]);
        const editOption = await screen.findByText(/edit/i);
        await user.click(editOption);

        const deleteButton = await screen.findByText(/Delete/i);
        expect(deleteButton).toBeInTheDocument();

        const saveButton = await screen.getByText(/Save/i);
        expect(saveButton).toBeInTheDocument();

        await user.click(deleteButton);

        const deleteTitle = await screen.findByText("Confirm Delete");
        const deleteText = await screen.findByText("Are you sure you want to delete this timelog?");
        const deleteConfirm = await screen.getByRole("button", { name: "Delete" });
        const deleteCancel = await screen.getByRole("button", { name: "Cancel" });

        expect(deleteTitle).toBeInTheDocument();
        expect(deleteText).toBeInTheDocument();
        expect(deleteConfirm).toBeInTheDocument();
        expect(deleteCancel).toBeInTheDocument();

        await user.click(deleteCancel);

        const timelog_id = await screen.getByDisplayValue("62");
        expect(timelog_id).toBeInTheDocument();

        const deleteCheck = await screen.findByText(/Delete/i);
        await user.click(deleteCheck);

        const deleteTitle2 = await screen.findByText("Confirm Delete");
        const deleteText2 = await screen.findByText("Are you sure you want to delete this timelog?");
        const deleteConfirm2 = await screen.getByRole("button", { name: "Delete" });
        const deleteCancel2 = await screen.getByRole("button", { name: "Cancel" });

        expect(deleteTitle2).toBeInTheDocument();
        expect(deleteText2).toBeInTheDocument();
        expect(deleteConfirm2).toBeInTheDocument();
        expect(deleteCancel2).toBeInTheDocument();

        await user.click(deleteConfirm2);

        const deleteMesssage = await screen.findByText("Project Time entry deleted successfully");
        expect(deleteMesssage).toBeInTheDocument();

        const listPageCheck = await screen.findByText("Ann Smith");
        expect(listPageCheck).toBeInTheDocument();
    });

    test("Database disconnection", async () => {
        server.use(
            http.post("http://127.0.0.1:8000/timelog/filter", async ({ request }) =>
                HttpResponse.json({
                    error: "Database disconnected.",
                    status_code: 500,
                })
            )
        );

        renderWithProviders(<Root />, { route: "/" });
        const user = userEvent.setup();

        const disconnectMesssage = await screen.findByText("Database disconnected.");
        expect(disconnectMesssage).toBeInTheDocument();

        const navbarCheck = await screen.findByText(/Settings/i);
        await user.click(navbarCheck);
        const navbarCheck2 = await screen.findByText(/Pay Periods/i);
        const navbarCheck3 = await screen.findByText(/Users/i);

        const filterCheck = await screen.findByText(/Members/i);

        const employee1 = await screen.queryByText(/Ann Smith/i);
        const employee2 = await screen.queryByText(/John Smith/i);
        const employee3 = await screen.queryByText(/John Doe/i);
        const employee4 = await screen.findByText(/Tanvi Mehetre/i);
        const employee5 = await screen.queryByText(/Peter White/i);

        expect(navbarCheck).toBeInTheDocument();
        expect(navbarCheck2).toBeInTheDocument();
        expect(navbarCheck3).toBeInTheDocument();
        expect(filterCheck).toBeInTheDocument();
        expect(employee1).toBe(null);
        expect(employee2).toBe(null);
        expect(employee3).toBe(null);
        expect(employee4).toBeInTheDocument();
        expect(employee5).toBe(null);
    });

    test("Database disconnection on edit page", async () => {
        server.use(
            http.put("http://127.0.0.1:8000/timelog/:id", async ({ params, request }) =>
                HttpResponse.json({
                    error: "Database disconnected.",
                    status_code: 500,
                })
            )
        );

        renderWithProviders(<Root />, { route: "/" });
        const bookIcons = await screen.findAllByTestId("MenuBookIcon");
        expect(bookIcons.length).toBeGreaterThan(0);
        const user = userEvent.setup();

        await user.click(bookIcons[0]);
        const editOption = await screen.findByText(/edit/i);
        await user.click(editOption);

        const comboboxesBefore = await screen.getAllByRole("combobox");

        await waitFor(() => {
            expect(comboboxesBefore[0]).toHaveValue("Ann Smith");
        });
        await waitFor(() => {
            expect(comboboxesBefore[1]).toHaveValue("ACC - RI Digitization");
        });
        await waitFor(() => {
            expect(comboboxesBefore[2]).toHaveValue("SUPPORT - Support");
        });

        const saveButton = await screen.getByRole("button", { name: "Save" });
        user.click(saveButton);

        const networkMesssage = await screen.findAllByText("Database disconnected.");
        expect(networkMesssage).not.toBe(null);

        const comboboxes = await screen.getAllByRole("combobox");

        await waitFor(() => {
            expect(comboboxes[0]).toHaveValue("Ann Smith");
        });
        await waitFor(() => {
            expect(comboboxes[1]).toHaveValue("ACC - RI Digitization");
        });
        await waitFor(() => {
            expect(comboboxes[2]).toHaveValue("SUPPORT - Support");
        });

        const dateInput = await screen.getByDisplayValue("10/01/2025");
        expect(dateInput).toBeInTheDocument();

        const time_note = await screen.getByDisplayValue("Project Meeting");
        const timeFrom = await screen.getByDisplayValue("00:00");
        const timeTo = await screen.getByDisplayValue("23:59");
        const totalTime = await screen.getByDisplayValue("06:00");

        expect(time_note).toBeInTheDocument();
        expect(timeFrom).toBeInTheDocument();
        expect(timeTo).toBeInTheDocument();
        expect(totalTime).toBeInTheDocument();
    });

    test("Network Error", async () => {
        server.use(
            http.post("http://127.0.0.1:8000/timelog/filter", async ({ request }) =>
                HttpResponse.json({
                    error: "Network Error.",
                    status_code: 500,
                })
            )
        );

        renderWithProviders(<Root />, { route: "/" });
        const user = userEvent.setup();

        const disconnectMesssage = await screen.findByText("Network Error.");
        expect(disconnectMesssage).toBeInTheDocument();

        const navbarCheck = await screen.findByText(/Settings/i);
        await user.click(navbarCheck);
        const navbarCheck2 = await screen.findByText(/Pay Periods/i);
        const navbarCheck3 = await screen.findByText(/Users/i);

        const filterCheck = await screen.findByText(/Members/i);

        const employee1 = await screen.queryByText(/Ann Smith/i);
        const employee2 = await screen.queryByText(/John Smith/i);
        const employee3 = await screen.queryByText(/John Doe/i);
        const employee4 = await screen.findByText(/Tanvi Mehetre/i);
        const employee5 = await screen.queryByText(/Peter White/i);

        expect(navbarCheck).toBeInTheDocument();
        expect(navbarCheck2).toBeInTheDocument();
        expect(navbarCheck3).toBeInTheDocument();
        expect(filterCheck).toBeInTheDocument();
        expect(employee1).toBe(null);
        expect(employee2).toBe(null);
        expect(employee3).toBe(null);
        expect(employee4).toBeInTheDocument();
        expect(employee5).toBe(null);
    });

    test("Network error on edit page", async () => {
        server.use(
            http.put("http://127.0.0.1:8000/timelog/:id", async ({ params, request }) =>
                HttpResponse.json({
                    error: "Network Error.",
                    status_code: 500,
                })
            )
        );

        renderWithProviders(<Root />, { route: "/" });
        const bookIcons = await screen.findAllByTestId("MenuBookIcon");
        expect(bookIcons.length).toBeGreaterThan(0);
        const user = userEvent.setup();

        await user.click(bookIcons[0]);
        const editOption = await screen.findByText(/edit/i);
        await user.click(editOption);

        const comboboxesBefore = await screen.getAllByRole("combobox");

        await waitFor(() => {
            expect(comboboxesBefore[0]).toHaveValue("Ann Smith");
        });
        await waitFor(() => {
            expect(comboboxesBefore[1]).toHaveValue("ACC - RI Digitization");
        });
        await waitFor(() => {
            expect(comboboxesBefore[2]).toHaveValue("SUPPORT - Support");
        });

        const saveButton = await screen.getByRole("button", { name: "Save" });
        user.click(saveButton);

        const networkMesssage = await screen.findAllByText("Network Error.");
        expect(networkMesssage).not.toBe(null);

        const comboboxes = await screen.getAllByRole("combobox");

        await waitFor(() => {
            expect(comboboxes[0]).toHaveValue("Ann Smith");
        });
        await waitFor(() => {
            expect(comboboxes[1]).toHaveValue("ACC - RI Digitization");
        });
        await waitFor(() => {
            expect(comboboxes[2]).toHaveValue("SUPPORT - Support");
        });

        const dateInput = await screen.getByDisplayValue("10/01/2025");
        expect(dateInput).toBeInTheDocument();

        const time_note = await screen.getByDisplayValue("Project Meeting");
        const timeFrom = await screen.getByDisplayValue("00:00");
        const timeTo = await screen.getByDisplayValue("23:59");
        const totalTime = await screen.getByDisplayValue("06:00");

        expect(time_note).toBeInTheDocument();
        expect(timeFrom).toBeInTheDocument();
        expect(timeTo).toBeInTheDocument();
        expect(totalTime).toBeInTheDocument();
    });
});
