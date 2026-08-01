import { useState, useCallback } from "react";
import { useDispatch } from "react-redux";

export function useThunk(thunk) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const dispatch = useDispatch();

    const runThunk = useCallback(
        async (arg) => {
            setIsLoading(true);
            setError(null);
            try {
                const result = await dispatch(thunk(arg)).unwrap();
                return result;
            } catch (err) {
                setError(err);
                throw err;
            } finally {
                setIsLoading(false);
            }
        },
        [dispatch, thunk]
    );

    return [runThunk, isLoading, error];
}
