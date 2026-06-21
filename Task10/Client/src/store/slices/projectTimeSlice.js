import { createAsyncThunk, createSlice, isRejectedWithValue } from "@reduxjs/toolkit";
import axios from "axios";

const BASE_URL = "https://jn7wb5nchl.execute-api.us-east-2.amazonaws.com/prod/timelog";

const getTimelogs = createAsyncThunk("timelogs/get", async (_, { rejectWithValue }) => {
    try {
        const response = await axios.get(`${BASE_URL}`, {
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        });
        return response.data;
    } catch (error) {
        if (error.response && error.response.data) {
            return rejectWithValue(error.response.data);
        }
        return rejectWithValue({
            message: error.message || "Unexpected error occurred.",
            status_code: 500,
        });
    }
});

const getOneTimelog = createAsyncThunk("timelogs/getOne", async (id, { rejectWithValue }) => {
    try {
        const response = await axios.get(`${BASE_URL}/${id}`, {
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        });
        return response.data;
    } catch (error) {
        if (error.response && error.response.data) {
            return rejectWithValue(error.response.data);
        }
        return rejectWithValue({
            message: error.message || "Unexpected error occurred.",
            status_code: 500,
        });
    }
});

const createTimelog = createAsyncThunk("timelogs/create", async (timelog, { rejectWithValue }) => {
    try {
        const response = await axios.post(`${BASE_URL}`, timelog, {
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        });
        return response.data;
    } catch (error) {
        if (error.response && error.response.data) {
            return rejectWithValue(error.response.data);
        }
        return rejectWithValue({
            message: error.message || "Unexpected error occurred.",
            status_code: 500,
        });
    }
});

const filterTimelog = createAsyncThunk("timelogs/filter", async (filterData, { rejectWithValue }) => {
    try {
        const response = await axios.post(`${BASE_URL}/filter`, filterData, {
            // const response = await axios.post(`${BASE_URL}/filter`, filterData, {
                headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        });
        return response.data;
    } catch (error) {
        if (error.response && error.response.data) {
            return rejectWithValue(error.response.data);
        }
        return rejectWithValue({
            message: error.message || "Unexpected error occurred.",
            status_code: 500,
        });
    }
});

const updateTimelog = createAsyncThunk("timelogs/update", async ({ id, updatedData }, { rejectWithValue }) => {
    try {
        const response = await axios.put(`${BASE_URL}/${id}`, updatedData, {
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        });
        return response.data;
    } catch (error) {
        if (error.response && error.response.data) {
            return rejectWithValue(error.response.data);
        }
        return rejectWithValue({
            message: error.message || "Unexpected error occurred.",
            status_code: 500,
        });
    }
});

const deleteTimelog = createAsyncThunk("timelogs/delete", async (id) => {
    const response = await axios.delete(`${BASE_URL}/${id}`, {
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
    });
    return response.data;
});

const fetchDropdowns = createAsyncThunk("timelogs/dropdowns", async () => {
    const response = await axios.get(`${BASE_URL}/dropdowns`, {
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
    });

    return response.data;
});

const projectTimeSlice = createSlice({
    name: "projectTime",
    initialState: {
        data: [],
        dropdowns: [],
        filters: {
            action: "filter",
            project: "",
            member: "",
            date_range: "2024-11-15",
            range2: "2025-11-14",
        },
        isLoading: false,
        error: null,
    },
    reducers: {
        setFilters(state, action) {
            state.filters = action.payload;
        },
        resetFilters(state, action) {
            state.filters = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(getTimelogs.pending, (state) => {
            state.isLoading = true;
        });
        builder.addCase(getTimelogs.fulfilled, (state, action) => {
            state.isLoading = false;
            state.data = action.payload;
        });
        builder.addCase(getTimelogs.rejected, (state, action) => {
            state.isLoading = false;
            state.data = action.payload;
        });

        builder.addCase(getOneTimelog.pending, (state) => {
            state.isLoading = true;
        });
        builder.addCase(getOneTimelog.fulfilled, (state, action) => {
            state.isLoading = false;
            state.data = action.payload;
        });
        builder.addCase(getOneTimelog.rejected, (state, action) => {
            state.isLoading = false;
            state.data = action.payload;
        });

        builder.addCase(createTimelog.pending, (state) => {
            state.isLoading = true;
        });
        builder.addCase(createTimelog.fulfilled, (state, action) => {
            state.isLoading = false;
            state.data = action.payload;
            // state.data = action.payload;
        });
        builder.addCase(createTimelog.rejected, (state, action) => {
            state.isLoading = false;
            state.data = action.payload;
        });

        builder.addCase(filterTimelog.pending, (state) => {
            state.isLoading = true;
        });
        builder.addCase(filterTimelog.fulfilled, (state, action) => {
            state.isLoading = false;
            state.data = action.payload;
        });
        builder.addCase(filterTimelog.rejected, (state, action) => {
            state.isLoading = false;
            state.data = action.payload;
        });

        builder.addCase(updateTimelog.pending, (state) => {
            state.isLoading = true;
        });
        builder.addCase(updateTimelog.fulfilled, (state, action) => {
            state.isLoading = false;
            state.data = action.payload;
        });
        builder.addCase(updateTimelog.rejected, (state, action) => {
            state.isLoading = false;
            state.data = action.payload;
        });

        builder.addCase(deleteTimelog.pending, (state) => {
            state.isLoading = true;
        });
        builder.addCase(deleteTimelog.fulfilled, (state, action) => {
            state.isLoading = false;
            if (Array.isArray(state.data)) {
                state.data = state.data.filter((timelog) => timelog.timelog_id !== action.payload.id);
            } else {
                state.data = [];
            }
        });
        builder.addCase(deleteTimelog.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error;
        });

        builder.addCase(fetchDropdowns.pending, (state) => {
            state.isLoading = true;
        });
        builder.addCase(fetchDropdowns.fulfilled, (state, action) => {
            state.isLoading = false;
            state.dropdowns = action.payload;
        });
        builder.addCase(fetchDropdowns.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error;
        });
    },
});

export const { setFilters, resetFilters } = projectTimeSlice.actions;
export const projectTimeReducer = projectTimeSlice.reducer;
export { getTimelogs, fetchDropdowns, getOneTimelog, createTimelog, updateTimelog, deleteTimelog, filterTimelog };

// export { getPlanners, editPlanner, getPlanner, deletePlanner, createPlanner };
